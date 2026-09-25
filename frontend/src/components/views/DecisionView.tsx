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

const FACTOR_BORDERS = ['border-[#ffb4ab]', 'border-[#89ceff]', 'border-[#4edea3]', 'border-[#ffb95f]'];

const Header: React.FC<{ d?: DecisionResponse; onNavigate: (v: ViewMode) => void }> = ({ d, onNavigate }) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#3e4850]">
    <div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="px-2 py-0.5 bg-[#00a572]/20 text-[#4edea3] text-[10px] font-mono font-bold rounded">EXPLAINABLE PLAN</span>
        <span className="text-[11px] font-mono text-[#88929b]">
          {d ? `${d.label} · simulation ${d.simulation_id} · v${d.version}` : 'Constraint-verified optimizer output'}
        </span>
      </div>
      <h1 className="text-2xl sm:text-3xl font-headline font-bold text-white tracking-tight mt-1">AI Decision Center</h1>
      <p className="text-sm font-body text-[#bec8d2] mt-0.5">
        What the optimizer chose, what it was never offered, why, and which constraints shaped the answer.
      </p>
    </div>
    <button
      onClick={() => onNavigate('compliance')}
      className="px-4 py-2 bg-[#0ea5e9] hover:bg-[#89ceff] hover:text-[#00344d] text-white font-headline text-xs font-bold rounded flex items-center gap-2 transition-all shadow-md shadow-[#0ea5e9]/20"
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
        <div className="p-6 bg-[#131b2e] border border-[#3e4850] rounded-lg text-sm font-body text-[#bec8d2] space-y-2">
          <p>Simulation <span className="font-mono text-white">{simulationId}</span> has not produced a plan{status ? ` (status ${status.status}${status.run?.outcome ? `, ${status.run.outcome.outcome}` : ''})` : ''}.</p>
          {status?.run?.outcome?.message && <p className="text-[#88929b]">{status.run.outcome.message}</p>}
          <button onClick={() => onNavigate('simulator')} className="px-3 py-1.5 border border-[#3e4850] hover:bg-[#222a3d] rounded text-xs font-mono text-[#89ceff]">
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
      <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-[#bec8d2]">
        <span className="flex items-center gap-1.5">Plan <StatusPill value={d.plan_status} /></span>
        {d.compliance && <span className="flex items-center gap-1.5">Compliance <StatusPill value={d.compliance.status} /></span>}
        <span className="flex items-center gap-1.5">Approval <StatusPill value={d.approval.status} /></span>
        <span className="text-[#88929b]">product {d.product_id}</span>
        {d.replan_count > 0 && <span className="text-[#ffb95f]">replanned {d.replan_count}×</span>}
      </div>

      {/* Disruption and exclusions vs. the recommended plan */}
      <div className="bg-[#131b2e] border border-[#3e4850] rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#3e4850] pb-3">
          <h2 className="text-lg font-headline font-bold text-white">The situation and the response</h2>
          <span className="text-xs font-mono text-[#88929b]">{fmtNumber(unitsProcured)} units procured · {fmtNumber(unitsTransferred)} transferred</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="p-4 bg-[#060e20] rounded-lg border border-[#93000a] space-y-3">
            <span className="text-xs font-mono font-bold text-[#ffb4ab] uppercase flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#ffb4ab]"></span>
              WHAT THE SOLVER WAS NEVER OFFERED
            </span>
            {d.disruptions.map((e) => (
              <div key={e.event_id} className="p-3 bg-[#131b2e] rounded border border-[#3e4850] font-mono text-xs space-y-1">
                <div className="text-white font-bold">{titleCase(e.event_type)} — {e.location} <StatusPill value={e.severity} /></div>
                {e.summary && <div className="text-[#bec8d2] font-body">{e.summary}</div>}
              </div>
            ))}
            {d.excluded_options.length === 0 ? (
              <p className="text-xs font-body text-[#88929b]">Nothing was excluded from the problem.</p>
            ) : (
              <ul className="space-y-1.5 text-xs font-mono">
                {d.excluded_options.map((e) => (
                  <li key={`${e.kind}-${e.id}`} className="p-2 bg-[#131b2e] rounded border border-[#3e4850]/60">
                    <span className="text-[#ffb4ab] font-bold">{e.kind} {e.id}</span>
                    <span className="text-[#bec8d2] font-body block mt-0.5">{e.reason}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="p-4 bg-[#060e20] rounded-lg border-2 border-[#0ea5e9] space-y-3 shadow-xl shadow-[#0ea5e9]/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[#89ceff] uppercase flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${optimal ? 'bg-[#4edea3]' : 'bg-[#ffb4ab]'}`}></span>
                RECOMMENDED PLAN
              </span>
              <span className="px-2 py-0.5 bg-[#0ea5e9] text-[#00344d] text-[10px] font-mono font-bold rounded">{d.label.toUpperCase()}</span>
            </div>

            {!optimal ? (
              <div className="space-y-2">
                <p className="text-sm font-headline font-bold text-white">No feasible plan: {d.plan_status}</p>
                <p className="text-xs font-body text-[#bec8d2]">{d.message}</p>
                {Object.keys(d.diagnostics).length > 0 && <pre className="text-[10px] font-mono text-[#88929b] overflow-x-auto">{JSON.stringify(d.diagnostics, null, 2)}</pre>}
              </div>
            ) : (
              <>
                <div className="p-3 bg-[#131b2e] rounded border border-[#0ea5e9]/40 font-mono text-xs space-y-1.5">
                  {d.allocations.map((a, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-x-2 text-[#dae2fd]">
                      <span className="text-[#89ceff] font-bold">{a.supplier_id}</span>
                      <span className="text-[#88929b]">→</span>
                      <span>{a.route_id ?? 'no freight leg'}</span>
                      {a.transport_mode && <span className="text-[#88929b]">({a.transport_mode})</span>}
                      <span className="text-white font-bold ml-auto">{fmtNumber(a.quantity)} units</span>
                      <span className="text-[#88929b]">day {a.arrival_days.toFixed(1)}</span>
                    </div>
                  ))}
                  {d.transfers.map((t, i) => (
                    <div key={`t${i}`} className="flex flex-wrap items-center gap-x-2 text-[#dae2fd]">
                      <span className="text-[#ffb95f] font-bold">transfer</span>
                      <span>{t.from_warehouse} → {t.to_warehouse}</span>
                      <span className="text-white font-bold ml-auto">{fmtNumber(t.quantity)} units</span>
                    </div>
                  ))}
                  {d.allocations.length === 0 && d.transfers.length === 0 && <span className="text-[#88929b]">No purchases or transfers needed.</span>}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                  <div><span className="text-[#88929b] block text-[10px]">PLAN SPEND</span><span className="text-[#89ceff] font-bold">{fmtCost(d.plan_spend)}</span></div>
                  <div><span className="text-[#88929b] block text-[10px]">AVG ARRIVAL</span><span className="text-[#4edea3] font-bold">{fmtDays(d.avg_arrival_days)}</span></div>
                  <div><span className="text-[#88929b] block text-[10px]">ALL-IN UNIT COST</span><span className="text-white font-bold">{fmtNumber(d.avg_all_in_unit_cost, 2)}</span></div>
                  <div><span className="text-[#88929b] block text-[10px]">SUPPLIER RELIABILITY</span><span className="text-white font-bold">{fmtShare(d.weighted_reliability)}</span></div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Against normal operations and against doing nothing (Phase 17) */}
      <div className="bg-[#131b2e] border border-[#3e4850] rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#3e4850] pb-3">
          <h2 className="text-lg font-headline font-bold text-white">Compared with normal operations and with doing nothing</h2>
          <span className="text-xs font-mono text-[#88929b]">this simulation's disruption and its actual plan</span>
        </div>
        {comparison.error && <ErrorBlock error={comparison.error} onRetry={comparison.reload} />}
        {comparison.loading && !comparison.data && <LoadingBlock label="Solving the baseline and evaluating inaction…" />}
        {comparison.data && <ComparisonCards c={comparison.data} />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Why this plan */}
        <div className="lg:col-span-7 bg-[#131b2e] border border-[#3e4850] rounded-lg p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-[#3e4850] pb-3">
            <span className="material-symbols-outlined text-[#89ceff]">psychology</span>
            <h2 className="text-lg font-headline font-bold text-white">Why This Plan? Decision Rationale</h2>
          </div>

          <div className="space-y-3 text-xs font-body">
            {d.decision_factors.length === 0 && <p className="text-[#88929b]">The optimizer recorded no decision factors for this plan.</p>}
            {d.decision_factors.map((f, i) => (
              <div key={i} className={`p-3 bg-[#060e20] rounded border-l-4 ${FACTOR_BORDERS[i % FACTOR_BORDERS.length]}`}>
                <div className="font-headline font-bold text-white text-sm">{i + 1}. {f.factor}</div>
                <p className="text-[#bec8d2] mt-1">{f.detail}</p>
              </div>
            ))}
          </div>

          {d.deviations.length > 0 && (
            <div className="p-3.5 bg-[#060e20] rounded border border-[#3e4850] space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#88929b] block font-bold">Where the joint plan departs from an agent's own advice</span>
              {d.deviations.map((v, i) => (
                <div key={i} className="text-xs font-mono border-t border-[#3e4850]/50 pt-2 first:border-0 first:pt-0">
                  <div className="text-white"><span className="text-[#ffb95f] font-bold uppercase">{v.agent}</span> recommended <span className="text-[#89ceff]">{v.recommended}</span>; plan: <span className="text-[#4edea3]">{v.planned}</span></div>
                  <p className="text-[#88929b] font-body mt-0.5">{v.reason}</p>
                </div>
              ))}
            </div>
          )}

          <details className="p-3.5 bg-[#060e20] rounded border border-[#3e4850]">
            <summary className="text-[11px] font-mono uppercase tracking-wider text-[#88929b] font-bold cursor-pointer">Modeling assumptions and known limits ({d.assumptions.length})</summary>
            <ul className="mt-2 space-y-1.5 text-[11px] font-body text-[#bec8d2] list-disc pl-4">
              {d.assumptions.map((a, i) => <li key={i}>{a}</li>)}
            </ul>
          </details>
        </div>

        {/* Objective and constraints */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#131b2e] border border-[#3e4850] rounded-lg p-5 space-y-3">
            <div className="flex items-center gap-2 text-white font-headline font-bold text-sm">
              <span className="material-symbols-outlined text-[#89ceff]">functions</span>
              <span>Objective</span>
            </div>
            {optimal ? (
              <>
                <div className="text-[11px] font-mono text-[#89ceff]">minimize total cost = {Object.keys(d.objective_terms).map((k) => titleCase(k)).join(' + ') || '—'}</div>
                <div className="space-y-1.5 text-xs font-mono">
                  {Object.entries(d.objective_terms).map(([k, v]) => (
                    <div key={k} className="p-2 bg-[#060e20] rounded border border-[#3e4850]/50">
                      <div className="flex justify-between"><span className="text-[#bec8d2]">{titleCase(k)}</span><span className="text-white font-bold">{fmtNumber(v)}</span></div>
                      <div className="w-full bg-[#1e293b] h-1 rounded-full overflow-hidden mt-1">
                        <div className="bg-[#89ceff] h-full" style={{ width: `${objectiveTotal > 0 ? (v / objectiveTotal) * 100 : 0}%` }}></div>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between pt-1"><span className="text-[#88929b]">Objective value</span><span className="text-[#89ceff] font-bold">{fmtCost(d.objective_value)}</span></div>
                </div>
              </>
            ) : (
              <p className="text-xs font-body text-[#88929b]">No objective value: the problem has no feasible solution.</p>
            )}
            <div className="text-[10px] font-mono text-[#88929b]">
              {d.label} ({d.engine}) · solver: {Object.entries(d.solver).map(([k, v]) => `${k}=${String(v)}`).join(', ') || 'n/a'}
            </div>
          </div>

          <div className="bg-[#131b2e] border border-[#3e4850] rounded-lg p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-headline font-bold text-white flex items-center gap-2">
                <span className={`material-symbols-outlined text-[18px] ${failed.length === 0 ? 'text-[#4edea3]' : 'text-[#ffb4ab]'}`}>fact_check</span>
                <span>Constraint Verification</span>
              </h3>
              <span className="text-[11px] font-mono text-[#bec8d2]">
                {d.constraints.length - failed.length}/{d.constraints.length} satisfied · {d.binding_constraints.length} binding
              </span>
            </div>
            <p className="text-[11px] font-body text-[#88929b]">Each plan is re-checked by an independent validator before it is returned. Binding constraints have no slack left — they shaped the answer.</p>
            <div className="space-y-2 text-xs font-mono max-h-[360px] overflow-y-auto pr-1">
              {shownConstraints.map((c) => (
                <div key={c.name} className={`p-2 bg-[#060e20] rounded border ${c.satisfied ? 'border-[#3e4850]/50' : 'border-[#ffb4ab]'}`} title={c.detail}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[#bec8d2] truncate">{c.name}</span>
                    <span className={`font-bold whitespace-nowrap ${c.satisfied ? 'text-[#4edea3]' : 'text-[#ffb4ab]'}`}>
                      {fmtNumber(c.value, 1)} {c.sense} {fmtNumber(c.bound, 1)}
                    </span>
                  </div>
                  <div className="text-[10px] text-[#88929b] mt-0.5">{c.category}{c.binding ? ' · binding' : ''}</div>
                </div>
              ))}
              {shownConstraints.length === 0 && <p className="text-[#88929b]">No binding or violated constraints.</p>}
            </div>
            <button onClick={() => setShowAllConstraints((v) => !v)} className="text-[11px] font-mono text-[#89ceff] hover:underline">
              {showAllConstraints ? 'Show only binding / violated' : `Show all ${d.constraints.length}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
