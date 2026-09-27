import React, { useState } from 'react';
import { DEMO_SIGNALS } from '../../data/network';
import { productLabel, useProducts } from '../../hooks/useProducts';
import { useSimulation } from '../../context/SimulationContext';
import { useFetch } from '../../hooks/useFetch';
import { ApiError, getDecision, getHealth, getSimulationComparison } from '../../services/api';
import { ErrorBlock, StatusPill } from '../common/StateNotice';
import { ViewMode } from '../../types';
import { AgentStageStatus, AgentStatusEntry, DecisionResponse, SimulationStatusResponse } from '../../types/api';
import { fmtCost, fmtDays, fmtMs, fmtNumber, fmtShare, titleCase } from '../../utils/format';

interface SimulatorViewProps {
  onNavigate: (view: ViewMode) => void;
}

const MAX_SIGNAL_CHARS = 4000; // the Sensing Agent's own limit (backend/config/sensing_config.yaml)

// What each stage really does — from docs/agent-plan.md. The live result of each
// stage comes from the API (`detail`), never from this table.
const STAGES: { id: string; step: string; name: string; icon: string; blurb: string }[] = [
  { id: 'sensing', step: '01', name: 'Sensing Agent', icon: 'radar', blurb: 'An LLM reads the report; plain-Python validation decides whether it becomes an event' },
  { id: 'inventory', step: '02', name: 'Inventory Agent', icon: 'inventory_2', blurb: 'XGBoost demand forecast → stockout risk → transfer recommendation' },
  { id: 'logistics', step: '03', name: 'Logistics Agent', icon: 'local_shipping', blurb: 'Route capacity, cost and ETA; alternatives around disrupted lanes' },
  { id: 'sourcing', step: '04', name: 'Sourcing Agent', icon: 'factory', blurb: 'Supplier capacity and landed cost including tariffs' },
  { id: 'optimization', step: '05', name: 'Optimization Engine', icon: 'functions', blurb: 'HiGHS (scipy) integer program over supplier × route lanes' },
  { id: 'compliance', step: '06', name: 'Compliance Agent', icon: 'verified', blurb: 'Deterministic policy checks — no LLM' },
  { id: 'human_approval', step: '07', name: 'Human Approval', icon: 'person_check', blurb: 'A named human decides an escalated plan' },
];

const MODE_COLOR: Record<string, string> = { sea: 'var(--color-cat-1)', rail: 'var(--color-cat-3)', air: 'var(--color-cat-2)', direct: 'var(--color-muted)' };

function nodeStyle(status: AgentStageStatus | undefined): string {
  switch (status) {
    case 'COMPLETE':
    case 'NOT_REQUIRED':
      return 'bg-raised border-success text-ink shadow-md';
    case 'RUNNING':
      return 'bg-raised border-primary text-ink shadow-lg shadow-primary/20 animate-pulse';
    case 'ACTION_REQUIRED':
      return 'bg-raised border-warning text-ink shadow-md';
    case 'NO_EVENT':
      return 'bg-raised border-warning/60 text-ink';
    case 'FAILED':
    case 'REJECTED':
      return 'bg-danger-soft border-danger text-ink';
    default:
      return 'bg-card border-line text-muted';
  }
}

function statusLabel(s: AgentStageStatus | undefined): { text: string; color: string } {
  switch (s) {
    case 'COMPLETE': return { text: 'COMPLETE', color: 'text-success' };
    case 'RUNNING': return { text: 'RUNNING', color: 'text-primary' };
    case 'ACTION_REQUIRED': return { text: 'ACTION REQUIRED', color: 'text-warning' };
    case 'NOT_REQUIRED': return { text: 'NOT REQUIRED', color: 'text-success' };
    case 'NO_EVENT': return { text: 'NO EVENT', color: 'text-warning' };
    case 'FAILED': return { text: 'FAILED', color: 'text-danger' };
    case 'REJECTED': return { text: 'REJECTED', color: 'text-danger' };
    default: return { text: 'PENDING', color: 'text-muted' };
  }
}

