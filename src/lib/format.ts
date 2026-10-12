const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

export function formatNumber(n: number): string {
  return inr.format(Math.round(n));
}

export function formatINR(n: number): string {
  return `₹${formatNumber(n)}`;
}

export function formatPercent(share: number): string {
  const p = share * 100;
  return `${p >= 10 || Number.isInteger(p) ? Math.round(p) : p.toFixed(1)}%`;
}
