import { beforeAll, afterAll, afterEach, describe, it, expect } from 'vitest';
import { buildApp } from '../app.js';
import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { db, activityLog, expenseSplits, expenses, members, groups } from '../db/index.js';

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
  // Neon HTTP driver is stateless — no connection to close
});

afterEach(async () => {
  // Delete in FK-safe order
  await db.delete(activityLog);
  await db.delete(expenseSplits);
  await db.delete(expenses);
  await db.delete(members);
  await db.delete(groups);
});

async function createGroup(name = 'Test Group', displayName = 'Alice') {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/groups',
    payload: { name, displayName },
  });
  expect(res.statusCode).toBe(201);
  const body = res.json<{ group: { id: string; inviteCode: string }; member: { id: string } }>();
  const cookie = res.headers['set-cookie'] as string;
  return { group: body.group, member: body.member, cookie };
}

describe('POST /api/v1/groups', () => {
  it('creates group, returns session cookie, returns owner member', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/groups',
      payload: { name: 'Trip', displayName: 'Alice' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json<{ group: { id: string }; member: { role: string } }>();
    expect(body.group.id).toBeDefined();
    expect(body.member.role).toBe('owner');
    expect(res.headers['set-cookie']).toBeDefined();
  });
});

describe('GET /api/v1/groups/invite/:inviteCode', () => {
  it('returns group metadata with memberCount', async () => {
    const { group } = await createGroup();
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/groups/invite/${group.inviteCode}`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ name: string; memberCount: number }>();
    expect(body.name).toBe('Test Group');
    expect(body.memberCount).toBe(1);
  });
});

describe('POST /api/v1/groups/invite/:inviteCode/join', () => {
  it('adds member, sets cookie', async () => {
    const { group } = await createGroup();
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/groups/invite/${group.inviteCode}/join`,
      payload: { displayName: 'Bob' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json<{ member: { displayName: string } }>();
    expect(body.member.displayName).toBe('Bob');
    expect(res.headers['set-cookie']).toBeDefined();
  });
});

describe('POST /api/v1/groups/:id/expenses', () => {
  it('equal split: computes ExpenseSplit records server-side', async () => {
    const { group, member, cookie } = await createGroup();
    const joinRes = await app.inject({
      method: 'POST',
      url: `/api/v1/groups/invite/${group.inviteCode}/join`,
      payload: { displayName: 'Bob' },
    });
    const bob = joinRes.json<{ member: { id: string } }>().member;

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/groups/${group.id}/expenses`,
      headers: { cookie },
      payload: {
        description: 'Dinner',
        amount: 30,
        splitType: 'equal',
        memberIds: [member.id, bob.id],
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json<{ splits: { amount: string }[] }>();
    expect(body.splits).toHaveLength(2);
    expect(body.splits.every((s) => parseFloat(s.amount) === 15)).toBe(true);
  });

  it('exact split: rejects bad inputs', async () => {
    const { group, member, cookie } = await createGroup();
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/groups/${group.id}/expenses`,
      headers: { cookie },
      payload: {
        description: 'Gas',
        amount: 50,
        splitType: 'exact',
        memberIds: [member.id],
        splits: [{ memberId: member.id, amount: 40 }],
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it('percentage split: converts to amounts', async () => {
    const { group, member, cookie } = await createGroup();
    const joinRes = await app.inject({
      method: 'POST',
      url: `/api/v1/groups/invite/${group.inviteCode}/join`,
      payload: { displayName: 'Bob' },
    });
    const bob = joinRes.json<{ member: { id: string } }>().member;

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/groups/${group.id}/expenses`,
      headers: { cookie },
      payload: {
        description: 'Hotel',
        amount: 100,
        splitType: 'percentage',
        memberIds: [member.id, bob.id],
        splits: [
          { memberId: member.id, percentage: 75 },
          { memberId: bob.id, percentage: 25 },
        ],
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json<{ splits: { memberId: string; amount: string }[] }>();
    const aliceSplit = body.splits.find((s) => s.memberId === member.id);
    const bobSplit = body.splits.find((s) => s.memberId === bob.id);
    expect(parseFloat(aliceSplit!.amount)).toBe(75);
    expect(parseFloat(bobSplit!.amount)).toBe(25);
  });
});

describe('GET /api/v1/groups/:id/balances', () => {
  it('returns correct settlement plan', async () => {
    const { group, member: alice, cookie: aliceCookie } = await createGroup();
    const bobJoin = await app.inject({
      method: 'POST',
      url: `/api/v1/groups/invite/${group.inviteCode}/join`,
      payload: { displayName: 'Bob' },
    });
    const bob = bobJoin.json<{ member: { id: string } }>().member;

    await app.inject({
      method: 'POST',
      url: `/api/v1/groups/${group.id}/expenses`,
      headers: { cookie: aliceCookie },
      payload: {
        description: 'Dinner',
        amount: 100,
        splitType: 'equal',
        memberIds: [alice.id, bob.id],
      },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/groups/${group.id}/balances`,
      headers: { cookie: aliceCookie },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ settlements: { from: string; to: string; amountCents: number }[] }>();
    expect(body.settlements).toHaveLength(1);
    expect(body.settlements[0]!.amountCents).toBe(5000);
    expect(body.settlements[0]!.from).toBe(bob.id);
    expect(body.settlements[0]!.to).toBe(alice.id);
  });

  it('includes ghost (soft-deleted) members in balance calculation', async () => {
    const { group, member: alice, cookie: aliceCookie } = await createGroup();
    const bobJoin = await app.inject({
      method: 'POST',
      url: `/api/v1/groups/invite/${group.inviteCode}/join`,
      payload: { displayName: 'Bob' },
    });
    const bob = bobJoin.json<{ member: { id: string } }>().member;

    // Alice pays $90 split equally — Bob owes $45
    await app.inject({
      method: 'POST',
      url: `/api/v1/groups/${group.id}/expenses`,
      headers: { cookie: aliceCookie },
      payload: {
        description: 'Dinner',
        amount: 90,
        splitType: 'equal',
        memberIds: [alice.id, bob.id],
      },
    });

    // Soft-delete Bob
    await app.inject({
      method: 'DELETE',
      url: `/api/v1/groups/${group.id}/members/${bob.id}`,
      headers: { cookie: aliceCookie },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/groups/${group.id}/balances`,
      headers: { cookie: aliceCookie },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<{
      balances: { memberId: string; displayName: string; netCents: number }[];
      settlements: { from: string; to: string; amountCents: number }[];
    }>();

    // Bob should still appear in balances even though he left
    const bobBalance = body.balances.find((b) => b.memberId === bob.id);
    expect(bobBalance).toBeDefined();
    expect(bobBalance!.displayName).toBe('Bob');
    expect(bobBalance!.netCents).toBe(-4500); // owes $45

    // Settlement plan should still show Bob paying Alice
    expect(body.settlements).toHaveLength(1);
    expect(body.settlements[0]!.from).toBe(bob.id);
    expect(body.settlements[0]!.to).toBe(alice.id);
    expect(body.settlements[0]!.amountCents).toBe(4500);
  });
});

describe('DELETE /api/v1/groups/:id/expenses/:expenseId', () => {
  it('member can delete own expense', async () => {
    const { group, cookie } = await createGroup();
    const expRes = await app.inject({
      method: 'POST',
      url: `/api/v1/groups/${group.id}/expenses`,
      headers: { cookie },
      payload: {
        description: 'Lunch',
        amount: 20,
        splitType: 'equal',
        memberIds: [
          (
            await app.inject({
              method: 'GET',
              url: `/api/v1/groups/${group.id}/members`,
              headers: { cookie },
            })
          ).json<{ id: string }[]>()[0]!.id,
        ],
      },
    });
    const expense = expRes.json<{ id: string }>();
    const delRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/groups/${group.id}/expenses/${expense.id}`,
      headers: { cookie },
    });
    expect(delRes.statusCode).toBe(204);
  });

  it('member cannot delete another member expense (403)', async () => {
    const { group, cookie: aliceCookie } = await createGroup();
    const bobJoin = await app.inject({
      method: 'POST',
      url: `/api/v1/groups/invite/${group.inviteCode}/join`,
      payload: { displayName: 'Bob' },
    });
    const bobCookie = bobJoin.headers['set-cookie'] as string;
    const aliceId = (
      await app.inject({
        method: 'GET',
        url: `/api/v1/groups/${group.id}/members`,
        headers: { cookie: aliceCookie },
      })
    ).json<{ id: string }[]>()[0]!.id;

    const expRes = await app.inject({
      method: 'POST',
      url: `/api/v1/groups/${group.id}/expenses`,
      headers: { cookie: aliceCookie },
      payload: {
        description: 'Dinner',
        amount: 20,
        splitType: 'equal',
        memberIds: [aliceId],
      },
    });
    const expense = expRes.json<{ id: string }>();

    const delRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/groups/${group.id}/expenses/${expense.id}`,
      headers: { cookie: bobCookie },
    });
    expect(delRes.statusCode).toBe(403);
  });
});

describe('DELETE /api/v1/groups/:id/members/:memberId', () => {
  it('admin can remove member', async () => {
    const { group, cookie: aliceCookie } = await createGroup();
    const bobJoin = await app.inject({
      method: 'POST',
      url: `/api/v1/groups/invite/${group.inviteCode}/join`,
      payload: { displayName: 'Bob' },
    });
    const bob = bobJoin.json<{ member: { id: string } }>().member;

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/groups/${group.id}/members/${bob.id}`,
      headers: { cookie: aliceCookie },
    });
    expect(res.statusCode).toBe(204);
  });

  it('member cannot remove other member (403)', async () => {
    const { group } = await createGroup();
    const bobJoin = await app.inject({
      method: 'POST',
      url: `/api/v1/groups/invite/${group.inviteCode}/join`,
      payload: { displayName: 'Bob' },
    });
    const bobCookie = bobJoin.headers['set-cookie'] as string;

    const carolJoin = await app.inject({
      method: 'POST',
      url: `/api/v1/groups/invite/${group.inviteCode}/join`,
      payload: { displayName: 'Carol' },
    });
    const carol = carolJoin.json<{ member: { id: string } }>().member;

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/groups/${group.id}/members/${carol.id}`,
      headers: { cookie: bobCookie },
    });
    expect(res.statusCode).toBe(403);
  });

  it('admin (non-owner) can remove a member', async () => {
    const { group } = await createGroup();
    const bobJoin = await app.inject({
      method: 'POST',
      url: `/api/v1/groups/invite/${group.inviteCode}/join`,
      payload: { displayName: 'Bob' },
    });
    const bob = bobJoin.json<{ member: { id: string } }>().member;
    const bobCookie = bobJoin.headers['set-cookie'] as string;

    // Insert Carol directly to avoid exhausting the HTTP rate limit across the test suite
    const [carol] = await db
      .insert(members)
      .values({ groupId: group.id, displayName: 'Carol', role: 'member', sessionToken: 'test-carol-token' })
      .returning();

    // Promote Bob to admin directly in the DB (no promote endpoint exists yet)
    await db.update(members).set({ role: 'admin' }).where(eq(members.id, bob.id));

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/groups/${group.id}/members/${carol!.id}`,
      headers: { cookie: bobCookie },
    });
    expect(res.statusCode).toBe(204);
  });
});