interface Pipeline {
  tone: 'idle' | 'running' | 'ok' | 'warn' | 'bad';
  text: string;
  message: string;
}

function summarize(status: SimulationStatusResponse | null, isActive: boolean): Pipeline {
  if (!status) return { tone: 'idle', text: 'NO RUN YET', message: '' };
  if (status.stalled) {
    return { tone: 'bad', text: 'STALLED', message: 'The server restarted mid-run, so nothing is executing this simulation. Reset it (or start a new run).' };
  }
  if (isActive) {
    if (status.run?.overdue) {
      return {
        tone: 'bad',
        text: `OVERDUE · ${status.current_step.toUpperCase()}`,
        message: `This run has been going for ${Math.round(status.run.elapsed_ms / 1000)}s, longer than the backend's limit. Nothing is stopping it, but it may be stuck: check the backend log (search the simulation id).`,
      };
    }
    return { tone: 'running', text: `RUNNING · ${status.current_step.toUpperCase()}`, message: '' };
  }
  const outcome = status.run?.outcome;
  const message = outcome?.message || status.run?.error || status.error || '';
  switch (outcome?.outcome) {
    case 'COMPLETED': return { tone: 'ok', text: 'PIPELINE COMPLETE · PLAN FINALIZED', message };
    case 'AWAITING_APPROVAL': return { tone: 'warn', text: 'AWAITING HUMAN APPROVAL', message };
    case 'FAILED': return { tone: 'bad', text: 'RUN FAILED', message };
    case 'NO_DISRUPTION': return { tone: 'warn', text: 'NO DISRUPTION SENSED', message };
    case 'SENSING_REJECTED': return { tone: 'bad', text: 'SENSING REJECTED THE REPORT', message };
    case 'SENSING_ERROR': return { tone: 'bad', text: 'SENSING ERROR', message };
  }
  if (status.run?.state === 'CRASHED') return { tone: 'bad', text: 'RUN CRASHED', message };
  // no run record (e.g. it was forgotten across a server restart): fall back to the state itself
  switch (status.status) {
    case 'COMPLETED': return { tone: 'ok', text: 'PLAN FINALIZED', message };
    case 'AWAITING_APPROVAL': return { tone: 'warn', text: 'AWAITING HUMAN APPROVAL', message };
    case 'REJECTED': return { tone: 'bad', text: 'PLAN REJECTED BY A HUMAN', message };
    case 'FAILED': return { tone: 'bad', text: 'RUN FAILED', message };
    default: return { tone: 'idle', text: 'CREATED · READY TO RUN', message };
  }
}

const toneStyle: Record<Pipeline['tone'], string> = {
  idle: 'bg-raised text-ink-2 border border-line',
  running: 'bg-warning/10 text-warning border border-warning/50 animate-pulse',
  ok: 'bg-success/10 text-success border border-success/40',
  warn: 'bg-warning/10 text-warning border border-warning/50',
  bad: 'bg-danger/10 text-danger border border-danger/40',
};

const AgentNodeCard: React.FC<{ stage: (typeof STAGES)[number]; agent?: AgentStatusEntry; compact?: boolean }> = ({ stage, agent, compact }) => {
  const lbl = statusLabel(agent?.status);
  const shared = stage.id === 'inventory' || stage.id === 'logistics' || stage.id === 'sourcing';
  return (
    <div className={`p-3 rounded-2xl border transition-all ${nodeStyle(agent?.status)} ${compact ? '' : 'text-center'}`}>
      <div className={`flex items-center ${compact ? 'justify-between' : 'justify-center gap-2'} font-bold text-primary`}>
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[15px]">{stage.icon}</span>
          <span>STEP {stage.step}: {stage.name.toUpperCase()}</span>
        </span>
        {agent?.latency_ms != null && (
          <span className="text-[10px] text-success" title={shared ? 'the three agents run as one timed step' : undefined}>
            {fmtMs(agent.latency_ms)}{shared ? ' (shared)' : ''}
          </span>
        )}
      </div>
      <div className={`text-[10px] font-bold mt-0.5 ${lbl.color}`}>{lbl.text}</div>
      <p className="text-[11px] text-ink-2 mt-1">{agent?.detail || stage.blurb}</p>
    </div>
  );
};

