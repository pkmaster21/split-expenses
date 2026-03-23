export const queryKeys = {
  group: (groupId: string) => ['group', groupId] as const,
  members: (groupId: string) => ['members', groupId] as const,
  expenses: (groupId: string) => ['expenses', groupId] as const,
  balances: (groupId: string) => ['balances', groupId] as const,
  activity: (groupId: string) => ['activity', groupId] as const,
};
