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

const MODE_COLOR: Record<string, string> = { sea: '#89ceff', rail: '#4edea3', air: '#ffb95f', direct: '#88929b' };

function nodeStyle(status: AgentStageStatus | undefined): string {
  switch (status) {
    case 'COMPLETE':
    case 'NOT_REQUIRED':
      return 'bg-[#222a3d] border-[#4edea3] text-white shadow-md';
    case 'RUNNING':
      return 'bg-[#222a3d] border-[#89ceff] text-white shadow-lg shadow-[#0ea5e9]/20 animate-pulse';
    case 'ACTION_REQUIRED':
      return 'bg-[#222a3d] border-[#ffb95f] text-white shadow-md';
    case 'NO_EVENT':
      return 'bg-[#222a3d] border-[#ffb95f]/60 text-white';
    case 'FAILED':
    case 'REJECTED':
      return 'bg-[#2a1a1d] border-[#ffb4ab] text-white';
    default:
      return 'bg-[#131b2e] border-[#3e4850] text-[#88929b]';
  }
}

function statusLabel(s: AgentStageStatus | undefined): { text: string; color: string } {
  switch (s) {
    case 'COMPLETE': return { text: 'COMPLETE', color: 'text-[#4edea3]' };
    case 'RUNNING': return { text: 'RUNNING', color: 'text-[#89ceff]' };
    case 'ACTION_REQUIRED': return { text: 'ACTION REQUIRED', color: 'text-[#ffb95f]' };
    case 'NOT_REQUIRED': return { text: 'NOT REQUIRED', color: 'text-[#4edea3]' };
    case 'NO_EVENT': return { text: 'NO EVENT', color: 'text-[#ffb95f]' };
    case 'FAILED': return { text: 'FAILED', color: 'text-[#ffb4ab]' };
    case 'REJECTED': return { text: 'REJECTED', color: 'text-[#ffb4ab]' };
    default: return { text: 'PENDING', color: 'text-[#88929b]' };
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
  idle: 'bg-[#1e293b] text-[#bec8d2] border border-[#3e4850]',
  running: 'bg-[#d88a00]/20 text-[#ffb95f] border border-[#d88a00]/40 animate-pulse',
  ok: 'bg-[#00a572]/20 text-[#4edea3] border border-[#00a572]/40',
  warn: 'bg-[#d88a00]/20 text-[#ffb95f] border border-[#d88a00]/40',
  bad: 'bg-[#93000a]/30 text-[#ffb4ab] border border-[#93000a]',
};

const AgentNodeCard: React.FC<{ stage: (typeof STAGES)[number]; agent?: AgentStatusEntry; compact?: boolean }> = ({ stage, agent, compact }) => {
  const lbl = statusLabel(agent?.status);
  const shared = stage.id === 'inventory' || stage.id === 'logistics' || stage.id === 'sourcing';
  return (
    <div className={`p-3 rounded-lg border transition-all ${nodeStyle(agent?.status)} ${compact ? '' : 'text-center'}`}>
      <div className={`flex items-center ${compact ? 'justify-between' : 'justify-center gap-2'} font-bold text-[#89ceff]`}>
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[15px]">{stage.icon}</span>
          <span>STEP {stage.step}: {stage.name.toUpperCase()}</span>
        </span>
        {agent?.latency_ms != null && (
          <span className="text-[10px] text-[#4edea3]" title={shared ? 'the three agents run as one timed step' : undefined}>
            {fmtMs(agent.latency_ms)}{shared ? ' (shared)' : ''}
          </span>
        )}
      </div>
      <div className={`text-[10px] font-bold mt-0.5 ${lbl.color}`}>{lbl.text}</div>
      <p className="text-[11px] text-[#bec8d2] mt-1">{agent?.detail || stage.blurb}</p>
    </div>
  );
};

const GovernanceCard: React.FC<{ d: DecisionResponse; onNavigate: (v: ViewMode) => void }> = ({ d, onNavigate }) => {
  const c = d.compliance;
  let title = 'Compliance has not run';
  let body = '';
  let accent = 'border-[#3e4850]';
  let action: React.ReactNode = null;

  if (c?.status === 'REJECTED') {
    title = 'Compliance rejected the plan';
    body = c.reason;
    accent = 'border-[#ffb4ab]/60';
  } else if (d.approval.status === 'PENDING') {
    title = 'Human approval required';
    body = c?.reason ?? '';
    accent = 'border-[#ffb95f]/50';
    action = (
      <button
        onClick={() => onNavigate('compliance')}
        className="mt-3 w-full py-2 bg-[#ffb95f] hover:bg-[#ffddb8] text-[#472a00] font-headline text-xs font-bold rounded flex items-center justify-center gap-1.5 transition-colors"
      >
        <span>Proceed to Approvals</span>
        <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
      </button>
    );
  } else if (d.approval.status === 'APPROVED') {
    title = `Approved by ${d.approval.decision?.decided_by ?? 'a human'}`;
    body = d.approval.decision?.note || 'Plan finalized.';
    accent = 'border-[#4edea3]/50';
  } else if (d.approval.status === 'REJECTED') {
    title = `Rejected by ${d.approval.decision?.decided_by ?? 'a human'}`;
    body = d.approval.decision?.note || '';
    accent = 'border-[#ffb4ab]/60';
  } else if (d.approval.status === 'NOT_REQUIRED') {
    title = 'Auto-approved — in policy';
    body = c?.reason ?? '';
    accent = 'border-[#4edea3]/50';
  }

  return (
    <div className={`p-4 bg-[#060e20] rounded-lg border ${accent} flex flex-col justify-between`}>
      <div>
        <span className="text-[10px] font-mono uppercase tracking-wider text-[#ffb95f] block font-bold">GOVERNANCE GATE</span>
        <span className="text-sm font-headline font-bold text-white mt-1 block">{title}</span>
        <p className="text-xs font-body text-[#bec8d2] mt-1">{body}</p>
        {d.replan_count > 0 && (
          <p className="text-[11px] font-mono text-[#ffb95f] mt-2">Replanned {d.replan_count}× after a compliance rejection.</p>
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#3e4850]">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 bg-[#0ea5e9]/20 text-[#89ceff] text-[10px] font-mono font-bold rounded">ORCHESTRATOR</span>
            <span className="text-[11px] font-mono text-[#88929b]">Gemini sensing · HiGHS optimization (scipy) · deterministic compliance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-headline font-bold text-white tracking-tight mt-1">Disruption Simulator</h1>
          <p className="text-sm font-body text-[#bec8d2] mt-0.5">
            Submit a disruption report and watch the real pipeline sense it, assess it, optimize a response and check it against policy.
          </p>
        </div>

        <button
          onClick={run}
          disabled={!canRun}
          className={`px-6 py-2.5 rounded font-headline text-sm font-bold flex items-center gap-2.5 transition-all shadow-lg ${
            !canRun
              ? 'bg-[#3e4850] text-[#bec8d2] cursor-not-allowed'
              : 'bg-[#0ea5e9] hover:bg-[#89ceff] hover:text-[#00344d] text-white shadow-[#0ea5e9]/30 hover:scale-[1.02] active:scale-[0.98]'
          }`}
        >
          <span className={`material-symbols-outlined text-[20px] ${isActive || sim.busy ? 'animate-spin' : ''}`}>{isActive || sim.busy ? 'progress_activity' : 'bolt'}</span>
          <span>{isActive || sim.busy ? 'ORCHESTRATING AGENTS...' : 'RUN SIMULATION'}</span>
        </button>
      </div>

      {health.data && !health.data.llm_configured && (
        <div className="p-3 bg-[#131b2e] border border-[#ffb95f]/60 rounded-lg text-xs font-mono text-[#ffb95f] flex items-start gap-2">
          <span className="material-symbols-outlined text-[16px]">key_off</span>
          <span>
            The backend has no LLM_API_KEY, so free-text reports can't be sensed and every run will end in SENSING_ERROR. Export the key and restart with
            <span className="text-white"> uvicorn backend.api.main:app --env-file .env</span>.
          </span>
        </div>
      )}
      {health.error && <ErrorBlock error={health.error} onRetry={health.reload} />}
      {sim.error && (
        <div className="p-3 bg-[#131b2e] border border-[#93000a] rounded-lg text-xs font-mono text-[#ffb4ab] flex items-start justify-between gap-3">
          <span>{sim.error}</span>
          <button onClick={sim.clearError} className="text-[#88929b] hover:text-white">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Scenario selector and the report that will be submitted */}
      <div className="p-5 bg-[#131b2e] border border-[#3e4850] rounded-lg space-y-4">
        <div>
          <label className="text-[11px] font-mono uppercase tracking-wider text-[#88929b] block mb-2 font-semibold">Pick a demo report or write your own:</label>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
            {DEMO_SIGNALS.map((s) => (
              <button
                key={s.id}
                onClick={() => pick(s.id)}
                className={`p-2.5 text-left rounded border transition-all text-xs font-mono ${
                  selectedId === s.id ? 'bg-[#222a3d] border-[#89ceff] text-[#89ceff] shadow-md shadow-[#0ea5e9]/10' : 'bg-[#060e20] border-[#3e4850] text-[#bec8d2] hover:border-[#88929b] hover:text-white'
                }`}
              >
                <span className="font-bold line-clamp-2">{s.label}</span>
              </button>
            ))}
            <button
              onClick={() => setSelectedId('custom')}
              className={`p-2.5 text-left rounded border transition-all text-xs font-mono ${
                selectedId === 'custom' ? 'bg-[#222a3d] border-[#89ceff] text-[#89ceff]' : 'bg-[#060e20] border-[#3e4850] text-[#bec8d2] hover:border-[#88929b] hover:text-white'
              }`}
            >
              <span className="font-bold">Custom report</span>
            </button>
          </div>
        </div>

        <div className="pt-3 border-t border-[#3e4850] grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#88929b]">
                SIGNAL {selected ? `· ${selected.label}` : '· custom'}
              </span>
              <span className={`text-[10px] font-mono ${trimmed.length > MAX_SIGNAL_CHARS ? 'text-[#ffb4ab]' : 'text-[#88929b]'}`}>
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
              className="w-full bg-[#060e20] text-sm font-body text-white placeholder-[#88929b] rounded border border-[#3e4850] focus:outline-hidden focus:border-[#89ceff] p-3 transition-colors"
            />
            {selected && <p className="text-[11px] font-body text-[#88929b]">{selected.description}</p>}
          </div>

          <div className="lg:col-span-4 space-y-2">
            <label className="text-[10px] font-mono uppercase tracking-wider text-[#88929b] block">PRODUCT TO PLAN (ONE PER RUN)</label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full h-9 bg-[#060e20] text-sm font-mono text-white rounded border border-[#3e4850] focus:outline-hidden focus:border-[#89ceff] px-2"
            >
              {(products.plannable.length ? products.plannable : [{ product_id: productId, supplier_count: 0, has_suppliers: true }]).map((p) => (
                <option key={p.product_id} value={p.product_id}>
                  {productLabel(p)}
                </option>
              ))}
            </select>
            <p className="text-[11px] font-body text-[#88929b]">
              Product ids are UCI Online Retail stock codes (no descriptions). Only three products have suppliers in the synthetic roster, so only those can be planned; 23166's demand exceeds its suppliers' capacity even in normal conditions, so it always ends INFEASIBLE. The report is read by the real LLM, so wording matters and results can vary run to run.
            </p>
          </div>
        </div>
      </div>

      {/* Live agent orchestration */}
      <div className="bg-[#131b2e] border border-[#3e4850] rounded-lg p-5 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#3e4850] pb-4">
          <div>
            <h2 className="text-xl font-headline font-bold text-white tracking-tight">Agent Orchestration</h2>
            <p className="text-xs font-body text-[#bec8d2] mt-0.5">
              Status below is what the world state records — no agent reports its own progress.
              {sim.simulationId && <span className="font-mono text-[#88929b]"> Simulation {sim.simulationId}.</span>}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className={`px-3 py-1 rounded font-bold ${toneStyle[pipeline.tone]}`}>{pipeline.text}</span>
            {sim.simulationId && !isActive && (
              <button onClick={sim.reset} disabled={sim.busy} className="px-2.5 py-1 rounded border border-[#3e4850] text-[#bec8d2] hover:bg-[#222a3d] hover:text-white disabled:opacity-50">
                Reset
              </button>
            )}
          </div>
        </div>

        {pipeline.message && <p className="text-xs font-body text-[#bec8d2] -mt-3">{pipeline.message}</p>}

        <div className="bg-[#060e20] p-4 rounded-lg border border-[#3e4850]">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#88929b] mb-3">Inter-agent workflow:</div>
          <div className="flex flex-col items-center max-w-4xl mx-auto space-y-2 text-xs font-mono">
            <div className="px-4 py-1.5 bg-[#93000a]/60 text-[#ffdad6] rounded border border-[#ffb4ab] font-bold shadow-md flex items-center gap-2 max-w-full">
              <span className="material-symbols-outlined text-[16px]">warning</span>
              <span className="truncate">{sensingDetail && agentsById.get('sensing')?.status === 'COMPLETE' ? sensingDetail : 'DISRUPTION SIGNAL'}</span>
            </div>
            <div className="h-4 w-0.5 bg-[#3e4850]"></div>
            <div className="w-full max-w-xl"><AgentNodeCard stage={STAGES[0]} agent={agentsById.get('sensing')} /></div>
            <div className="h-4 w-0.5 bg-[#3e4850]"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
              {STAGES.slice(1, 4).map((s) => (
                <AgentNodeCard key={s.id} stage={s} agent={agentsById.get(s.id)} compact />
              ))}
            </div>
            <div className="h-4 w-0.5 bg-[#3e4850]"></div>
            <div className="w-full max-w-xl"><AgentNodeCard stage={STAGES[4]} agent={agentsById.get('optimization')} /></div>
            <div className="h-4 w-0.5 bg-[#3e4850]"></div>
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl">
              <AgentNodeCard stage={STAGES[5]} agent={agentsById.get('compliance')} />
              <AgentNodeCard stage={STAGES[6]} agent={agentsById.get('human_approval')} />
            </div>
          </div>
        </div>

        {/* The plan the optimizer produced */}
        <div className="pt-2 border-t border-[#3e4850] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-headline font-bold text-white">Recommended Response Allocation</h3>
            {d && <span className="text-xs font-mono text-[#89ceff]">{d.label}</span>}
          </div>

          {decision.error && !noPlan && <ErrorBlock error={decision.error} onRetry={decision.reload} />}
          {(!d && !decision.error) && (
            <p className="text-xs font-body text-[#88929b]">
              {isActive ? 'The optimizer has not produced a plan yet.' : 'Run a scenario to see the plan the optimizer produces. Nothing is shown until it exists.'}
            </p>
          )}
          {noPlan && <p className="text-xs font-body text-[#88929b]">This run ended without a plan (see the status above).</p>}

          {d && d.plan_status !== 'OPTIMAL' && (
            <div className="p-4 bg-[#060e20] rounded-lg border border-[#ffb4ab]/60 space-y-2">
              <div className="flex items-center gap-2"><StatusPill value={d.plan_status} /><span className="text-sm font-headline font-bold text-white">No feasible plan was produced</span></div>
              <p className="text-xs font-body text-[#bec8d2]">{d.message}</p>
              {Object.keys(d.diagnostics).length > 0 && (
                <pre className="text-[10px] font-mono text-[#88929b] overflow-x-auto">{JSON.stringify(d.diagnostics, null, 2)}</pre>
              )}
            </div>
          )}

          {d && d.plan_status === 'OPTIMAL' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-[#060e20] rounded-lg border border-[#3e4850] space-y-3">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#88929b] block">Freight split ({fmtNumber(unitsProcured)} units, product {d.product_id})</span>
                {d.mode_split && Object.keys(d.mode_split).length > 0 ? (
                  Object.entries(d.mode_split).map(([mode, s]) => (
                    <div key={mode}>
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-white">{titleCase(mode)}</span>
                        <span className="font-bold" style={{ color: MODE_COLOR[mode] ?? '#89ceff' }}>{fmtShare(s.share)} ({fmtNumber(s.units)})</span>
                      </div>
                      <div className="w-full bg-[#1e293b] h-2 rounded-full overflow-hidden mt-1">
                        <div className="h-full" style={{ width: `${s.share * 100}%`, background: MODE_COLOR[mode] ?? '#89ceff' }}></div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs font-body text-[#88929b]">The plan buys nothing new (needs are met from stock and transfers).</p>
                )}
              </div>

              <div className="p-4 bg-[#060e20] rounded-lg border border-[#3e4850] flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#88929b] block">Plan spend</span>
                  <span className="text-2xl font-headline font-bold text-[#89ceff] mt-1 block">{fmtNumber(d.plan_spend)}</span>
                  <p className="text-xs font-body text-[#bec8d2] mt-1">{fmtNumber(d.avg_all_in_unit_cost, 2)} cost units / unit, all-in</p>
                </div>
                <span className="text-[10px] font-mono text-[#88929b] mt-2">
                  {cmp && cmp.deltas.mitigation_cost !== null
                    ? `${cmp.deltas.mitigation_cost >= 0 ? '+' : ''}${fmtNumber(cmp.deltas.mitigation_cost)} vs. normal operations (${cmp.deltas.mitigation_cost_pct}%); secures ${fmtNumber(cmp.deltas.units_protected)} units inaction would lose. MVP cost units, no currency.`
                    : 'MVP cost units, no currency.'}
                </span>
              </div>

              <div className="p-4 bg-[#060e20] rounded-lg border border-[#3e4850] flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#88929b] block">Average arrival</span>
                  <span className="text-2xl font-headline font-bold text-[#4edea3] mt-1 block">{fmtDays(d.avg_arrival_days)}</span>
                  <p className="text-xs font-body text-[#bec8d2] mt-1">Weighted supplier reliability {fmtShare(d.weighted_reliability)}</p>
                </div>
                <button onClick={() => onNavigate('decisions')} className="text-[11px] font-mono text-[#89ceff] hover:underline mt-2 text-left">
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
