import { FastifyInstance } from 'fastify';
import { randomBytes, randomUUID } from 'crypto';
import { db, groups, members, activityLog } from '../db/index.js';
import { eq, desc, and, isNull, count } from 'drizzle-orm';
import {
  requireSession,
  requireGroupMember,
  requireOwner,
  hashToken,
  SESSION_COOKIE,
} from '../plugins/session.js';
import { groupExpiresAt } from '../lib/time.js';

function generateInviteCode(): string {
  return randomBytes(6).toString('base64url');
}

export async function groupRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/api/v1/groups',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 100 },
            displayName: { type: 'string', minLength: 1, maxLength: 50 },
          },
        },
        tags: ['groups'],
        summary: 'Create a new group',
      },
    },
    async (request, reply) => {
      const { name, displayName } = request.body as { name: string; displayName?: string };

      const inviteCode = generateInviteCode();
      const groupId = randomUUID();

      if (request.user) {
        // Authenticated path
        const memberName = displayName ?? request.user.name;
        const [groupRows, memberRows] = await db.batch([
          db.insert(groups).values({ id: groupId, name, inviteCode, expiresAt: groupExpiresAt() }).returning(),
          db.insert(members).values({ groupId, userId: request.user.id, displayName: memberName, role: 'owner' }).returning(),
        ]);
        return reply.status(201).send({ group: groupRows[0]!, member: memberRows[0]! });
      }

      // Guest path
      if (!displayName?.trim()) {
        return reply.status(400).send({ error: 'Display name is required' });
      }

      const sessionToken = randomBytes(32).toString('base64url');
      const tokenHash = hashToken(sessionToken);

      const [groupRows, memberRows] = await db.batch([
        db.insert(groups).values({ id: groupId, name, inviteCode, expiresAt: groupExpiresAt() }).returning(),
        db.insert(members).values({ groupId, displayName: displayName.trim(), sessionToken: tokenHash, role: 'owner' }).returning(),
      ]);

      reply.setCookie(SESSION_COOKIE, sessionToken, {
        httpOnly: true,
        path: '/',
        sameSite: process.env['NODE_ENV'] === 'prod' ? 'none' : 'lax',
        secure: process.env['NODE_ENV'] === 'prod',
        maxAge: 60 * 60 * 24 * 30,
      });

      return reply.status(201).send({ group: groupRows[0]!, member: memberRows[0]! });
    },
  );

  // Public: fetch group metadata by invite code (used by join page)
  fastify.get(
    '/api/v1/groups/invite/:inviteCode',
    {
      schema: {
        params: {
          type: 'object',
          required: ['inviteCode'],
          properties: { inviteCode: { type: 'string' } },
        },
        tags: ['groups'],
        summary: 'Get group by invite code',
      },
    },
    async (request, reply) => {
      const { inviteCode } = request.params as { inviteCode: string };

      const [group] = await db
        .select({
          id: groups.id,
          name: groups.name,
          inviteCode: groups.inviteCode,
          createdAt: groups.createdAt,
          expiresAt: groups.expiresAt,
        })
        .from(groups)
        .where(eq(groups.inviteCode, inviteCode));

      if (!group) return reply.status(404).send({ error: 'Group not found' });

      const [countRow] = await db
        .select({ memberCount: count() })
        .from(members)
        .where(and(eq(members.groupId, group.id), isNull(members.leftAt)));

      return reply.send({ ...group, memberCount: Number(countRow?.memberCount ?? 0) });
    },
  );

  // Authenticated: fetch group name + inviteCode by stable ID (used by settings page)
  fastify.get(
    '/api/v1/groups/:id',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        tags: ['groups'],
        summary: 'Get group by ID',
      },
      preHandler: [requireSession, requireGroupMember],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const [group] = await db
        .select({
          id: groups.id,
          name: groups.name,
          inviteCode: groups.inviteCode,
          createdAt: groups.createdAt,
          expiresAt: groups.expiresAt,
        })
        .from(groups)
        .where(eq(groups.id, id));

      if (!group) return reply.status(404).send({ error: 'Group not found' });

      return reply.send(group);
    },
  );

  fastify.patch(
    '/api/v1/groups/:id/settings',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 100 },
            regenerateInviteCode: { type: 'boolean' },
          },
        },
        tags: ['groups'],
        summary: 'Update group settings (owner only)',
      },
      preHandler: [requireSession, requireGroupMember, requireOwner],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const body = request.body as { name?: string; regenerateInviteCode?: boolean };
      const data: { name?: string; inviteCode?: string } = {};
      if (body.name) data.name = body.name;
      if (body.regenerateInviteCode) data.inviteCode = generateInviteCode();

      if (Object.keys(data).length === 0) {
        return reply.status(400).send({ error: 'No changes provided' });
      }

      const [group] = await db.update(groups).set(data).where(eq(groups.id, id)).returning();

      return reply.send(group);
    },
  );

  fastify.get(
    '/api/v1/groups/:id/activity',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        tags: ['groups'],
        summary: 'Get group activity log',
      },
      preHandler: [requireSession, requireGroupMember],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const logs = await db
        .select()
        .from(activityLog)
        .where(eq(activityLog.groupId, id))
        .orderBy(desc(activityLog.createdAt))
        .limit(50);

      return reply.send(logs);
    },
  );
}
