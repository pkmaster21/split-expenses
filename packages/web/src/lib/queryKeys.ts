export const queryKeys = {
  me: () => ['me'] as const,
  myGroups: () => ['myGroups'] as const,
  currentMember: (groupId: string) => ['currentMember', groupId] as const,
  group: (groupId: string) => ['group', groupId] as const,
  members: (groupId: string) => ['members', groupId] as const,
  expenses: (groupId: string) => ['expenses', groupId] as const,
  balances: (groupId: string) => ['balances', groupId] as const,
  activity: (groupId: string) => ['activity', groupId] as const,
};
