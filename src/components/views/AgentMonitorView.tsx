import React, { useState } from 'react';
import { getAgentsStatus } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import { useSimulation } from '../../context/SimulationContext';
import { ErrorBlock, LoadingBlock } from '../common/StateNotice';
import { OperationsPanel } from '../common/OperationsPanel';
import { ViewMode } from '../../types';
import { AgentStageStatus, CheckpointRecord } from '../../types/api';
import { fmtMs, fmtTime, titleCase } from '../../utils/format';

interface AgentMonitorViewProps {
  onNavigate: (view: ViewMode) => void;
}

// Static facts about each agent, from docs/agent-plan.md and the phase reports:
// the tools each one really has. What each agent *did* in a run is the API's `detail`.
const AGENT_META: Record<string, { step: string; role: string; engine: string; tools: string[] }> = {
  sensing: {
    step: '01',
    role: 'Reads a report; proposes a disruption event',
    engine: 'Gemini (gemini-2.5-flash) proposes; plain-Python validate_event() decides',
    tools: ['detect_disruption', 'classify_event', 'validate_event'],
  },
  inventory: {
    step: '02',
    role: 'Forecasts demand and flags stockout risk',
    engine: 'XGBoost demand model',
    tools: ['get_inventory', 'forecast_demand', 'calculate_stockout_risk', 'calculate_transfer_recommendation'],
  },
  logistics: {
    step: '03',
    role: 'Route capacity, cost, ETA and alternatives',
    engine: 'Deterministic route tools',
    tools: ['get_routes', 'check_route_capacity', 'calculate_transport_cost', 'calculate_eta', 'generate_alternative_routes'],
  },
  sourcing: {
    step: '04',
    role: 'Supplier capacity and landed cost incl. tariffs',
    engine: 'Deterministic greedy landed-cost allocation',
    tools: ['get_suppliers', 'check_supplier_capacity', 'calculate_supplier_cost', 'calculate_landed_cost', 'generate_supplier_options'],
  },
  optimization: {
    step: '05',
    role: 'Joint supplier × route × transfer plan',
    engine: 'HiGHS via scipy.optimize.linprog (Prototype Optimization)',
    tools: ['build_optimization_problem', 'optimize_supply_chain', 'validate_solution', 'get_optimization_metrics'],
  },
  compliance: {
    step: '06',
    role: 'Policy checks; may reject or escalate',
    engine: 'Deterministic rules (no LLM), config-driven',
    tools: ['check_supplier_policy', 'check_country_policy', 'check_route_policy', 'check_transaction_threshold', 'validate_plan'],
  },
  human_approval: {
    step: '07',
    role: 'A named human decides an escalated plan',
    engine: 'Human decision, recorded in the audit trail',
    tools: ['approve', 'reject'],
  },
};

const CHECKPOINT_TEXT: Record<string, string> = {
  simulation_created: 'Simulation created at the baseline network',
  simulation_reset: 'Simulation reset to its creation-time state',
  event_sensed: 'A validated disruption event entered the world state',
  agents_assessed: 'Inventory, Logistics and Sourcing assessments recorded',
  plan_optimized: 'The optimizer\'s plan was recorded',
  compliance_checked: 'The compliance verdict was recorded',
  approval_requested: 'The plan was escalated and is waiting for a human',
  plan_finalized: 'The plan was finalized',
  plan_rejected_by_human: 'A human rejected the plan',
  replan_requested: 'Compliance rejected the plan; a replan without the offenders was requested',
  run_failed: 'The run failed',
};

function statusStyle(s: AgentStageStatus): { badge: string; label: string } {
  switch (s) {
    case 'COMPLETE':
    case 'NOT_REQUIRED':
      return { badge: 'bg-success/10 text-success border-success/30', label: s === 'COMPLETE' ? 'Complete' : 'Not required' };
    case 'ACTION_REQUIRED':
      return { badge: 'bg-warning/10 text-warning border-warning/50', label: 'Action required' };
    case 'RUNNING':
      return { badge: 'bg-primary/10 text-primary border-primary/30 animate-pulse', label: 'Running' };
    case 'FAILED':
    case 'REJECTED':
      return { badge: 'bg-danger/10 text-danger border-danger/40', label: s === 'FAILED' ? 'Failed' : 'Rejected' };
    case 'NO_EVENT':
      return { badge: 'bg-warning/10 text-warning border-warning/50', label: 'No event' };
    default:
      return { badge: 'bg-raised text-muted border-line', label: 'Pending' };
  }
}

