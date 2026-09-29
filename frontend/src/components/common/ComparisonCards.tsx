import React from 'react';
import { CaseSummary, ScenarioComparison } from '../../types/api';
import { StatusPill } from './StateNotice';
import { fmtCost, fmtDays, fmtNumber, fmtPct } from '../../utils/format';

type Tone = 'base' | 'bad' | 'good';

const TONE: Record<Tone, { border: string; tag: string; label: string }> = {
  base: { border: '', tag: 'bg-raised text-ink-2', label: 'BASELINE' },
  bad: { border: 'border border-danger/40', tag: 'bg-danger-soft text-danger', label: 'DO NOTHING' },
  good: { border: 'border-2 border-primary shadow-xl shadow-primary/10', tag: 'bg-primary text-white', label: 'OPTIMIZED RESPONSE' },
};

const Row: React.FC<{ label: string; value: React.ReactNode; hint?: string; emphasis?: 'bad' | 'good' | 'warn' }> = ({ label, value, hint, emphasis }) => (
  <div className="flex justify-between gap-3 border-b border-line pb-1.5" title={hint}>
    <span className="text-muted">{label}</span>
    <span className={`font-bold text-right ${emphasis === 'bad' ? 'text-danger' : emphasis === 'good' ? 'text-success' : emphasis === 'warn' ? 'text-warning' : 'text-ink'}`}>{value}</span>
  </div>
);

const modes = (c: CaseSummary) =>
  Object.entries(c.mode_split).length === 0 ? '—' : Object.entries(c.mode_split).map(([m, s]) => `${m} ${fmtNumber(s.units)}`).join(' · ');

