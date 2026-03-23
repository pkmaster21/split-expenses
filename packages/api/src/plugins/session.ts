import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { createHash } from 'crypto';
import { db, members } from '../db/index.js';
import type { Member } from '../db/schema.js';
import { eq, isNull, and } from 'drizzle-orm';

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
    await reply.status(403).send({ error: 'Owner access required' });
    return;
  }
}

export { hashToken };
export default fp(sessionPlugin);