const GovernanceCard: React.FC<{ d: DecisionResponse; onNavigate: (v: ViewMode) => void }> = ({ d, onNavigate }) => {
  const c = d.compliance;
  let title = 'Compliance has not run';
  let body = '';
  let accent = 'border-line';
  let action: React.ReactNode = null;

  if (c?.status === 'REJECTED') {
    title = 'Compliance rejected the plan';
    body = c.reason;
    accent = 'border-danger/60';
  } else if (d.approval.status === 'PENDING') {
    title = 'Human approval required';
    body = c?.reason ?? '';
    accent = 'border-warning/50';
    action = (
      <button
        onClick={() => onNavigate('compliance')}
        className="mt-3 w-full py-2 bg-warning hover:bg-warning-soft text-white font-headline text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
      >
        <span>Proceed to Approvals</span>
        <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
      </button>
    );
  } else if (d.approval.status === 'APPROVED') {
    title = `Approved by ${d.approval.decision?.decided_by ?? 'a human'}`;
    body = d.approval.decision?.note || 'Plan finalized.';
    accent = 'border-success/50';
  } else if (d.approval.status === 'REJECTED') {
    title = `Rejected by ${d.approval.decision?.decided_by ?? 'a human'}`;
    body = d.approval.decision?.note || '';
    accent = 'border-danger/60';
  } else if (d.approval.status === 'NOT_REQUIRED') {
    title = 'Auto-approved — in policy';
    body = c?.reason ?? '';
    accent = 'border-success/50';
  }

  return (
    <div className={`p-4 bg-inset rounded-2xl border ${accent} flex flex-col justify-between`}>
      <div>
        <span className="text-[10px] font-mono uppercase tracking-wider text-warning block font-bold">GOVERNANCE GATE</span>
        <span className="text-sm font-headline font-bold text-ink mt-1 block">{title}</span>
        <p className="text-xs font-body text-ink-2 mt-1">{body}</p>
        {d.replan_count > 0 && (
          <p className="text-[11px] font-mono text-warning mt-2">Replanned {d.replan_count}× after a compliance rejection.</p>
        )}
      </div>
      {action}
    </div>
  );
};