const eventBorder = (c: CheckpointRecord) =>
  c.checkpoint === 'run_failed' || c.checkpoint === 'plan_rejected_by_human'
    ? 'border-l-danger'
    : c.checkpoint === 'replan_requested' || c.checkpoint === 'approval_requested'
    ? 'border-l-warning'
    : c.checkpoint === 'plan_finalized'
    ? 'border-l-success'
    : 'border-l-primary';

export const AgentMonitorView: React.FC<AgentMonitorViewProps> = ({ onNavigate }) => {
  const { simulationId, status } = useSimulation();
  const feed = useFetch(() => getAgentsStatus(simulationId ?? undefined), [simulationId], true, [status?.version, status?.status, status?.run?.state]);
  const [selectedId, setSelectedId] = useState<string>('optimization');
  const [actorFilter, setActorFilter] = useState<string>('all');

  const data = feed.data;
  const agents = data?.agents ?? [];
  const timeline = [...(data?.timeline ?? [])].reverse();
  const actors = Array.from(new Set(timeline.map((t) => t.actor)));
  const shown = actorFilter === 'all' ? timeline : timeline.filter((t) => t.actor === actorFilter);
  const selected = agents.find((a) => a.id === selectedId) ?? agents[0];
  const meta = selected ? AGENT_META[selected.id] : undefined;
  const failing = agents.filter((a) => a.status === 'FAILED' || a.status === 'REJECTED').length;
  const active = agents.filter((a) => a.status === 'RUNNING').length;

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-line">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-mono font-bold rounded-lg">TECHNICAL OPERATIONS DECK</span>
            <span className="text-[11px] font-mono text-muted">Status is derived from the world state; the audit trail is its append-only checkpoint log</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-headline font-bold text-ink tracking-tight mt-1">Agent Monitor</h1>
          <p className="text-sm font-body text-ink-2 mt-0.5">
            Per-stage status, timing and the full checkpoint history for {data?.simulation_id ? <span className="font-mono text-ink">{data.simulation_id}</span> : 'the most recent simulation'}.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-inset border border-line rounded-lg text-xs font-mono">
          <span className={`h-2 w-2 rounded-full ${failing ? 'bg-danger' : active ? 'bg-primary animate-pulse' : 'bg-success'}`}></span>
          <span className="text-ink">{data?.simulation_id ? `${failing} failed · ${active} running · ${agents.length} stages` : 'No simulation yet'}</span>
        </div>
      </div>

      {feed.error && <ErrorBlock error={feed.error} onRetry={feed.reload} />}
      {feed.loading && !data && <LoadingBlock />}

      {data && !data.simulation_id && (
        <div className="p-4 bg-card rounded-2xl text-xs font-body text-ink-2 flex items-center justify-between gap-3 shadow-card">
          <span>No simulation exists yet, so every stage is pending and there is no audit trail.</span>
          <button onClick={() => onNavigate('simulator')} className="px-3 py-1.5 bg-primary hover:bg-primary-strong text-white font-headline text-xs font-bold rounded-lg transition-colors whitespace-nowrap">
            Open the Simulator
          </button>
        </div>
      )}

      {data?.run?.outcome && (
        <div className="p-3 bg-card rounded-2xl text-xs font-mono text-ink-2 shadow-card">
          Latest run <span className="text-ink">{data.run.run_id}</span> ended <span className="text-primary font-bold">{data.run.outcome.outcome}</span>
          {data.run.outcome.message ? <span className="font-body text-muted"> — {data.run.outcome.message}</span> : null}
        </div>
      )}

      {/* Agent roster */}
      {agents.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {agents.map((agent) => {
            const st = statusStyle(agent.status);
            const m = AGENT_META[agent.id];
            return (
              <div
                key={agent.id}
                onClick={() => setSelectedId(agent.id)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all duration-150 flex flex-col justify-between space-y-3 ${
                  agent.id === selected?.id ? 'bg-raised border-primary shadow-lg shadow-primary/10' : 'bg-card border-line hover:border-muted'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-muted">STEP {m?.step ?? '—'}</span>
                    <span className={`px-2 py-0.5 text-[9px] font-bold rounded-lg border ${st.badge}`}>{st.label}</span>
                  </div>
                  <h3 className="font-headline font-bold text-ink text-base mt-1.5">{agent.name}</h3>
                  <p className="text-[11px] font-body text-muted mt-0.5">{m?.role}</p>
                </div>
                <div className="pt-2 border-t border-line text-[11px] font-mono flex justify-between text-ink-2">
                  <span>Timing:</span>
                  <span className="text-success font-bold">{fmtMs(agent.latency_ms)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Selected agent */}
        {selected && (
          <div className="lg:col-span-5 bg-card rounded-2xl p-5 space-y-4 shadow-card">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <span className="text-[10px] font-mono text-muted uppercase">Stage inspection</span>
                <h3 className="text-base font-headline font-bold text-ink mt-0.5">{selected.name}</h3>
              </div>
              <span className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded-lg border ${statusStyle(selected.status).badge}`}>{statusStyle(selected.status).label}</span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <span className="text-muted block text-[10px]">WHAT IT REPORTED THIS RUN</span>
                <p className="text-ink font-body text-xs mt-1 leading-relaxed bg-inset p-3 rounded-lg border border-line">
                  {selected.detail || 'Nothing reported yet for this stage.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-line">
                <div>
                  <span className="text-muted block text-[10px]">ENGINE</span>
                  <span className="text-ink font-bold text-[11px] block mt-0.5">{meta?.engine ?? '—'}</span>
                </div>
                <div>
                  <span className="text-muted block text-[10px]">TIMING</span>
                  <span className="text-success font-bold text-[11px] block mt-0.5">{fmtMs(selected.latency_ms)}</span>
                  {['inventory', 'logistics', 'sourcing'].includes(selected.id) && (
                    <span className="text-muted text-[10px] block">the three run as one timed step</span>
                  )}
                </div>
              </div>

              {meta && (
                <div className="pt-2 border-t border-line">
                  <span className="text-muted block text-[10px] uppercase mb-1.5">TOOLS</span>
                  <div className="flex flex-wrap gap-1.5">
                    {meta.tools.map((tool) => (
                      <span key={tool} className="px-2 py-0.5 bg-inset text-primary border border-line rounded-lg text-[10px]">{tool}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Audit trail */}
        <div className={`${selected ? 'lg:col-span-7' : 'lg:col-span-12'} bg-card rounded-2xl p-5 space-y-4 shadow-card`}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
            <div>
              <h3 className="text-base font-headline font-bold text-ink">Audit trail</h3>
              <p className="text-[11px] font-mono text-muted">Every state change is a named checkpoint · newest first · {timeline.length} entries</p>
            </div>

            <div className="flex flex-wrap items-center gap-1 text-[10px] font-mono">
              {['all', ...actors].map((a) => (
                <button
                  key={a}
                  onClick={() => setActorFilter(a)}
                  className={`px-2 py-0.5 rounded-lg border ${actorFilter === a ? 'bg-raised border-primary text-primary' : 'text-muted border-line'}`}
                >
                  {a === 'all' ? 'All' : a}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {shown.length === 0 && <p className="text-xs font-body text-muted">No checkpoints recorded.</p>}
            {shown.map((c) => (
              <div key={`${c.version}-${c.checkpoint}`} className={`p-3 bg-inset rounded-lg border border-line border-l-4 ${eventBorder(c)} font-mono text-xs`}>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-ink font-bold">{c.checkpoint} <span className="text-muted font-normal">· {c.actor}</span></span>
                  <span className="text-muted">v{c.version} · {fmtTime(c.at)} UTC</span>
                </div>
                <p className="text-ink-2 text-[11px] font-body mt-1 leading-relaxed">{CHECKPOINT_TEXT[c.checkpoint] ?? titleCase(c.checkpoint)}</p>
                {c.changed_fields.length > 0 && <p className="text-[10px] text-muted mt-0.5">changed: {c.changed_fields.join(', ')}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <OperationsPanel refreshOn={[status?.version, status?.status, status?.run?.state]} />
    </div>
  );
};
