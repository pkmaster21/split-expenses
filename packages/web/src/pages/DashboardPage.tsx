import { useState, useSyncExternalStore } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, onlineManager } from '@tanstack/react-query';
import type { Member, Expense, BalancesResponse } from '@tabby/shared';
import { api, ApiError } from '../lib/api.js';
import { queryKeys } from '../lib/queryKeys.js';
import { Button } from '../components/Button.js';
import { Avatar } from '../components/Avatar.js';
import { Badge } from '../components/Badge.js';
import { AddExpenseModal } from '../components/AddExpenseModal.js';

function fmt(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    Math.abs(cents) / 100,
  );
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function DashboardPage() {
  const { id } = useParams<{ id: string }>();
  const isOnline = useSyncExternalStore(
    (cb) => onlineManager.subscribe(cb),
    () => onlineManager.isOnline(),
  );
  const queryClient = useQueryClient();

  const [showAddExpense, setShowAddExpense] = useState(false);
  const [activeTab, setActiveTab] = useState<'expenses' | 'balances'>('expenses');

  const sharedQueryOptions = {
    refetchInterval: 12_000,
    refetchIntervalInBackground: false,
  };

  const membersQuery = useQuery({
    queryKey: queryKeys.members(id!),
    queryFn: () => api.getMembers(id!),
    ...sharedQueryOptions,
  });

  const expensesQuery = useQuery({
    queryKey: queryKeys.expenses(id!),
    queryFn: () => api.getExpenses(id!),
    ...sharedQueryOptions,
  });

  const balancesQuery = useQuery({
    queryKey: queryKeys.balances(id!),
    queryFn: () => api.getBalances(id!),
    ...sharedQueryOptions,
  });

  const members: Member[] = membersQuery.data ?? [];
  const expenses: Expense[] = expensesQuery.data ?? [];
  const balances: BalancesResponse | null = balancesQuery.data ?? null;

  // Derive current member from query data — no separate useState needed
  const storedId = localStorage.getItem(`member_hint_${id}`);
  const currentMember = members.find((m) => m.id === storedId) ?? null;

  // Distinguish 401 (session gone) from 410 (group expired) for distinct UI states
  const anyError = membersQuery.error ?? expensesQuery.error ?? balancesQuery.error;
  const isExpired = !!anyError && (anyError as ApiError)?.status === 410;
  const sessionError = !!anyError && (anyError as ApiError)?.status === 401;

  const isLoading = membersQuery.isLoading;
  const lastUpdated = membersQuery.dataUpdatedAt
    ? new Date(membersQuery.dataUpdatedAt)
    : null;

  const addExpenseMutation = useMutation({
    mutationFn: (data: Parameters<typeof api.createExpense>[1]) =>
      api.createExpense(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses(id!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.balances(id!) });
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: (expenseId: string) => api.deleteExpense(id!, expenseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses(id!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.balances(id!) });
    },
  });

  const handleDeleteExpense = (expenseId: string) => {
    if (!confirm('Delete this expense?')) return;
    deleteExpenseMutation.mutate(expenseId);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const canAddExpense = isOnline && !isExpired && currentMember;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Group Dashboard</h1>
            {!isOnline && (
              <p className="text-xs text-yellow-600">
                Offline — showing cached data
                {lastUpdated && ` from ${lastUpdated.toLocaleTimeString()}`}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Link to={`/groups/${id}/settings`}>
              <Button variant="ghost" size="sm" aria-label="Settings">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {sessionError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
            Session expired. Open the group link again to rejoin.
          </div>
        )}
        {isExpired && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
            This group has expired (90 days of inactivity). Balances are read-only.
          </div>
        )}

        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Members</h2>
          <div className="flex flex-wrap gap-3">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-2 bg-white rounded-full px-3 py-1.5 shadow-sm border border-gray-100">
                <Avatar name={m.displayName} size="sm" />
                <span className="text-sm font-medium text-gray-700">{m.displayName}</span>
                {m.role !== 'member' && <Badge variant="indigo">{m.role}</Badge>}
              </div>
            ))}
          </div>
        </section>

        <div className="flex gap-2 border-b border-gray-200">
          {(['expenses', 'balances'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors capitalize
                ${activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'expenses' && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Expenses</h2>
              {canAddExpense && (
                <Button size="sm" onClick={() => setShowAddExpense(true)}>
                  + Add expense
                </Button>
              )}
              {!isOnline && (
                <span className="text-xs text-gray-400">Offline — add expense unavailable</span>
              )}
            </div>

            {expenses.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">No expenses yet. Add the first one!</p>
            )}

            <div className="space-y-2">
              {expenses.map((exp) => {
                const payer = members.find((m) => m.id === exp.paidBy);
                const canEdit =
                  currentMember &&
                  (exp.paidBy === currentMember.id ||
                    currentMember.role === 'owner' ||
                    currentMember.role === 'admin');
                return (
                  <div key={exp.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{exp.description}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {payer?.displayName ?? 'Unknown'} paid · {fmtDate(exp.createdAt)} ·{' '}
                          <Badge variant="gray">{exp.splitType}</Badge>
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-semibold text-gray-900">
                          ${Number(exp.amount).toFixed(2)}
                        </span>
                        {canEdit && (
                          <button
                            onClick={() => handleDeleteExpense(exp.id)}
                            disabled={deleteExpenseMutation.isPending}
                            className="text-gray-300 hover:text-red-400 transition-colors disabled:opacity-50"
                            aria-label="Delete expense"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {activeTab === 'balances' && balances && (
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Net balances</h2>
            <div className="space-y-2">
              {balances.balances.map((b) => (
                <div key={b.memberId} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar name={b.displayName} />
                    <span className="font-medium text-gray-900">{b.displayName}</span>
                  </div>
                  <span className={`font-semibold text-sm ${b.netCents >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {b.netCents >= 0 ? '+' : '-'}{fmt(b.netCents)}
                  </span>
                </div>
              ))}
            </div>

            {balances.settlements.length > 0 && (
              <>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider pt-2">Settlement plan</h2>
                <div className="space-y-2">
                  {balances.settlements.map((s) => {
                    const from = members.find((m) => m.id === s.from);
                    const to = members.find((m) => m.id === s.to);
                    return (
                      <div key={`${s.from}-${s.to}`} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
                        <Avatar name={from?.displayName ?? '?'} size="sm" />
                        <span className="text-sm text-gray-700 flex-1">
                          <span className="font-medium">{from?.displayName ?? 'Unknown'}</span>
                          {' pays '}
                          <span className="font-medium">{to?.displayName ?? 'Unknown'}</span>
                        </span>
                        <span className="font-semibold text-gray-900">${(s.amountCents / 100).toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {balances.settlements.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">All settled up! 🎉</p>
            )}
          </section>
        )}
      </main>

      {currentMember && (
        <AddExpenseModal
          key={String(showAddExpense)}
          open={showAddExpense}
          onClose={() => setShowAddExpense(false)}
          members={members}
          currentMemberId={currentMember.id}
          onSave={(data) => addExpenseMutation.mutateAsync(data).then(() => setShowAddExpense(false))}
        />
      )}
    </div>
  );
}