export const SimulatorView: React.FC<SimulatorViewProps> = ({ onNavigate }) => {
  const sim = useSimulation();
  const [selectedId, setSelectedId] = useState<string>(DEMO_SIGNALS[0].id);
  const [signalText, setSignalText] = useState<string>(DEMO_SIGNALS[0].signal);
  const [productId, setProductId] = useState<string>(DEMO_SIGNALS[0].suggestedProductId);

  const health = useFetch(getHealth, []);
  const products = useProducts();
  const { status, isActive } = sim;

  const planReady = !!status && !isActive && ['AWAITING_APPROVAL', 'COMPLETED', 'REJECTED', 'FAILED'].includes(status.status);
  const decision = useFetch(() => getDecision(sim.simulationId!), [sim.simulationId], !!sim.simulationId && planReady, [status?.version]);
  const noPlan = decision.error instanceof ApiError && decision.error.code === 'PLAN_NOT_READY';

  const pipeline = summarize(status, isActive);
  const agentsById = new Map((status?.agents ?? []).map((a) => [a.id, a]));
  const selected = DEMO_SIGNALS.find((s) => s.id === selectedId);
  const trimmed = signalText.trim();
  const canRun = trimmed.length > 0 && trimmed.length <= MAX_SIGNAL_CHARS && !sim.busy && !isActive;

  const pick = (id: string) => {
    setSelectedId(id);
    const demo = DEMO_SIGNALS.find((s) => s.id === id);
    if (demo) {
      setSignalText(demo.signal);
      setProductId(demo.suggestedProductId);
    }
  };

  const run = () => {
    if (!canRun) return;
    sim.start({
      signal: trimmed,
      productId,
      scenarioType: selectedId === 'custom' ? 'CUSTOM' : selectedId.toUpperCase().replace(/-/g, '_'),
    });
  };

  const d = decision.data;
  const comparison = useFetch(() => getSimulationComparison(sim.simulationId!), [sim.simulationId], !!d && d.plan_status === 'OPTIMAL', [status?.version]);
  const cmp = comparison.data;
  const unitsProcured = d ? d.allocations.reduce((n, a) => n + a.quantity, 0) : 0;
  const sensingDetail = agentsById.get('sensing')?.detail;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-line">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-mono font-bold rounded-lg">ORCHESTRATOR</span>
            <span className="text-[11px] font-mono text-muted">Gemini sensing · HiGHS optimization (scipy) · deterministic compliance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-headline font-bold text-ink tracking-tight mt-1">Disruption Simulator</h1>
          <p className="text-sm font-body text-ink-2 mt-0.5">
            Submit a disruption report and watch the real pipeline sense it, assess it, optimize a response and check it against policy.
          </p>
        </div>

        <button
          onClick={run}
          disabled={!canRun}
          className={`px-6 py-2.5 rounded-lg font-headline text-sm font-bold flex items-center gap-2.5 transition-all shadow-lg ${
            !canRun
              ? 'bg-line text-ink-2 cursor-not-allowed'
              : 'bg-primary hover:bg-primary-strong text-white shadow-primary/30 hover:scale-[1.02] active:scale-[0.98]'
          }`}
        >
          <span className={`material-symbols-outlined text-[20px] ${isActive || sim.busy ? 'animate-spin' : ''}`}>{isActive || sim.busy ? 'progress_activity' : 'bolt'}</span>
          <span>{isActive || sim.busy ? 'ORCHESTRATING AGENTS...' : 'RUN SIMULATION'}</span>
        </button>
      </div>

      {health.data && !health.data.llm_configured && (
        <div className="p-3 bg-card border border-warning/60 rounded-2xl text-xs font-mono text-warning flex items-start gap-2 shadow-card">
          <span className="material-symbols-outlined text-[16px]">key_off</span>
          <span>
            The backend has no LLM_API_KEY, so free-text reports can't be sensed and every run will end in SENSING_ERROR. Export the key and restart with
            <span className="text-ink"> uvicorn backend.api.main:app --env-file .env</span>.
          </span>
        </div>
      )}
      {health.error && <ErrorBlock error={health.error} onRetry={health.reload} />}
      {sim.error && (
        <div className="p-3 bg-card border border-danger/40 rounded-2xl text-xs font-mono text-danger flex items-start justify-between gap-3 shadow-card">
          <span>{sim.error}</span>
          <button onClick={sim.clearError} className="text-muted hover:text-ink">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Scenario selector and the report that will be submitted */}
      <div className="p-5 bg-card rounded-2xl space-y-4 shadow-card">
        <div>
          <label className="text-[11px] font-mono uppercase tracking-wider text-muted block mb-2 font-semibold">Pick a demo report or write your own:</label>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
            {DEMO_SIGNALS.map((s) => (
              <button
                key={s.id}
                onClick={() => pick(s.id)}
                className={`p-2.5 text-left rounded-lg border transition-all text-xs font-mono ${
                  selectedId === s.id ? 'bg-raised border-primary text-primary shadow-md shadow-primary/10' : 'bg-inset border-line text-ink-2 hover:border-muted hover:text-ink'
                }`}
              >
                <span className="font-bold line-clamp-2">{s.label}</span>
              </button>
            ))}
            <button
              onClick={() => setSelectedId('custom')}
              className={`p-2.5 text-left rounded-lg border transition-all text-xs font-mono ${
                selectedId === 'custom' ? 'bg-raised border-primary text-primary' : 'bg-inset border-line text-ink-2 hover:border-muted hover:text-ink'
              }`}
            >
              <span className="font-bold">Custom report</span>
            </button>
          </div>
        </div>

        <div className="pt-3 border-t border-line grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted">
                SIGNAL {selected ? `· ${selected.label}` : '· custom'}
              </span>
              <span className={`text-[10px] font-mono ${trimmed.length > MAX_SIGNAL_CHARS ? 'text-danger' : 'text-muted'}`}>
                {trimmed.length}/{MAX_SIGNAL_CHARS}
              </span>
            </div>
            <textarea
              value={signalText}
              onChange={(e) => {
                setSignalText(e.target.value);
                if (selectedId !== 'custom') setSelectedId('custom');
              }}
              rows={3}
              placeholder="Describe a supply-chain event, as a news report or an alert would…"
              className="w-full bg-inset text-sm font-body text-ink placeholder-muted rounded-lg border border-line focus:outline-hidden focus:border-primary p-3 transition-colors"
            />
            {selected && <p className="text-[11px] font-body text-muted">{selected.description}</p>}
          </div>

          <div className="lg:col-span-4 space-y-2">
            <label className="text-[10px] font-mono uppercase tracking-wider text-muted block">PRODUCT TO PLAN (ONE PER RUN)</label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full h-9 bg-inset text-sm font-mono text-ink rounded-lg border border-line focus:outline-hidden focus:border-primary px-2"
            >
              {(products.plannable.length ? products.plannable : [{ product_id: productId, supplier_count: 0, has_suppliers: true }]).map((p) => (
                <option key={p.product_id} value={p.product_id}>
                  {productLabel(p)}
                </option>
              ))}
            </select>
            <p className="text-[11px] font-body text-muted">
              Product ids are UCI Online Retail stock codes (no descriptions). Only three products have suppliers in the synthetic roster, so only those can be planned; 23166's demand exceeds its suppliers' capacity even in normal conditions, so it always ends INFEASIBLE. The report is read by the real LLM, so wording matters and results can vary run to run.
            </p>
          </div>
        </div>
      </div>

      {/* Live agent orchestration */}
      <div className="bg-card rounded-2xl p-5 space-y-6 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
          <div>
            <h2 className="text-xl font-headline font-bold text-ink tracking-tight">Agent Orchestration</h2>
            <p className="text-xs font-body text-ink-2 mt-0.5">
              Status below is what the world state records — no agent reports its own progress.
              {sim.simulationId && <span className="font-mono text-muted"> Simulation {sim.simulationId}.</span>}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className={`px-3 py-1 rounded-lg font-bold ${toneStyle[pipeline.tone]}`}>{pipeline.text}</span>
            {sim.simulationId && !isActive && (
              <button onClick={sim.reset} disabled={sim.busy} className="px-2.5 py-1 rounded-lg border border-line text-ink-2 hover:bg-raised hover:text-ink disabled:opacity-50">
                Reset
              </button>
            )}
          </div>
        </div>

        {pipeline.message && <p className="text-xs font-body text-ink-2 -mt-3">{pipeline.message}</p>}

        <div className="bg-inset p-4 rounded-2xl border border-line">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted mb-3">Inter-agent workflow:</div>
          <div className="flex flex-col items-center max-w-4xl mx-auto space-y-2 text-xs font-mono">
            <div className="px-4 py-1.5 bg-danger/10 text-danger rounded-lg border border-danger font-bold shadow-md flex items-center gap-2 max-w-full">
              <span className="material-symbols-outlined text-[16px]">warning</span>
              <span className="truncate">{sensingDetail && agentsById.get('sensing')?.status === 'COMPLETE' ? sensingDetail : 'DISRUPTION SIGNAL'}</span>
            </div>
            <div className="h-4 w-0.5 bg-line"></div>
            <div className="w-full max-w-xl"><AgentNodeCard stage={STAGES[0]} agent={agentsById.get('sensing')} /></div>
            <div className="h-4 w-0.5 bg-line"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
              {STAGES.slice(1, 4).map((s) => (
                <AgentNodeCard key={s.id} stage={s} agent={agentsById.get(s.id)} compact />
              ))}
            </div>
            <div className="h-4 w-0.5 bg-line"></div>
            <div className="w-full max-w-xl"><AgentNodeCard stage={STAGES[4]} agent={agentsById.get('optimization')} /></div>
            <div className="h-4 w-0.5 bg-line"></div>
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl">
              <AgentNodeCard stage={STAGES[5]} agent={agentsById.get('compliance')} />
              <AgentNodeCard stage={STAGES[6]} agent={agentsById.get('human_approval')} />
            </div>
          </div>
        </div>

        {/* The plan the optimizer produced */}
        <div className="pt-2 border-t border-line space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-headline font-bold text-ink">Recommended Response Allocation</h3>
            {d && <span className="text-xs font-mono text-primary">{d.label}</span>}
          </div>

          {decision.error && !noPlan && <ErrorBlock error={decision.error} onRetry={decision.reload} />}
          {(!d && !decision.error) && (
            <p className="text-xs font-body text-muted">
              {isActive ? 'The optimizer has not produced a plan yet.' : 'Run a scenario to see the plan the optimizer produces. Nothing is shown until it exists.'}
            </p>
          )}
          {noPlan && <p className="text-xs font-body text-muted">This run ended without a plan (see the status above).</p>}

          {d && d.plan_status !== 'OPTIMAL' && (
            <div className="p-4 bg-inset rounded-2xl border border-danger/60 space-y-2">
              <div className="flex items-center gap-2"><StatusPill value={d.plan_status} /><span className="text-sm font-headline font-bold text-ink">No feasible plan was produced</span></div>
              <p className="text-xs font-body text-ink-2">{d.message}</p>
              {Object.keys(d.diagnostics).length > 0 && (
                <pre className="text-[10px] font-mono text-muted overflow-x-auto">{JSON.stringify(d.diagnostics, null, 2)}</pre>
              )}
            </div>
          )}

          {d && d.plan_status === 'OPTIMAL' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-inset rounded-2xl border border-line space-y-3">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted block">Freight split ({fmtNumber(unitsProcured)} units, product {d.product_id})</span>
                {d.mode_split && Object.keys(d.mode_split).length > 0 ? (
                  Object.entries(d.mode_split).map(([mode, s]) => (
                    <div key={mode}>
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-ink">{titleCase(mode)}</span>
                        <span className="font-bold text-ink">{fmtShare(s.share)} ({fmtNumber(s.units)})</span>
                      </div>
                      <div className="w-full bg-raised h-2 rounded-full overflow-hidden mt-1">
                        <div className="h-full" style={{ width: `${s.share * 100}%`, background: MODE_COLOR[mode] ?? 'var(--color-cat-1)' }}></div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs font-body text-muted">The plan buys nothing new (needs are met from stock and transfers).</p>
                )}
              </div>

              <div className="p-4 bg-inset rounded-2xl border border-line flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted block">Plan spend</span>
                  <span className="text-2xl font-headline font-bold text-primary mt-1 block">{fmtNumber(d.plan_spend)}</span>
                  <p className="text-xs font-body text-ink-2 mt-1">{fmtNumber(d.avg_all_in_unit_cost, 2)} cost units / unit, all-in</p>
                </div>
                <span className="text-[10px] font-mono text-muted mt-2">
                  {cmp && cmp.deltas.mitigation_cost !== null
                    ? `${cmp.deltas.mitigation_cost >= 0 ? '+' : ''}${fmtNumber(cmp.deltas.mitigation_cost)} vs. normal operations (${cmp.deltas.mitigation_cost_pct}%); secures ${fmtNumber(cmp.deltas.units_protected)} units inaction would lose. MVP cost units, no currency.`
                    : 'MVP cost units, no currency.'}
                </span>
              </div>

              <div className="p-4 bg-inset rounded-2xl border border-line flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted block">Average arrival</span>
                  <span className="text-2xl font-headline font-bold text-success mt-1 block">{fmtDays(d.avg_arrival_days)}</span>
                  <p className="text-xs font-body text-ink-2 mt-1">Weighted supplier reliability {fmtShare(d.weighted_reliability)}</p>
                </div>
                <button onClick={() => onNavigate('decisions')} className="text-[11px] font-mono text-primary hover:underline mt-2 text-left">
                  See why the optimizer chose this →
                </button>
              </div>

              <GovernanceCard d={d} onNavigate={onNavigate} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
