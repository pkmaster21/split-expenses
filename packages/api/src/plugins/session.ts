import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { createHash } from 'crypto';
import { db, members, sessions, users } from '../db/index.js';
import type { Member, User } from '../db/schema.js';
import { eq, isNull, and } from 'drizzle-orm';
import { ensureOwnerExists } from '../services/ownership.js';

declare module 'fastify' {
  interface FastifyRequest {
    user: User | null;
    member: Member | null;
  }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export const SESSION_COOKIE = 'session_token';

async function sessionPlugin(fastify: FastifyInstance) {
  fastify.decorateRequest('user', null);
  fastify.decorateRequest('member', null);

  fastify.addHook('preHandler', async (request: FastifyRequest) => {
    const token = request.cookies[SESSION_COOKIE];
    if (!token) return;

    const hashed = hashToken(token);

    // New path: look up in sessions table → resolve user
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.tokenHash, hashed));

    if (session && session.expiresAt > new Date()) {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, session.userId));
      if (user) {
        request.user = user;
        return;
      }
    }

    // Legacy fallback: look up in members table directly
    const [member] = await db
      .select()
      .from(members)
      .where(and(eq(members.sessionToken, hashed), isNull(members.leftAt)));
    request.member = member ?? null;
  });
}

/**
 * For group-scoped routes, resolve request.member from request.user + groupId.
 * Call this after requireSession in preHandler hooks for group routes.
 */
export async function resolveGroupMember(request: FastifyRequest, _reply: FastifyReply) {
  // If member is already set (legacy path), skip
  if (request.member) return;

  if (!request.user) return;

  const { id } = request.params as { id: string };
  if (!id) return;

  const [member] = await db
    .select()
    .from(members)
    .where(and(eq(members.userId, request.user.id), eq(members.groupId, id), isNull(members.leftAt)));
  request.member = member ?? null;
}

export async function requireSession(request: FastifyRequest, reply: FastifyReply) {
  if (!request.user && !request.member) {
    await reply.status(401).send({ error: 'Authentication required' });
    return;
  }
}

export async function requireGroupMember(request: FastifyRequest, reply: FastifyReply) {
  // First resolve member from user if needed
  await resolveGroupMember(request, reply);

  if (!request.member) {
    await reply.status(401).send({ error: 'Authentication required' });
    return;
  }
  const { id } = request.params as { id: string };
  if (request.member.groupId !== id) {
    await reply.status(403).send({ error: 'Forbidden' });
    return;
  }
}


export async function requireOwner(request: FastifyRequest, reply: FastifyReply) {
  await resolveGroupMember(request, reply);

  if (!request.member) {
    await reply.status(401).send({ error: 'Authentication required' });
    return;
  }
  const { id } = request.params as { id: string };
  if (request.member.groupId !== id) {
    await reply.status(403).send({ error: 'Forbidden' });
    return;
  }
  if (request.member.role !== 'owner') {
    await ensureOwnerExists(id);
    const [refreshed] = await db
      .select()
      .from(members)
      .where(and(eq(members.id, request.member.id), isNull(members.leftAt)));
    if (refreshed?.role === 'owner') {
      request.member = refreshed;
      return;
    }
    await reply.status(403).send({ error: 'Owner access required' });
    return;
  }
}

export { hashToken };
export default fp(sessionPlugin);