const CaseCard: React.FC<{ c: CaseSummary; tone: Tone; index: number; subtitle: string }> = ({ c, tone, index, subtitle }) => {
  const t = TONE[tone];
  const unavailable = c.status === 'NOT_AVAILABLE' || c.status === 'INFEASIBLE' || c.status === 'ERROR';
  return (
    <div className={`p-5 rounded-2xl bg-card shadow-card ${t.border} flex flex-col justify-between space-y-4`}>
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-line pb-2">
          <span className="text-[10px] font-mono uppercase text-muted font-bold">CASE 0{index}</span>
          <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-lg ${t.tag}`}>{t.label}</span>
        </div>
        <div>
          <h3 className="text-lg font-headline font-bold text-ink">{c.case === 'baseline' ? 'Normal operations' : c.case === 'unmitigated' ? 'Disruption, no response' : 'Disruption, optimized response'}</h3>
          <p className="text-xs font-body text-muted mt-0.5">{subtitle}</p>
        </div>

        {unavailable ? (
          <div className="p-3 bg-inset rounded-lg border border-warning/40 text-xs font-body text-ink-2 space-y-1.5">
            <StatusPill value={c.status} />
            <p>{c.message}</p>
          </div>
        ) : (
          <div className="space-y-2.5 pt-1 font-mono text-xs">
            <Row label="Total spend" value={fmtCost(c.spend)} hint="procurement + tariff + freight + transfers, in MVP cost units" />
            <Row label="Cost per delivered unit" value={fmtNumber(c.cost_per_unit, 2)} hint="spend ÷ units delivered: comparable across cases that deliver different volumes" />
            <Row label="Units delivered" value={fmtNumber(c.units_delivered)} />
            <Row label="Units that never arrive" value={fmtNumber(c.units_short)} emphasis={(c.units_short ?? 0) > 0 ? 'bad' : undefined} />
            <Row label="Average arrival" value={fmtDays(c.avg_arrival_days)} />
            <Row label="Stock-out units (end of horizon)" value={fmtNumber(c.stockout_units)} emphasis={(c.stockout_units ?? 0) > 0 ? 'bad' : undefined} hint="demand no warehouse can serve at the end of the planning horizon" />
            <Row
              label="Warehouses below safety stock"
              value={c.warehouses_below_safety.length ? `${c.warehouses_below_safety.join(', ')} (${fmtNumber(c.below_safety_units)} units)` : 'none'}
              emphasis={c.warehouses_below_safety.length ? 'warn' : 'good'}
            />
            <div className="flex justify-between gap-3 pt-0.5">
              <span className="text-muted">Freight mode</span>
              <span className="text-ink-2 text-[11px] text-right">{modes(c)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// The three-way comparison (backend/simulation/comparison.py). Every figure is computed from the
// plan the optimizer would choose in normal conditions — a modeled counterfactual, not shipment
// records — and costs are in the MVP's cost unit. Shortfalls are units, never converted to money.
export const ComparisonCards: React.FC<{ c: ScenarioComparison; showAssumptions?: boolean }> = ({ c, showAssumptions = true }) => {
  const d = c.deltas;
  const changes = [
    ...c.newly_disrupted_routes.map((r) => `route ${r}`),
    ...c.newly_disrupted_suppliers.map((s) => `supplier ${s}`),
    ...c.tariff_changes.map((t) => `${t.iso3} tariff ${fmtPct(t.baseline_pct, 2)} → ${fmtPct(t.scenario_pct, 2)}`),
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-ink-2">
        <span className="text-muted uppercase text-[10px]">What changes:</span>
        {changes.length === 0 && <span className="text-muted">nothing that touches the network (no route, supplier or tariff change)</span>}
        {changes.map((x) => (
          <span key={x} className="px-2 py-0.5 bg-inset border border-line rounded-lg text-warning">{x}</span>
        ))}
        <span className="ml-auto text-muted">product {c.product_id} · {c.engine_label}</span>
      </div>

      {c.warnings.map((w) => (
        <div key={w} className="p-3 bg-card border border-warning/60 rounded-lg text-xs font-body text-warning">{w}</div>
      ))}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <CaseCard c={c.baseline} tone="base" index={1} subtitle="The plan the optimizer would choose with no disruption" />
        <CaseCard c={c.unmitigated} tone="bad" index={2} subtitle="That same plan, left as it is when the disruption hits" />
        <CaseCard c={c.mitigated} tone="good" index={3} subtitle="The optimizer's plan for the disrupted network" />
      </div>

      {/* what the response buys */}
      <div className="bg-card border-2 border-success/70 rounded-2xl p-5 space-y-3 shadow-card">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-success text-[20px]">balance</span>
          <span className="text-xs font-mono font-bold uppercase text-success">What the response costs and what it buys</span>
        </div>
        {d.mitigation_cost === null && d.units_protected === null ? (
          <p className="text-sm font-body text-ink-2">There is no feasible plan to compare, so there is nothing to price. {c.baseline.status === 'INFEASIBLE' ? c.baseline.message : c.mitigated.message}</p>
        ) : (
          <>
            <h2 className="text-xl sm:text-2xl font-headline font-bold text-ink">
              {d.units_protected !== null && d.units_protected > 0 ? `${fmtNumber(d.units_protected)} units secured` : 'Nothing lost to protect'}
              {d.mitigation_cost !== null && ` for ${d.mitigation_cost >= 0 ? '+' : ''}${fmtCost(d.mitigation_cost)}`}
              {d.mitigation_cost_pct !== null && <span className="text-muted text-base font-mono"> ({d.mitigation_cost_pct >= 0 ? '+' : ''}{d.mitigation_cost_pct}% vs. normal)</span>}
            </h2>
            <p className="text-xs font-body text-ink-2 max-w-3xl leading-relaxed">
              {c.exposure && c.exposure.shipments_at_risk > 0
                ? `The disruption invalidates ${c.exposure.shipments_at_risk} shipment${c.exposure.shipments_at_risk === 1 ? '' : 's'} of the baseline plan: ${fmtNumber(c.exposure.units_at_risk)} units the plan priced at ${fmtCost(c.exposure.value_at_risk)}. Left alone, they never arrive. `
                : 'The disruption invalidates no shipment of the baseline plan. '}
              {d.avg_arrival_delta_days !== null && `The response changes the average arrival by ${d.avg_arrival_delta_days >= 0 ? '+' : ''}${d.avg_arrival_delta_days.toFixed(2)} days. `}
              A shortfall is shown in units, not money: the model has no stock-out penalty, so none is invented.
            </p>
          </>
        )}

        {c.exposure && c.exposure.shipments.length > 0 && (
          <div className="overflow-x-auto pt-1">
            <table className="w-full text-left font-mono text-xs">
              <thead className="text-muted text-[10px] uppercase border-b border-line">
                <tr>
                  <th className="p-2">At-risk shipment (baseline plan)</th>
                  <th className="p-2">Route</th>
                  <th className="p-2 text-right">Units</th>
                  <th className="p-2 text-right">Value</th>
                  <th className="p-2">Why</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-ink-2">
                {c.exposure.shipments.map((s, i) => (
                  <tr key={i}>
                    <td className="p-2 font-bold text-ink">{s.supplier_id}</td>
                    <td className="p-2">{s.route_id ?? 'no freight leg'}{s.transport_mode ? ` (${s.transport_mode})` : ''}</td>
                    <td className="p-2 text-right tabular-nums">{fmtNumber(s.quantity)}</td>
                    <td className="p-2 text-right tabular-nums">{fmtNumber(s.value)}</td>
                    <td className="p-2 text-danger">{s.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAssumptions && (
        <details className="bg-inset rounded-lg border border-line p-3.5">
          <summary className="text-[11px] font-mono uppercase tracking-wider text-muted font-bold cursor-pointer">How these numbers are made ({c.assumptions.length} assumptions)</summary>
          <ul className="mt-2 space-y-1.5 text-[11px] font-body text-ink-2 list-disc pl-4">
            {c.assumptions.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </details>
      )}
    </div>
  );
};
