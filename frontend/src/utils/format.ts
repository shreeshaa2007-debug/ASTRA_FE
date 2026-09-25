// The backend's costs are in one MVP cost unit with no currency peg (see
// backend/config/compliance_rules.yaml). We never invent a currency symbol here.
export const COST_UNIT = 'cost units';

export function fmtNumber(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return value.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function fmtCost(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${fmtNumber(value, digits)} ${COST_UNIT}`;
}

export function fmtPct(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${value.toFixed(digits)}%`;
}

export function fmtShare(fraction: number | null | undefined, digits = 1): string {
  if (fraction === null || fraction === undefined || Number.isNaN(fraction)) return '—';
  return `${(fraction * 100).toFixed(digits)}%`;
}

export function fmtDays(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${value.toFixed(digits)} d`;
}

export function fmtMs(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${Math.round(value)}ms`;
}

export function fmtTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().slice(11, 19);
}

export function titleCase(snake: string): string {
  return snake.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
