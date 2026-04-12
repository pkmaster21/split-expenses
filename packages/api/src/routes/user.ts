import { FastifyInstance } from 'fastify';
import { db, groups, members } from '../db/index.js';
import { eq, isNull, and, count, desc, sql } from 'drizzle-orm';
import { requireSession } from '../plugins/session.js';

export async function userRoutes(fastify: FastifyInstance) {
  // Get all groups the authenticated user belongs to
  fastify.get(
    '/api/v1/me/groups',
    {
      schema: {
        tags: ['user'],
        summary: 'List groups for the current user',
      },
      preHandler: [requireSession],
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({ error: 'Authentication required' });
      }

      // Find all active memberships for this user
      const userMembers = await db
        .select({
          memberId: members.id,
          groupId: members.groupId,
          role: members.role,
          displayName: members.displayName,
        })
        .from(members)
        .where(and(eq(members.userId, request.user.id), isNull(members.leftAt)));

      if (userMembers.length === 0) {
        return reply.send([]);
      }

      // For each group, fetch details and member count
      const result = await Promise.all(
        userMembers.map(async (m) => {
          const [group] = await db
            .select({
              id: groups.id,
              name: groups.name,
              inviteCode: groups.inviteCode,
              createdAt: groups.createdAt,
              expiresAt: groups.expiresAt,
            })
            .from(groups)
            .where(eq(groups.id, m.groupId));

          const [countRow] = await db
            .select({ memberCount: count() })
            .from(members)
            .where(and(eq(members.groupId, m.groupId), isNull(members.leftAt)));

          return {
            group: group!,
            memberCount: Number(countRow?.memberCount ?? 0),
            role: m.role,
          };
        }),
      );

      return reply.send(result);
    },
  );
}
