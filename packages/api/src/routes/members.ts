import { FastifyInstance } from 'fastify';
import { randomBytes } from 'crypto';
import { db, groups, members, activityLog } from '../db/index.js';
import { eq, isNull, and, asc, count } from 'drizzle-orm';
import {
  requireSession,
  requireGroupMember,
  requireOwner,
  hashToken,
  SESSION_COOKIE,
} from '../plugins/session.js';

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
          properties: {
            displayName: { type: 'string', minLength: 1, maxLength: 50 },
          },
        },
        tags: ['members'],
        summary: 'Join a group by invite code (authenticated or guest)',
      },
      // No requireSession — guests can join without logging in
    },
    async (request, reply) => {
      const { inviteCode } = request.params as { inviteCode: string };
      const { displayName } = request.body as { displayName?: string };

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

      if (request.user) {
        // Authenticated path — tie member to user account
        const [existing] = await db
          .select()
          .from(members)
          .where(and(eq(members.userId, request.user.id), eq(members.groupId, group.id), isNull(members.leftAt)));

        if (existing) {
          return reply.status(200).send({ group, member: existing });
        }

        const [member] = await db
          .insert(members)
          .values({
            groupId: group.id,
            userId: request.user.id,
            displayName: displayName ?? request.user.name,
            role: 'member',
          })
          .returning();

        return reply.status(201).send({ group, member });
      } else {
        // Guest path — create anonymous member with session token
        if (!displayName?.trim()) {
          return reply.status(400).send({ error: 'Display name is required for guest join' });
        }

        const sessionToken = randomBytes(32).toString('base64url');
        const tokenHash = hashToken(sessionToken);

        const [member] = await db
          .insert(members)
          .values({
            groupId: group.id,
            displayName: displayName.trim(),
            sessionToken: tokenHash,
            role: 'member',
          })
          .returning();

        reply.setCookie(SESSION_COOKIE, sessionToken, {
          httpOnly: true,
          path: '/',
          sameSite: 'lax',
          secure: process.env['NODE_ENV'] === 'prod',
          maxAge: 60 * 60 * 24 * 30, // 30 days
        });

        return reply.status(201).send({ group, member });
      }
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
          userId: members.userId,
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

  // Get the current authenticated user's member record for this group
  fastify.get(
    '/api/v1/groups/:id/me',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        tags: ['members'],
        summary: 'Get current member in group',
      },
      preHandler: [requireSession, requireGroupMember],
    },
    async (request, reply) => {
      if (!request.member) {
        return reply.status(401).send({ error: 'Not a member of this group' });
      }
      return reply.send({
        id: request.member.id,
        groupId: request.member.groupId,
        userId: request.member.userId,
        displayName: request.member.displayName,
        role: request.member.role,
        joinedAt: request.member.joinedAt,
        leftAt: request.member.leftAt,
      });
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
      preHandler: [requireSession, requireGroupMember, requireOwner],
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
