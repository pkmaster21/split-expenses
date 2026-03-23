import { describe, it, expect } from 'vitest';
import { simplifyDebts } from '../services/debt.js';

describe('simplifyDebts', () => {
  it('2-person simple case', () => {
    const net = new Map([
      ['alice', 5000],
      ['bob', -5000],
    ]);
    const settlements = simplifyDebts(net);
    expect(settlements).toHaveLength(1);
    expect(settlements[0]).toEqual({ from: 'bob', to: 'alice', amountCents: 5000 });
  });

  it('3-person uneven balances', () => {
    const net = new Map([
      ['alice', 8000],
      ['bob', -5000],
      ['carol', -3000],
    ]);
    const settlements = simplifyDebts(net);
    const totalPaid = settlements.reduce((sum, s) => sum + s.amountCents, 0);
    expect(totalPaid).toBe(8000);
    expect(settlements.every((s) => s.amountCents > 0)).toBe(true);
  });

  it('everyone owes equally (zero-sum, 0 transactions)', () => {
    const net = new Map([
      ['alice', 0],
      ['bob', 0],
      ['carol', 0],
    ]);
    const settlements = simplifyDebts(net);
    expect(settlements).toHaveLength(0);
  });

  it('single person paid everything', () => {
    const net = new Map([
      ['alice', 9000],
      ['bob', -3000],
      ['carol', -3000],
      ['dave', -3000],
    ]);
    const settlements = simplifyDebts(net);
    expect(settlements).toHaveLength(3);
    expect(settlements.every((s) => s.to === 'alice')).toBe(true);
    expect(settlements.every((s) => s.amountCents === 3000)).toBe(true);
  });

  it('large group (10+ people), verify transaction count minimized', () => {
    const n = 10;
    const net = new Map<string, number>();
    for (let i = 0; i < n; i++) {
      net.set(`person_${i}`, i % 2 === 0 ? 1000 : -1000);
    }
    const settlements = simplifyDebts(net);
    expect(settlements.length).toBeLessThanOrEqual(n - 1);
    const totalIn = settlements.reduce((sum, s) => sum + s.amountCents, 0);
    const totalOwed = [...net.values()].filter((v) => v > 0).reduce((a, b) => a + b, 0);
    expect(totalIn).toBe(totalOwed);
  });
});
