import { useState, FormEvent } from 'react';
import type { Member, Expense, SplitType, ExactSplitInput, PercentageSplitInput } from '@tabby/shared';
import { Modal } from './Modal.js';
import { Button } from './Button.js';
import { Input } from './Input.js';

interface AddExpenseModalProps {
  open: boolean;
  onClose: () => void;
  members: Member[];
  currentMemberId: string;
  initialExpense?: Expense;
  onSave: (data: {
    description: string;
    amount: number;
    splitType: SplitType;
    memberIds: string[];
    splits?: ExactSplitInput[] | PercentageSplitInput[];
  }) => Promise<void>;
}

export function AddExpenseModal({
  open,
  onClose,
  members,
  currentMemberId,
  initialExpense,
  onSave,
}: AddExpenseModalProps) {
  const isEditing = !!initialExpense;
  const [description, setDescription] = useState(initialExpense?.description ?? '');
  const [amount, setAmount] = useState(initialExpense ? String(Number(initialExpense.amount)) : '');
  const [splitType, setSplitType] = useState<SplitType>(initialExpense?.splitType ?? 'equal');
  const [selectedIds, setSelectedIds] = useState<string[]>(
    initialExpense ? initialExpense.splits.map((s) => s.memberId) : members.map((m) => m.id),
  );
  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>(
    initialExpense?.splitType === 'exact'
      ? Object.fromEntries(initialExpense.splits.map((s) => [s.memberId, String(Number(s.amount))]))
      : {},
  );
  const [percentages, setPercentages] = useState<Record<string, string>>(
    initialExpense?.splitType === 'percentage'
      ? Object.fromEntries(
          initialExpense.splits.map((s) => {
            const pct = (Number(s.amount) / Number(initialExpense.amount)) * 100;
            return [s.memberId, String(Math.round(pct))];
          }),
        )
      : {},
  );
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleMember = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Enter a valid amount');
      return;
    }
    if (selectedIds.length === 0) {
      setError('Select at least one member');
      return;
    }

    let splits: ExactSplitInput[] | PercentageSplitInput[] | undefined;

    if (splitType === 'exact') {
      splits = selectedIds.map((id) => ({
        memberId: id,
        amount: parseFloat(exactAmounts[id] ?? '0'),
      }));
    } else if (splitType === 'percentage') {
      splits = selectedIds.map((id) => ({
        memberId: id,
        percentage: parseFloat(percentages[id] ?? '0'),
      }));
    }

    setLoading(true);
    try {
      await onSave({ description, amount: amountNum, splitType, memberIds: selectedIds, splits });
      setDescription('');
      setAmount('');
      setSplitType('equal');
      setSelectedIds(members.map((m) => m.id));
      setExactAmounts({});
      setPercentages({});
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Edit expense' : 'Add expense'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Description"
          placeholder="e.g. Dinner at Moose Lodge"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          maxLength={200}
          autoFocus
        />
        <Input
          label="Amount ($)"
          type="number"
          step="0.01"
          min="0.01"
          max="10000"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />

        <div>
          <label className="text-sm font-medium text-stone-700 block mb-2">Split type</label>
          <div className="bg-stone-100 rounded-xl p-1 flex gap-1">
            {(['equal', 'exact', 'percentage'] as SplitType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setSplitType(t)}
                className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize
                  ${splitType === t
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'text-stone-500 hover:text-stone-700'
                  }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-stone-700 block mb-2">Split between</label>
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id={`member-${m.id}`}
                  checked={selectedIds.includes(m.id)}
                  onChange={() => toggleMember(m.id)}
                  className="rounded border-stone-300 text-orange-500 focus:ring-orange-500"
                  aria-label={m.displayName}
                />
                <label htmlFor={`member-${m.id}`} className="flex-1 text-sm text-stone-700">
                  {m.displayName} {m.id === currentMemberId && <span className="text-stone-400">(you)</span>}
                </label>
                {splitType === 'exact' && selectedIds.includes(m.id) && (
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={exactAmounts[m.id] ?? ''}
                    onChange={(e) => setExactAmounts((prev) => ({ ...prev, [m.id]: e.target.value }))}
                    className="w-24 rounded-lg border border-stone-200 px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="$0.00"
                    aria-label={`Amount for ${m.displayName}`}
                  />
                )}
                {splitType === 'percentage' && selectedIds.includes(m.id) && (
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    value={percentages[m.id] ?? ''}
                    onChange={(e) => setPercentages((prev) => ({ ...prev, [m.id]: e.target.value }))}
                    className="w-20 rounded-lg border border-stone-200 px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="0%"
                    aria-label={`Percentage for ${m.displayName}`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" loading={loading} className="flex-1">
            {isEditing ? 'Save changes' : 'Add expense'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
