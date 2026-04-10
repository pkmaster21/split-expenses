import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { createHash } from 'crypto';
import { db, members } from '../db/index.js';
import type { Member } from '../db/schema.js';
import { eq, isNull, and } from 'drizzle-orm';
import { ensureOwnerExists } from '../services/ownership.js';

declare module 'fastify' {
  interface FastifyRequest {
    member: Member | null;
  }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export const SESSION_COOKIE = 'session_token';

async function sessionPlugin(fastify: FastifyInstance) {
  fastify.decorateRequest('member', null);

  fastify.addHook('preHandler', async (request: FastifyRequest) => {
    const token = request.cookies[SESSION_COOKIE];
    if (!token) return;

    const hashed = hashToken(token);
    const [member] = await db
      .select()
      .from(members)
      .where(and(eq(members.sessionToken, hashed), isNull(members.leftAt)));
    request.member = member ?? null;
  });
}

export async function requireSession(request: FastifyRequest, reply: FastifyReply) {
  if (!request.member) {
    await reply.status(401).send({ error: 'Authentication required' });
    return;
  }
}

export async function requireGroupMember(request: FastifyRequest, reply: FastifyReply) {
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

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  if (!request.member) {
    await reply.status(401).send({ error: 'Authentication required' });
    return;
  }
  const { id } = request.params as { id: string };
  if (request.member.groupId !== id) {
    await reply.status(403).send({ error: 'Forbidden' });
    return;
  }
  if (request.member.role !== 'admin' && request.member.role !== 'owner') {
    await reply.status(403).send({ error: 'Admin access required' });
    return;
  }
}

export async function requireOwner(request: FastifyRequest, reply: FastifyReply) {
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
    // Lazy ownership recovery: if the group has no active owner (e.g. the
    // original owner lost their session), promote the first admin or earliest
    // member and re-check whether this requester was promoted.
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
