export type MemberRole = 'owner' | 'member';
export type SplitType = 'equal' | 'exact' | 'percentage';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export interface Group {
  id: string;
  name: string;
  inviteCode: string;
  createdAt: string;
  expiresAt: string;
}

export interface Member {
  id: string;
  groupId: string;
  userId: string | null;
  displayName: string;
  role: MemberRole;
  joinedAt: string;
  leftAt: string | null;
}

export interface Expense {
  id: string;
  groupId: string;
  paidBy: string;
  amount: string;
  description: string;
  splitType: SplitType;
  createdAt: string;
  updatedAt: string;
  splits: ExpenseSplit[];
}

export interface ExpenseSplit {
  id: string;
  expenseId: string;
  memberId: string;
  amount: string;
}

export interface Settlement {
  from: string;
  to: string;
  amountCents: number;
}

export interface Balance {
  memberId: string;
  displayName: string;
  netCents: number;
}

export interface BalancesResponse {
  balances: Balance[];
  settlements: Settlement[];
}

export interface ActivityLogEntry {
  id: string;
  groupId: string;
  message: string;
  createdAt: string;
}

// API request/response shapes

export interface CreateGroupRequest {
  name: string;
  displayName?: string;
}

export interface CreateGroupResponse {
  group: Group;
  member: Member;
}

export interface JoinGroupResponse {
  group: Group;
  member: Member;
}

export interface CreateExpenseRequest {
  description: string;
  amount: number;
  splitType: SplitType;
  memberIds: string[];
  splits?: ExactSplitInput[] | PercentageSplitInput[];
}

export interface ExactSplitInput {
  memberId: string;
  amount: number;
}

export interface PercentageSplitInput {
  memberId: string;
  percentage: number;
}

export interface UpdateExpenseRequest {
  description?: string;
  amount?: number;
  splitType?: SplitType;
  memberIds?: string[];
  splits?: ExactSplitInput[] | PercentageSplitInput[];
}

export interface GroupListItem {
  group: Group;
  memberCount: number;
  role: MemberRole;
}

export interface UpdateGroupSettingsRequest {
  name?: string;
  regenerateInviteCode?: boolean;
}
