import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { db, groups, members, expenses, expenseSplits } from '../db/index.js';
import { eq, desc, and, inArray, isNull } from 'drizzle-orm';
import { requireSession, requireGroupMember } from '../plugins/session.js';
import { computeSplits } from '../services/splits.js';
import { groupExpiresAt } from '../lib/time.js';
import type { SplitType, ExactSplitInput, PercentageSplitInput } from '@tabby/shared';

const MAX_EXPENSE_CENTS = 1_000_000;

export async function expenseRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/api/v1/groups/:id/expenses',
    {
      config: {
        rateLimit: {
          max: 30,
          timeWindow: '1 hour',
          keyGenerator: (req) => req.member?.id ?? req.ip ?? 'unknown',
        },
      },
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        body: {
          type: 'object',
          required: ['description', 'amount', 'splitType', 'memberIds'],
          properties: {
            description: { type: 'string', minLength: 1, maxLength: 200 },
            amount: { type: 'number', minimum: 0.01 },
            splitType: { type: 'string', enum: ['equal', 'exact', 'percentage'] },
            memberIds: { type: 'array', items: { type: 'string' }, minItems: 1 },
            splits: { type: 'array' },
          },
        },
        tags: ['expenses'],
        summary: 'Add an expense',
      },
      preHandler: [requireSession, requireGroupMember],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as {
        description: string;
        amount: number;
        splitType: SplitType;
        memberIds: string[];
        splits?: ExactSplitInput[] | PercentageSplitInput[];
      };

      const totalCents = Math.round(body.amount * 100);
      if (totalCents > MAX_EXPENSE_CENTS) {
        return reply.status(400).send({ error: 'Expense exceeds maximum of $10,000' });
      }

      const [group] = await db.select().from(groups).where(eq(groups.id, id));
      if (!group) return reply.status(404).send({ error: 'Group not found' });
      if (group.expiresAt < new Date()) {
        return reply.status(410).send({ error: 'Group has expired' });
      }

      const activeMemberRows = await db
        .select({ id: members.id })
        .from(members)
        .where(and(eq(members.groupId, id), inArray(members.id, body.memberIds), isNull(members.leftAt)));
      if (activeMemberRows.length !== body.memberIds.length) {
        return reply.status(400).send({ error: 'One or more member IDs are invalid' });
      }

      let splitResults: { memberId: string; amountCents: number }[];
      try {
        splitResults = computeSplits(totalCents, body.splitType, body.memberIds, body.splits);
      } catch (err) {
        return reply.status(400).send({ error: (err as Error).message });
      }

      const expenseId = randomUUID();
      const [expenseRows, splitsRows] = await db.batch([
        db.insert(expenses).values({
          id: expenseId,
          groupId: id,
          paidBy: request.member!.id,
          amount: String(totalCents / 100),
          description: body.description,
          splitType: body.splitType,
        }).returning(),
        db.insert(expenseSplits).values(
          splitResults.map((s) => ({
            expenseId,
            memberId: s.memberId,
            amount: String(s.amountCents / 100),
          })),
        ).returning(),
      ]);
      await db.update(groups).set({ expiresAt: groupExpiresAt() }).where(eq(groups.id, id));

      return reply.status(201).send({ ...expenseRows[0]!, splits: splitsRows });
    },
  );

  fastify.get(
    '/api/v1/groups/:id/expenses',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        tags: ['expenses'],
        summary: 'List all expenses',
      },
      preHandler: [requireSession, requireGroupMember],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const expenseRows = await db
        .select()
        .from(expenses)
        .where(eq(expenses.groupId, id))
        .orderBy(desc(expenses.createdAt));

      if (expenseRows.length === 0) return reply.send([]);

      const splitRows = await db
        .select()
        .from(expenseSplits)
        .where(inArray(expenseSplits.expenseId, expenseRows.map((e) => e.id)));

      const splitsByExpenseId = new Map<string, typeof splitRows>();
      for (const split of splitRows) {
        const arr = splitsByExpenseId.get(split.expenseId) ?? [];
        arr.push(split);
        splitsByExpenseId.set(split.expenseId, arr);
      }

      return reply.send(
        expenseRows.map((e) => ({ ...e, splits: splitsByExpenseId.get(e.id) ?? [] })),
      );
    },
  );

  fastify.patch(
    '/api/v1/groups/:id/expenses/:expenseId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id', 'expenseId'],
          properties: {
            id: { type: 'string' },
            expenseId: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            description: { type: 'string', minLength: 1, maxLength: 200 },
            amount: { type: 'number', minimum: 0.01 },
            splitType: { type: 'string', enum: ['equal', 'exact', 'percentage'] },
            memberIds: { type: 'array', items: { type: 'string' }, minItems: 1 },
            splits: { type: 'array' },
          },
        },
        tags: ['expenses'],
        summary: 'Edit an expense (owner of expense or group owner)',
      },
      preHandler: [requireSession, requireGroupMember],
    },
    async (request, reply) => {
      const { id, expenseId } = request.params as { id: string; expenseId: string };
      const member = request.member!;

      const [expense] = await db
        .select()
        .from(expenses)
        .where(and(eq(expenses.id, expenseId), eq(expenses.groupId, id)));

      if (!expense) return reply.status(404).send({ error: 'Expense not found' });

      const isOwnerOrAdmin = member.role === 'owner';
      if (expense.paidBy !== member.id && !isOwnerOrAdmin) {
        return reply.status(403).send({ error: "Cannot edit another member's expense" });
      }

      const body = request.body as {
        description?: string;
        amount?: number;
        splitType?: SplitType;
        memberIds?: string[];
        splits?: ExactSplitInput[] | PercentageSplitInput[];
      };

      const newAmount = body.amount ?? Number(expense.amount);
      const totalCents = Math.round(newAmount * 100);
      if (totalCents > MAX_EXPENSE_CENTS) {
        return reply.status(400).send({ error: 'Expense exceeds maximum of $10,000' });
      }

      const splitType = body.splitType ?? expense.splitType;
      let memberIds = body.memberIds;

      // If amount or splitType changed, splits must be recalculated even when
      // memberIds wasn't explicitly provided — otherwise the stored splits
      // become stale and the ledger is wrong.
      const needsSplitRecalc = memberIds || body.amount !== undefined || body.splitType !== undefined;

      let result: (typeof expense) & { splits: { id: string; expenseId: string; memberId: string; amount: string }[] };

      if (needsSplitRecalc) {
        // If caller didn't provide memberIds, use the existing split participants
        if (!memberIds) {
          const existingSplits = await db
            .select({ memberId: expenseSplits.memberId })
            .from(expenseSplits)
            .where(eq(expenseSplits.expenseId, expenseId));
          memberIds = existingSplits.map((s) => s.memberId);
        }

        const activeMemberRows = await db
          .select({ id: members.id })
          .from(members)
          .where(and(eq(members.groupId, id), inArray(members.id, memberIds), isNull(members.leftAt)));
        if (activeMemberRows.length !== memberIds.length) {
          return reply.status(400).send({ error: 'One or more member IDs are invalid' });
        }

        let splitResults: { memberId: string; amountCents: number }[];
        try {
          splitResults = computeSplits(totalCents, splitType, memberIds, body.splits);
        } catch (err) {
          return reply.status(400).send({ error: (err as Error).message });
        }

        const batchResult = await db.batch([
          db.delete(expenseSplits).where(eq(expenseSplits.expenseId, expenseId)),
          db.update(expenses).set({
            description: body.description,
            amount: String(totalCents / 100),
            splitType,
            updatedAt: new Date(),
          }).where(eq(expenses.id, expenseId)).returning(),
          db.insert(expenseSplits).values(
            splitResults.map((s) => ({
              expenseId,
              memberId: s.memberId,
              amount: String(s.amountCents / 100),
            })),
          ).returning(),
        ]);
        const updatedRows = batchResult[1];
        const splitsRows = batchResult[2];
        result = { ...updatedRows[0]!, splits: splitsRows };
      } else {
        // Only description changed — no split recalculation needed
        const [updated] = await db
          .update(expenses)
          .set({
            description: body.description,
            updatedAt: new Date(),
          })
          .where(eq(expenses.id, expenseId))
          .returning();

        const splits = await db
          .select()
          .from(expenseSplits)
          .where(eq(expenseSplits.expenseId, expenseId));

        result = { ...updated!, splits };
      }

      await db.update(groups).set({ expiresAt: groupExpiresAt() }).where(eq(groups.id, id));

      return reply.send(result);
    },
  );

  fastify.delete(
    '/api/v1/groups/:id/expenses/:expenseId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id', 'expenseId'],
          properties: {
            id: { type: 'string' },
            expenseId: { type: 'string' },
          },
        },
        tags: ['expenses'],
        summary: 'Delete an expense (owner of expense or group owner)',
      },
      preHandler: [requireSession, requireGroupMember],
    },
    async (request, reply) => {
      const { id, expenseId } = request.params as { id: string; expenseId: string };
      const member = request.member!;

      const [expense] = await db
        .select()
        .from(expenses)
        .where(and(eq(expenses.id, expenseId), eq(expenses.groupId, id)));

      if (!expense) return reply.status(404).send({ error: 'Expense not found' });

      const isOwnerOrAdmin = member.role === 'owner';
      if (expense.paidBy !== member.id && !isOwnerOrAdmin) {
        return reply.status(403).send({ error: "Cannot delete another member's expense" });
      }

      // Cascade delete handles expenseSplits
      await db.delete(expenses).where(eq(expenses.id, expenseId));
      await db.update(groups).set({ expiresAt: groupExpiresAt() }).where(eq(groups.id, id));

      return reply.status(204).send();
    },
  );
}
