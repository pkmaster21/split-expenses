import type {
  CreateGroupRequest,
  CreateGroupResponse,
  JoinGroupResponse,
  Group,
  Member,
  Expense,
  BalancesResponse,
  ActivityLogEntry,
  UpdateGroupSettingsRequest,
  CreateExpenseRequest,
  UpdateExpenseRequest,
} from '@tabby/shared';

const BASE = import.meta.env.VITE_API_URL ?? '';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: HeadersInit = { ...init?.headers };
  if (init?.body) {
    (headers as Record<string, string>)['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, (body as { error?: string }).error ?? res.statusText);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const api = {
  createGroup: (body: CreateGroupRequest) =>
    request<CreateGroupResponse>('/api/v1/groups', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getGroupByInviteCode: (inviteCode: string) =>
    request<Group & { memberCount: number }>(`/api/v1/groups/invite/${inviteCode}`),

  joinGroup: (inviteCode: string, displayName: string) =>
    request<JoinGroupResponse>(`/api/v1/groups/invite/${inviteCode}/join`, {
      method: 'POST',
      body: JSON.stringify({ displayName }),
    }),

  getGroup: (groupId: string) =>
    request<Group>(`/api/v1/groups/${groupId}`),

  getMembers: (groupId: string) =>
    request<Member[]>(`/api/v1/groups/${groupId}/members`),

  removeMember: (groupId: string, memberId: string) =>
    request<void>(`/api/v1/groups/${groupId}/members/${memberId}`, {
      method: 'DELETE',
    }),

  getExpenses: (groupId: string) =>
    request<Expense[]>(`/api/v1/groups/${groupId}/expenses`),

  createExpense: (groupId: string, body: CreateExpenseRequest) =>
    request<Expense>(`/api/v1/groups/${groupId}/expenses`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateExpense: (groupId: string, expenseId: string, body: UpdateExpenseRequest) =>
    request<Expense>(`/api/v1/groups/${groupId}/expenses/${expenseId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  deleteExpense: (groupId: string, expenseId: string) =>
    request<void>(`/api/v1/groups/${groupId}/expenses/${expenseId}`, {
      method: 'DELETE',
    }),

  getBalances: (groupId: string) =>
    request<BalancesResponse>(`/api/v1/groups/${groupId}/balances`),

  updateGroupSettings: (groupId: string, body: UpdateGroupSettingsRequest) =>
    request<Group>(`/api/v1/groups/${groupId}/settings`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  getActivity: (groupId: string) =>
    request<ActivityLogEntry[]>(`/api/v1/groups/${groupId}/activity`),
};
