import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  numeric,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const memberRoleEnum = pgEnum('member_role', ['owner', 'member']);
export const splitTypeEnum = pgEnum('split_type', ['equal', 'exact', 'percentage']);

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    name: varchar('name', { length: 100 }).notNull(),
    avatarUrl: text('avatar_url'),
    googleId: varchar('google_id', { length: 100 }).notNull().unique(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({
    googleIdIdx: uniqueIndex('users_google_id_idx').on(t.googleId),
  }),
);

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 100 }).notNull().unique(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    expiresAt: timestamp('expires_at').notNull(),
  },
  (t) => ({
    tokenHashIdx: uniqueIndex('sessions_token_hash_idx').on(t.tokenHash),
    userIdIdx: index('sessions_user_id_idx').on(t.userId),
  }),
);

export const groups = pgTable(
  'groups',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull(),
    inviteCode: varchar('invite_code', { length: 20 }).notNull().unique(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    expiresAt: timestamp('expires_at').notNull(),
  },
  (t) => ({
    inviteCodeIdx: uniqueIndex('groups_invite_code_idx').on(t.inviteCode),
  }),
);

export const members = pgTable(
  'members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    groupId: uuid('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id),
    displayName: varchar('display_name', { length: 50 }).notNull(),
    role: memberRoleEnum('role').notNull().default('member'),
    sessionToken: varchar('session_token', { length: 100 }),
    joinedAt: timestamp('joined_at').notNull().defaultNow(),
    leftAt: timestamp('left_at'),
  },
  (t) => ({
    groupIdIdx: index('members_group_id_idx').on(t.groupId),
    sessionTokenIdx: uniqueIndex('members_session_token_idx').on(t.sessionToken),
    userGroupIdx: uniqueIndex('members_user_group_idx').on(t.userId, t.groupId),
  }),
);

export const expenses = pgTable(
  'expenses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    groupId: uuid('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    paidBy: uuid('paid_by')
      .notNull()
      .references(() => members.id, { onDelete: 'restrict' }),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
    description: varchar('description', { length: 200 }).notNull(),
    splitType: splitTypeEnum('split_type').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    groupIdIdx: index('expenses_group_id_idx').on(t.groupId),
  }),
);

export const expenseSplits = pgTable(
  'expense_splits',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    expenseId: uuid('expense_id')
      .notNull()
      .references(() => expenses.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'restrict' }),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  },
  (t) => ({
    expenseIdIdx: index('expense_splits_expense_id_idx').on(t.expenseId),
    memberIdIdx: index('expense_splits_member_id_idx').on(t.memberId),
  }),
);

export const activityLog = pgTable(
  'activity_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    groupId: uuid('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    message: text('message').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({
    groupIdIdx: index('activity_logs_group_id_idx').on(t.groupId),
  }),
);

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Group = typeof groups.$inferSelect;
export type Member = typeof members.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type ExpenseSplit = typeof expenseSplits.$inferSelect;
export type ActivityLogRow = typeof activityLog.$inferSelect;
