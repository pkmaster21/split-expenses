import type { ExactSplitInput, PercentageSplitInput, SplitType } from '@tabby/shared';

interface SplitResult {
  memberId: string;
  amountCents: number;
}

export function computeEqualSplits(totalCents: number, memberIds: string[]): SplitResult[] {
  if (memberIds.length === 0) throw new Error('At least one member required');
  const base = Math.floor(totalCents / memberIds.length);
  const remainder = totalCents % memberIds.length;

  return memberIds.map((memberId, i) => ({
    memberId,
    amountCents: i < remainder ? base + 1 : base,
  }));
}

export function validateExactSplits(
  totalCents: number,
  splits: ExactSplitInput[],
): SplitResult[] {
  const sumCents = splits.reduce((acc, s) => acc + Math.round(s.amount * 100), 0);
  if (Math.abs(sumCents - totalCents) > 1) {
    throw new Error(
      `Exact splits sum (${sumCents}) must equal expense total (${totalCents}) ±1 cent`,
    );
  }
  return splits.map((s) => ({ memberId: s.memberId, amountCents: Math.round(s.amount * 100) }));
}

export function validatePercentageSplits(
  totalCents: number,
  splits: PercentageSplitInput[],
): SplitResult[] {
  const sumPct = splits.reduce((acc, s) => acc + s.percentage, 0);
  if (Math.abs(sumPct - 100) > 0.01) {
    throw new Error(`Percentage splits must sum to 100% (got ${sumPct}%)`);
  }

  const results: SplitResult[] = splits.map((s) => ({
    memberId: s.memberId,
    amountCents: Math.round((s.percentage / 100) * totalCents),
  }));

  const computedSum = results.reduce((acc, r) => acc + r.amountCents, 0);
  const diff = totalCents - computedSum;
  if (diff !== 0 && results[0]) {
    results[0].amountCents += diff;
  }

  return results;
}

export function computeSplits(
  totalCents: number,
  splitType: SplitType,
  memberIds: string[],
  splits?: ExactSplitInput[] | PercentageSplitInput[],
): SplitResult[] {
  switch (splitType) {
    case 'equal':
      return computeEqualSplits(totalCents, memberIds);
    case 'exact':
      if (!splits || splits.length === 0) throw new Error('Exact splits required');
      return validateExactSplits(totalCents, splits as ExactSplitInput[]);
    case 'percentage':
      if (!splits || splits.length === 0) throw new Error('Percentage splits required');
      return validatePercentageSplits(totalCents, splits as PercentageSplitInput[]);
  }
}
