import { describe, it, expect } from 'vitest';
import { computeEqualSplits, validateExactSplits, validatePercentageSplits } from '../services/splits.js';

describe('computeEqualSplits', () => {
  it('divides evenly', () => {
    const splits = computeEqualSplits(3000, ['alice', 'bob', 'carol']);
    expect(splits).toHaveLength(3);
    expect(splits.reduce((sum, s) => sum + s.amountCents, 0)).toBe(3000);
    expect(splits.every((s) => s.amountCents === 1000)).toBe(true);
  });

  it('distributes remainder cents', () => {
    const splits = computeEqualSplits(1001, ['alice', 'bob', 'carol']);
    const total = splits.reduce((sum, s) => sum + s.amountCents, 0);
    expect(total).toBe(1001);
  });

  it('throws for empty member list', () => {
    expect(() => computeEqualSplits(1000, [])).toThrow();
  });
});

describe('validateExactSplits', () => {
  it('accepts splits summing to total', () => {
    const splits = validateExactSplits(1000, [
      { memberId: 'alice', amount: 6 },
      { memberId: 'bob', amount: 4 },
    ]);
    expect(splits.reduce((sum, s) => sum + s.amountCents, 0)).toBe(1000);
  });

  it('rejects splits off by more than 1 cent', () => {
    expect(() =>
      validateExactSplits(1000, [
        { memberId: 'alice', amount: 6 },
        { memberId: 'bob', amount: 3.98 },
      ]),
    ).toThrow();
  });

  it('allows 1 cent tolerance', () => {
    expect(() =>
      validateExactSplits(1001, [
        { memberId: 'alice', amount: 5 },
        { memberId: 'bob', amount: 5 },
      ]),
    ).not.toThrow();
  });
});

describe('validatePercentageSplits', () => {
  it('converts percentages to amounts', () => {
    const splits = validatePercentageSplits(10000, [
      { memberId: 'alice', percentage: 75 },
      { memberId: 'bob', percentage: 25 },
    ]);
    const total = splits.reduce((sum, s) => sum + s.amountCents, 0);
    expect(total).toBe(10000);
    expect(splits.find((s) => s.memberId === 'alice')!.amountCents).toBe(7500);
    expect(splits.find((s) => s.memberId === 'bob')!.amountCents).toBe(2500);
  });

  it('rejects percentages not summing to 100', () => {
    expect(() =>
      validatePercentageSplits(10000, [
        { memberId: 'alice', percentage: 60 },
        { memberId: 'bob', percentage: 30 },
      ]),
    ).toThrow();
  });

  it('adjusts for rounding to ensure total matches', () => {
    const splits = validatePercentageSplits(333, [
      { memberId: 'alice', percentage: 33.34 },
      { memberId: 'bob', percentage: 33.33 },
      { memberId: 'carol', percentage: 33.33 },
    ]);
    const total = splits.reduce((sum, s) => sum + s.amountCents, 0);
    expect(total).toBe(333);
  });
});