describe('Second user (joiner) authenticated access', () => {
  async function createGroupWithBob() {
    const { group, member: alice, cookie: aliceCookie } = await createGroup();
    // Insert Bob directly in the DB to avoid rate-limit on the join endpoint.
    // Use a known raw token so we can build a valid session cookie.
    const { hashToken } = await import('../plugins/session.js');
    const bobRawToken = 'test-bob-raw-token';
    const [bob] = await db
      .insert(members)
      .values({
        groupId: group.id,
        displayName: 'Bob',
        role: 'member',
        sessionToken: hashToken(bobRawToken),
      })
      .returning();
    const bobCookie = `session_token=${bobRawToken}`;
    return { group, alice, aliceCookie, bob: bob!, bobCookie };
  }

  it('second user can access all authenticated endpoints with their session cookie', async () => {
    const { group, alice, bob, bobCookie } = await createGroupWithBob();

    // GET /members
    const membersRes = await app.inject({
      method: 'GET',
      url: `/api/v1/groups/${group.id}/members`,
      headers: { cookie: bobCookie },
    });
    expect(membersRes.statusCode).toBe(200);
    expect(membersRes.json<{ id: string }[]>()).toHaveLength(2);

    // GET /expenses
    const expensesRes = await app.inject({
      method: 'GET',
      url: `/api/v1/groups/${group.id}/expenses`,
      headers: { cookie: bobCookie },
    });
    expect(expensesRes.statusCode).toBe(200);

    // GET /balances
    const balancesRes = await app.inject({
      method: 'GET',
      url: `/api/v1/groups/${group.id}/balances`,
      headers: { cookie: bobCookie },
    });
    expect(balancesRes.statusCode).toBe(200);

    // POST /expenses (Bob adds an expense)
    const addExpenseRes = await app.inject({
      method: 'POST',
      url: `/api/v1/groups/${group.id}/expenses`,
      headers: { cookie: bobCookie },
      payload: {
        description: 'Lunch',
        amount: 20,
        splitType: 'equal',
        memberIds: [alice.id, bob.id],
      },
    });
    expect(addExpenseRes.statusCode).toBe(201);
    const expense = addExpenseRes.json<{ id: string }>();

    // DELETE /expenses/:id (Bob deletes own expense)
    const delExpenseRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/groups/${group.id}/expenses/${expense.id}`,
      headers: { cookie: bobCookie },
    });
    expect(delExpenseRes.statusCode).toBe(204);

    // GET /activity
    const activityRes = await app.inject({
      method: 'GET',
      url: `/api/v1/groups/${group.id}/activity`,
      headers: { cookie: bobCookie },
    });
    expect(activityRes.statusCode).toBe(200);

    // GET /groups/:id (group details)
    const groupRes = await app.inject({
      method: 'GET',
      url: `/api/v1/groups/${group.id}`,
      headers: { cookie: bobCookie },
    });
    expect(groupRes.statusCode).toBe(200);
  });

  it('unauthenticated requests return 401', async () => {
    const { group } = await createGroup();

    const endpoints = [
      { method: 'GET' as const, url: `/api/v1/groups/${group.id}/members` },
      { method: 'GET' as const, url: `/api/v1/groups/${group.id}/expenses` },
      { method: 'GET' as const, url: `/api/v1/groups/${group.id}/balances` },
      { method: 'GET' as const, url: `/api/v1/groups/${group.id}/activity` },
    ];

    for (const { method, url } of endpoints) {
      const res = await app.inject({ method, url });
      expect(res.statusCode).toBe(401);
    }
  });
});

describe('Content-Type: application/json on bodyless requests', () => {
  it('DELETE with Content-Type but no body returns 400', async () => {
    const { group, cookie: aliceCookie } = await createGroup();
    const { hashToken } = await import('../plugins/session.js');
    const bobRawToken = 'test-bob-ct-token';
    const [bob] = await db
      .insert(members)
      .values({
        groupId: group.id,
        displayName: 'Bob',
        role: 'member',
        sessionToken: hashToken(bobRawToken),
      })
      .returning();

    // Simulate browser sending Content-Type: application/json on DELETE with no body
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/groups/${group.id}/members/${bob!.id}`,
      headers: { cookie: aliceCookie, 'content-type': 'application/json' },
    });
    // Fastify 5 rejects empty body with Content-Type: application/json
    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe('FST_ERR_CTP_EMPTY_JSON_BODY');
  });

  it('DELETE without Content-Type header succeeds', async () => {
    const { group, cookie: aliceCookie } = await createGroup();
    const { hashToken } = await import('../plugins/session.js');
    const bobRawToken = 'test-bob-noct-token';
    const [bob] = await db
      .insert(members)
      .values({
        groupId: group.id,
        displayName: 'Bob',
        role: 'member',
        sessionToken: hashToken(bobRawToken),
      })
      .returning();

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/groups/${group.id}/members/${bob!.id}`,
      headers: { cookie: aliceCookie },
    });
    expect(res.statusCode).toBe(204);
  });
});
