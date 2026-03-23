import type { Settlement } from '@tabby/shared';

export function simplifyDebts(netBalances: Map<string, number>): Settlement[] {
  const creditors: [string, number][] = [];
  const debtors: [string, number][] = [];

  for (const [id, balance] of netBalances) {
    if (balance > 0) creditors.push([id, balance]);
    else if (balance < 0) debtors.push([id, -balance]);
  }

  creditors.sort((a, b) => b[1] - a[1]);
  debtors.sort((a, b) => b[1] - a[1]);

  const settlements: Settlement[] = [];

  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const [creditorId, credit] = creditors[ci]!;
    const [debtorId, debt] = debtors[di]!;
    const amount = Math.min(credit, debt);

    settlements.push({ from: debtorId, to: creditorId, amountCents: amount });

    creditors[ci] = [creditorId, credit - amount];
    debtors[di] = [debtorId, debt - amount];

    if (creditors[ci]![1] === 0) ci++;
    if (debtors[di]![1] === 0) di++;
  }

  return settlements;
}

