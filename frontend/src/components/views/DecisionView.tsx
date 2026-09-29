import React, { useState } from 'react';
import { ApiError, getDecision, getSimulationComparison } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import { useSimulation } from '../../context/SimulationContext';
import { ErrorBlock, LoadingBlock, NoSimulationNotice, StatusPill } from '../common/StateNotice';
import { ComparisonCards } from '../common/ComparisonCards';
import { ViewMode } from '../../types';
import { DecisionResponse } from '../../types/api';
import { fmtCost, fmtDays, fmtNumber, fmtShare, titleCase } from '../../utils/format';

interface DecisionViewProps {
  onNavigate: (view: ViewMode) => void;
}

const FACTOR_BORDERS = ['border-danger', 'border-primary', 'border-success', 'border-warning'];

const Header: React.FC<{ d?: DecisionResponse; onNavigate: (v: ViewMode) => void }> = ({ d, onNavigate }) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-line">
    <div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="px-2 py-0.5 bg-success/10 text-success text-[10px] font-mono font-bold rounded-lg">EXPLAINABLE PLAN</span>
        <span className="text-[11px] font-mono text-muted">
          {d ? `${d.label} · simulation ${d.simulation_id} · v${d.version}` : 'Constraint-verified optimizer output'}
        </span>
      </div>
      <h1 className="text-2xl sm:text-3xl font-headline font-bold text-ink tracking-tight mt-1">AI Decision Center</h1>
      <p className="text-sm font-body text-ink-2 mt-0.5">
        What the optimizer chose, what it was never offered, why, and which constraints shaped the answer.
      </p>
    </div>
    <button
      onClick={() => onNavigate('compliance')}
      className="px-4 py-2 bg-primary hover:bg-primary-strong text-white font-headline text-xs font-bold rounded-lg flex items-center gap-2 transition-all shadow-md shadow-primary/20"
    >
      <span>Review &amp; Authorize Plan</span>
      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
    </button>
  </div>
);

