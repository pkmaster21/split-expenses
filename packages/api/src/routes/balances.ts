import { FastifyInstance } from 'fastify';
import { db, members, expenses, expenseSplits } from '../db/index.js';
import { eq, inArray } from 'drizzle-orm';
import { requireSession, requireGroupMember } from '../plugins/session.js';
import { simplifyDebts } from '../services/debt.js';
import type { Balance } from '@tabby/shared';

export async function balanceRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/api/v1/groups/:id/balances',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        tags: ['balances'],
        summary: 'Get net balances and settlement plan',
      },
      preHandler: [requireSession, requireGroupMember],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      // Intentionally no leftAt filter — ghost (soft-deleted) members must remain
      // in the balance calculation so the ledger stays accurate after someone leaves.
      const allMembers = await db
        .select({ id: members.id, displayName: members.displayName })
        .from(members)
        .where(eq(members.groupId, id));

      const memberNames = new Map(allMembers.map((m) => [m.id, m.displayName]));

      const expenseRows = await db
        .select()
        .from(expenses)
        .where(eq(expenses.groupId, id));

      const splitRows =
        expenseRows.length > 0
          ? await db
              .select()
              .from(expenseSplits)
              .where(inArray(expenseSplits.expenseId, expenseRows.map((e) => e.id)))
          : [];

      const netCents = new Map<string, number>();
      for (const member of allMembers) {
        netCents.set(member.id, 0);
      }

      for (const expense of expenseRows) {
        const totalCents = Math.round(Number(expense.amount) * 100);
        // paidBy is always present in netCents: expenses.paidBy has ON DELETE RESTRICT to
        // members.id, and requireGroupMember ensures the payer belongs to this group at
        // write time. The ?? 0 is an unreachable fallback retained for type safety.
        netCents.set(expense.paidBy, (netCents.get(expense.paidBy) ?? 0) + totalCents);
      }

      for (const split of splitRows) {
        const splitCents = Math.round(Number(split.amount) * 100);
        netCents.set(split.memberId, (netCents.get(split.memberId) ?? 0) - splitCents);
      }

      const balances: Balance[] = [];
      for (const [memberId, net] of netCents) {
        balances.push({
          memberId,
          displayName: memberNames.get(memberId) ?? 'Unknown',
          netCents: net,
        });
      }

      const settlements = simplifyDebts(netCents);

      return reply.send({ balances, settlements });
    },
  );
}
