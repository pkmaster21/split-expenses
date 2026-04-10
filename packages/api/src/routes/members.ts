import { FastifyInstance } from 'fastify';
import { randomBytes } from 'crypto';
import { db, groups, members, activityLog } from '../db/index.js';
import { eq, isNull, and, asc, count } from 'drizzle-orm';
import {
  SESSION_COOKIE,
  hashToken,
  requireSession,
  requireGroupMember,
  requireAdmin,
} from '../plugins/session.js';
function generateSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export async function memberRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/api/v1/groups/invite/:inviteCode/join',
    {
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
      schema: {
        params: {
          type: 'object',
          required: ['inviteCode'],
          properties: { inviteCode: { type: 'string' } },
        },
        body: {
          type: 'object',
          required: ['displayName'],
          properties: {
            displayName: { type: 'string', minLength: 1, maxLength: 50 },
          },
        },
        tags: ['members'],
        summary: 'Join a group by invite code',
      },
    },
    async (request, reply) => {
      const { inviteCode } = request.params as { inviteCode: string };
      const { displayName } = request.body as { displayName: string };

      const [group] = await db
        .select()
        .from(groups)
        .where(eq(groups.inviteCode, inviteCode));

      if (!group) return reply.status(404).send({ error: 'Group not found' });

      if (group.expiresAt < new Date()) {
        return reply.status(410).send({ error: 'Group has expired' });
      }

      const [countRow] = await db
        .select({ memberCount: count() })
        .from(members)
        .where(and(eq(members.groupId, group.id), isNull(members.leftAt)));
      const memberCount = Number(countRow?.memberCount ?? 0);

      if (memberCount >= 50) {
        return reply.status(409).send({ error: 'Group is full (max 50 members)' });
      }

      const sessionToken = generateSessionToken();
      const hashedToken = hashToken(sessionToken);

      const [member] = await db
        .insert(members)
        .values({
          groupId: group.id,
          displayName,
          role: 'member',
          sessionToken: hashedToken,
        })
        .returning();

      reply.setCookie(SESSION_COOKIE, sessionToken, {
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
        secure: process.env['NODE_ENV'] === 'prod',
        maxAge: 60 * 60 * 24 * 365,
      });

      return reply.status(201).send({ group, member });
    },
  );

  fastify.get(
    '/api/v1/groups/:id/members',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        tags: ['members'],
        summary: 'List active members',
      },
      preHandler: [requireSession, requireGroupMember],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const result = await db
        .select({
          id: members.id,
          groupId: members.groupId,
          displayName: members.displayName,
          role: members.role,
          joinedAt: members.joinedAt,
          leftAt: members.leftAt,
        })
        .from(members)
        .where(and(eq(members.groupId, id), isNull(members.leftAt)))
        .orderBy(asc(members.joinedAt));

      return reply.send(result);
    },
  );

  fastify.delete(
    '/api/v1/groups/:id/members/:memberId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id', 'memberId'],
          properties: {
            id: { type: 'string' },
            memberId: { type: 'string' },
          },
        },
        tags: ['members'],
        summary: 'Remove a member (admin+ only)',
      },
      preHandler: [requireSession, requireGroupMember, requireAdmin],
    },
    async (request, reply) => {
      const { id, memberId } = request.params as { id: string; memberId: string };

      const [target] = await db
        .select()
        .from(members)
        .where(and(eq(members.id, memberId), eq(members.groupId, id)));

      if (!target) return reply.status(404).send({ error: 'Member not found' });
      if (target.role === 'owner') {
        return reply.status(403).send({ error: 'Cannot remove the group owner' });
      }

      await db.update(members).set({ leftAt: new Date() }).where(eq(members.id, memberId));

      await db.insert(activityLog).values({
        groupId: id,
        message: `${target.displayName} was removed from the group`,
      });

      return reply.status(204).send();
    },
  );
}