export const DecisionView: React.FC<DecisionViewProps> = ({ onNavigate }) => {
  const { simulationId, status } = useSimulation();
  const decision = useFetch(() => getDecision(simulationId!), [simulationId], !!simulationId, [status?.version]);
  const comparison = useFetch(() => getSimulationComparison(simulationId!), [simulationId], !!simulationId && !!decision.data, [status?.version]);
  const [showAllConstraints, setShowAllConstraints] = useState(false);

  if (!simulationId) {
    return (
      <div className="space-y-6">
        <Header onNavigate={onNavigate} />
        <NoSimulationNotice onNavigate={onNavigate} what="A decision explanation" />
      </div>
    );
  }

  const notReady = decision.error instanceof ApiError && decision.error.code === 'PLAN_NOT_READY';
  const d = decision.data;

  if (decision.loading && !d) {
    return (
      <div className="space-y-6">
        <Header onNavigate={onNavigate} />
        <LoadingBlock label="Loading the plan…" />
      </div>
    );
  }
  if (notReady) {
    return (
      <div className="space-y-6">
        <Header onNavigate={onNavigate} />
        <div className="p-6 bg-card rounded-2xl text-sm font-body text-ink-2 space-y-2 shadow-card">
          <p>Simulation <span className="font-mono text-ink">{simulationId}</span> has not produced a plan{status ? ` (status ${status.status}${status.run?.outcome ? `, ${status.run.outcome.outcome}` : ''})` : ''}.</p>
          {status?.run?.outcome?.message && <p className="text-muted">{status.run.outcome.message}</p>}
          <button onClick={() => onNavigate('simulator')} className="px-3 py-1.5 border border-line hover:bg-raised rounded-lg text-xs font-mono text-primary">
            Back to the simulator
          </button>
        </div>
      </div>
    );
  }
  if (decision.error || !d) {
    return (
      <div className="space-y-6">
        <Header onNavigate={onNavigate} />
        {decision.error && <ErrorBlock error={decision.error} onRetry={decision.reload} />}
      </div>
    );
  }

  const optimal = d.plan_status === 'OPTIMAL';
  const unitsProcured = d.allocations.reduce((n, a) => n + a.quantity, 0);
  const unitsTransferred = d.transfers.reduce((n, t) => n + t.quantity, 0);
  const failed = d.constraints.filter((c) => !c.satisfied);
  const shownConstraints = showAllConstraints ? d.constraints : d.constraints.filter((c) => c.binding || !c.satisfied);
  const objectiveTotal = Object.values(d.objective_terms).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <Header d={d} onNavigate={onNavigate} />

      {/* status strip */}
      <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-ink-2">
        <span className="flex items-center gap-1.5">Plan <StatusPill value={d.plan_status} /></span>
        {d.compliance && <span className="flex items-center gap-1.5">Compliance <StatusPill value={d.compliance.status} /></span>}
        <span className="flex items-center gap-1.5">Approval <StatusPill value={d.approval.status} /></span>
        <span className="text-muted">product {d.product_id}</span>
        {d.replan_count > 0 && <span className="text-warning">replanned {d.replan_count}×</span>}
      </div>

      {/* Disruption and exclusions vs. the recommended plan */}
      <div className="bg-card rounded-2xl p-5 space-y-4 shadow-card">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <h2 className="text-lg font-headline font-bold text-ink">The situation and the response</h2>
          <span className="text-xs font-mono text-muted">{fmtNumber(unitsProcured)} units procured · {fmtNumber(unitsTransferred)} transferred</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="p-4 bg-inset rounded-2xl border border-danger/40 space-y-3">
            <span className="text-xs font-mono font-bold text-danger uppercase flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-danger"></span>
              WHAT THE SOLVER WAS NEVER OFFERED
            </span>
            {d.disruptions.map((e) => (
              <div key={e.event_id} className="p-3 bg-card rounded-lg border border-line font-mono text-xs space-y-1">
                <div className="text-ink font-bold">{titleCase(e.event_type)} — {e.location} <StatusPill value={e.severity} /></div>
                {e.summary && <div className="text-ink-2 font-body">{e.summary}</div>}
              </div>
            ))}
            {d.excluded_options.length === 0 ? (
              <p className="text-xs font-body text-muted">Nothing was excluded from the problem.</p>
            ) : (
              <ul className="space-y-1.5 text-xs font-mono">
                {d.excluded_options.map((e) => (
                  <li key={`${e.kind}-${e.id}`} className="p-2 bg-card rounded-lg border border-line">
                    <span className="text-danger font-bold">{e.kind} {e.id}</span>
                    <span className="text-ink-2 font-body block mt-0.5">{e.reason}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="p-4 bg-inset rounded-2xl border-2 border-primary space-y-3 shadow-xl shadow-primary/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-primary uppercase flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${optimal ? 'bg-success' : 'bg-danger'}`}></span>
                RECOMMENDED PLAN
              </span>
              <span className="px-2 py-0.5 bg-primary text-white text-[10px] font-mono font-bold rounded-lg">{d.label.toUpperCase()}</span>
            </div>

            {!optimal ? (
              <div className="space-y-2">
                <p className="text-sm font-headline font-bold text-ink">No feasible plan: {d.plan_status}</p>
                <p className="text-xs font-body text-ink-2">{d.message}</p>
                {Object.keys(d.diagnostics).length > 0 && <pre className="text-[10px] font-mono text-muted overflow-x-auto">{JSON.stringify(d.diagnostics, null, 2)}</pre>}
              </div>
            ) : (
              <>
                <div className="p-3 bg-card rounded-lg border border-primary/40 font-mono text-xs space-y-1.5">
                  {d.allocations.map((a, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-x-2 text-ink">
                      <span className="text-primary font-bold">{a.supplier_id}</span>
                      <span className="text-muted">→</span>
                      <span>{a.route_id ?? 'no freight leg'}</span>
                      {a.transport_mode && <span className="text-muted">({a.transport_mode})</span>}
                      <span className="text-ink font-bold ml-auto">{fmtNumber(a.quantity)} units</span>
                      <span className="text-muted">day {a.arrival_days.toFixed(1)}</span>
                    </div>
                  ))}
                  {d.transfers.map((t, i) => (
                    <div key={`t${i}`} className="flex flex-wrap items-center gap-x-2 text-ink">
                      <span className="text-warning font-bold">transfer</span>
                      <span>{t.from_warehouse} → {t.to_warehouse}</span>
                      <span className="text-ink font-bold ml-auto">{fmtNumber(t.quantity)} units</span>
                    </div>
                  ))}
                  {d.allocations.length === 0 && d.transfers.length === 0 && <span className="text-muted">No purchases or transfers needed.</span>}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                  <div><span className="text-muted block text-[10px]">PLAN SPEND</span><span className="text-primary font-bold">{fmtCost(d.plan_spend)}</span></div>
                  <div><span className="text-muted block text-[10px]">AVG ARRIVAL</span><span className="text-success font-bold">{fmtDays(d.avg_arrival_days)}</span></div>
                  <div><span className="text-muted block text-[10px]">ALL-IN UNIT COST</span><span className="text-ink font-bold">{fmtNumber(d.avg_all_in_unit_cost, 2)}</span></div>
                  <div><span className="text-muted block text-[10px]">SUPPLIER RELIABILITY</span><span className="text-ink font-bold">{fmtShare(d.weighted_reliability)}</span></div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Against normal operations and against doing nothing (Phase 17) */}
      <div className="bg-card rounded-2xl p-5 space-y-4 shadow-card">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <h2 className="text-lg font-headline font-bold text-ink">Compared with normal operations and with doing nothing</h2>
          <span className="text-xs font-mono text-muted">this simulation's disruption and its actual plan</span>
        </div>
        {comparison.error && <ErrorBlock error={comparison.error} onRetry={comparison.reload} />}
        {comparison.loading && !comparison.data && <LoadingBlock label="Solving the baseline and evaluating inaction…" />}
        {comparison.data && <ComparisonCards c={comparison.data} />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Why this plan */}
        <div className="lg:col-span-7 bg-card rounded-2xl p-5 space-y-4 shadow-card">
          <div className="flex items-center gap-2 border-b border-line pb-3">
            <span className="material-symbols-outlined text-primary">psychology</span>
            <h2 className="text-lg font-headline font-bold text-ink">Why This Plan? Decision Rationale</h2>
          </div>

          <div className="space-y-3 text-xs font-body">
            {d.decision_factors.length === 0 && <p className="text-muted">The optimizer recorded no decision factors for this plan.</p>}
            {d.decision_factors.map((f, i) => (
              <div key={i} className={`p-3 bg-inset rounded-lg border-l-4 ${FACTOR_BORDERS[i % FACTOR_BORDERS.length]}`}>
                <div className="font-headline font-bold text-ink text-sm">{i + 1}. {f.factor}</div>
                <p className="text-ink-2 mt-1">{f.detail}</p>
              </div>
            ))}
          </div>

          {d.deviations.length > 0 && (
            <div className="p-3.5 bg-inset rounded-lg border border-line space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted block font-bold">Where the joint plan departs from an agent's own advice</span>
              {d.deviations.map((v, i) => (
                <div key={i} className="text-xs font-mono border-t border-line pt-2 first:border-0 first:pt-0">
                  <div className="text-ink"><span className="text-warning font-bold uppercase">{v.agent}</span> recommended <span className="text-primary">{v.recommended}</span>; plan: <span className="text-success">{v.planned}</span></div>
                  <p className="text-muted font-body mt-0.5">{v.reason}</p>
                </div>
              ))}
            </div>
          )}

          <details className="p-3.5 bg-inset rounded-lg border border-line">
            <summary className="text-[11px] font-mono uppercase tracking-wider text-muted font-bold cursor-pointer">Modeling assumptions and known limits ({d.assumptions.length})</summary>
            <ul className="mt-2 space-y-1.5 text-[11px] font-body text-ink-2 list-disc pl-4">
              {d.assumptions.map((a, i) => <li key={i}>{a}</li>)}
            </ul>
          </details>
        </div>

        {/* Objective and constraints */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-card rounded-2xl p-5 space-y-3 shadow-card">
            <div className="flex items-center gap-2 text-ink font-headline font-bold text-sm">
              <span className="material-symbols-outlined text-primary">functions</span>
              <span>Objective</span>
            </div>
            {optimal ? (
              <>
                <div className="text-[11px] font-mono text-primary">minimize total cost = {Object.keys(d.objective_terms).map((k) => titleCase(k)).join(' + ') || '—'}</div>
                <div className="space-y-1.5 text-xs font-mono">
                  {Object.entries(d.objective_terms).map(([k, v]) => (
                    <div key={k} className="p-2 bg-inset rounded-lg border border-line">
                      <div className="flex justify-between"><span className="text-ink-2">{titleCase(k)}</span><span className="text-ink font-bold">{fmtNumber(v)}</span></div>
                      <div className="w-full bg-raised h-1 rounded-full overflow-hidden mt-1">
                        <div className="bg-primary h-full" style={{ width: `${objectiveTotal > 0 ? (v / objectiveTotal) * 100 : 0}%` }}></div>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between pt-1"><span className="text-muted">Objective value</span><span className="text-primary font-bold">{fmtCost(d.objective_value)}</span></div>
                </div>
              </>
            ) : (
              <p className="text-xs font-body text-muted">No objective value: the problem has no feasible solution.</p>
            )}
            <div className="text-[10px] font-mono text-muted">
              {d.label} ({d.engine}) · solver: {Object.entries(d.solver).map(([k, v]) => `${k}=${String(v)}`).join(', ') || 'n/a'}
            </div>
          </div>

          <div className="bg-card rounded-2xl p-5 space-y-3 shadow-card">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-headline font-bold text-ink flex items-center gap-2">
                <span className={`material-symbols-outlined text-[18px] ${failed.length === 0 ? 'text-success' : 'text-danger'}`}>fact_check</span>
                <span>Constraint Verification</span>
              </h3>
              <span className="text-[11px] font-mono text-ink-2">
                {d.constraints.length - failed.length}/{d.constraints.length} satisfied · {d.binding_constraints.length} binding
              </span>
            </div>
            <p className="text-[11px] font-body text-muted">Each plan is re-checked by an independent validator before it is returned. Binding constraints have no slack left — they shaped the answer.</p>
            <div className="space-y-2 text-xs font-mono max-h-[360px] overflow-y-auto pr-1">
              {shownConstraints.map((c) => (
                <div key={c.name} className={`p-2 bg-inset rounded-lg border ${c.satisfied ? 'border-line' : 'border-danger'}`} title={c.detail}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-ink-2 truncate">{c.name}</span>
                    <span className={`font-bold whitespace-nowrap ${c.satisfied ? 'text-success' : 'text-danger'}`}>
                      {fmtNumber(c.value, 1)} {c.sense} {fmtNumber(c.bound, 1)}
                    </span>
                  </div>
                  <div className="text-[10px] text-muted mt-0.5">{c.category}{c.binding ? ' · binding' : ''}</div>
                </div>
              ))}
              {shownConstraints.length === 0 && <p className="text-muted">No binding or violated constraints.</p>}
            </div>
            <button onClick={() => setShowAllConstraints((v) => !v)} className="text-[11px] font-mono text-primary hover:underline">
              {showAllConstraints ? 'Show only binding / violated' : `Show all ${d.constraints.length}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
