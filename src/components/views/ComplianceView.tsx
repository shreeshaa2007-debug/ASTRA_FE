import React, { useState } from 'react';
import { ApiError, getCompliance, getDecision } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import { useSimulation } from '../../context/SimulationContext';
import { ErrorBlock, LoadingBlock, NoSimulationNotice } from '../common/StateNotice';
import { ViewMode } from '../../types';
import { ComplianceCheck } from '../../types/api';
import { fmtCost, fmtNumber } from '../../utils/format';

interface ComplianceViewProps {
  onNavigate: (view: ViewMode) => void;
}

const APPROVER_KEY = 'resilientsc:approver';

const CHECK_TITLES: Record<string, string> = {
  supplier_permitted: 'Supplier Permitted',
  country_permitted: 'Country Permitted',
  route_permitted: 'Route Permitted',
  cost_within_threshold: 'Cost Within Approval Threshold',
};

function readApprover(): string {
  try {
    return window.localStorage.getItem(APPROVER_KEY) ?? '';
  } catch {
    return '';
  }
}

const CheckCard: React.FC<{ check: ComplianceCheck; index: number }> = ({ check, index }) => {
  // A failed cost check escalates to a human; it isn't a policy violation.
  const escalation = !check.passed && check.name === 'cost_within_threshold';
  const icon = check.passed ? 'check_circle' : escalation ? 'warning' : 'cancel';
  const color = check.passed ? 'text-[#4edea3]' : escalation ? 'text-[#ffb95f]' : 'text-[#ffb4ab]';
  return (
    <div className="p-3 bg-[#060e20] rounded border border-[#3e4850]/70 flex items-start gap-2.5">
      <span className={`material-symbols-outlined ${color} text-[20px] flex-shrink-0`}>{icon}</span>
      <div>
        <span className="text-white font-bold block">{index + 1}. {CHECK_TITLES[check.name] ?? check.name}</span>
        <span className="text-[#88929b] text-[11px] block mt-0.5">{check.detail}</span>
        {check.offenders && check.offenders.length > 0 && (
          <span className="text-[#ffb4ab] text-[11px] block mt-0.5">offenders: {check.offenders.join(', ')}</span>
        )}
      </div>
    </div>
  );
};

export const ComplianceView: React.FC<ComplianceViewProps> = ({ onNavigate }) => {
  const sim = useSimulation();
  const { simulationId, status } = sim;
  const version = status?.version;

  const compliance = useFetch(() => getCompliance(simulationId!), [simulationId], !!simulationId, [version]);
  const decision = useFetch(() => getDecision(simulationId!), [simulationId], !!simulationId, [version]);

  const [approver, setApprover] = useState<string>(readApprover);
  const [note, setNote] = useState('');

  const setApproverPersist = (v: string) => {
    setApprover(v);
    try {
      window.localStorage.setItem(APPROVER_KEY, v);
    } catch {
      // storage unavailable: the name just isn't remembered
    }
  };

  const header = (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#3e4850]">
      <div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-[#d88a00]/20 text-[#ffb95f] text-[10px] font-mono font-bold rounded">POLICY CHECKS &amp; HUMAN-IN-THE-LOOP</span>
          <span className="text-[11px] font-mono text-[#88929b]">Deterministic rules · config in backend/config/compliance_rules.yaml</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-headline font-bold text-white tracking-tight mt-1">Compliance &amp; Human Approval</h1>
        <p className="text-sm font-body text-[#bec8d2] mt-0.5">
          Review the automated policy checks on the optimizer's plan and, if it was escalated, record a named human decision.
        </p>
      </div>
    </div>
  );

  if (!simulationId) {
    return (
      <div className="space-y-6">
        {header}
        <NoSimulationNotice onNavigate={onNavigate} what="A compliance verdict" />
      </div>
    );
  }

  const notReady = compliance.error instanceof ApiError && compliance.error.code === 'PLAN_NOT_READY';
  if (compliance.loading && !compliance.data) {
    return (
      <div className="space-y-6">
        {header}
        <LoadingBlock label="Loading the compliance verdict…" />
      </div>
    );
  }
  if (notReady) {
    return (
      <div className="space-y-6">
        {header}
        <div className="p-6 bg-[#131b2e] border border-[#3e4850] rounded-lg text-sm font-body text-[#bec8d2] space-y-2">
          <p>
            Simulation <span className="font-mono text-white">{simulationId}</span> has not reached compliance
            {status ? ` (status ${status.status}${status.run?.outcome ? `, ${status.run.outcome.outcome}` : ''})` : ''}.
          </p>
          {status?.run?.outcome?.message && <p className="text-[#88929b]">{status.run.outcome.message}</p>}
          <button onClick={() => onNavigate('simulator')} className="px-3 py-1.5 border border-[#3e4850] hover:bg-[#222a3d] rounded text-xs font-mono text-[#89ceff]">
            Back to the simulator
          </button>
        </div>
      </div>
    );
  }
  if (compliance.error || !compliance.data) {
    return (
      <div className="space-y-6">
        {header}
        {compliance.error && <ErrorBlock error={compliance.error} onRetry={compliance.reload} />}
      </div>
    );
  }

  const c = compliance.data;
  const verdict = c.compliance;
  const plan = decision.data;
  const pending = c.approval.status === 'PENDING' && c.simulation_status === 'AWAITING_APPROVAL';
  const decidedBy = c.approval.decision?.decided_by;
  const canDecide = pending && approver.trim().length > 0 && !sim.busy;

  const decide = async (kind: 'approve' | 'reject') => {
    if (!canDecide) return;
    try {
      await (kind === 'approve' ? sim.approve : sim.reject)(approver.trim(), note.trim(), c.version);
      setNote('');
    } catch {
      // the context has already put the message in `sim.error`, shown below
    }
  };

  const unitsProcured = plan ? plan.allocations.reduce((n, a) => n + a.quantity, 0) : 0;
  const routesUsed = plan ? Array.from(new Set(plan.allocations.map((a) => a.route_id).filter(Boolean))) : [];

  return (
    <div className="space-y-6">
      {header}

      <div className="bg-[#131b2e] border border-[#3e4850] rounded-lg p-5 sm:p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#3e4850] pb-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#88929b] block">
              {pending ? 'PENDING HUMAN DECISION' : 'PLAN GOVERNANCE STATUS'}
            </span>
            <h2 className="text-xl font-headline font-bold text-white mt-1">
              Plan for simulation <span className="font-mono">{c.simulation_id}</span>{plan ? ` · product ${plan.product_id}` : ''}
            </h2>
            <p className="text-xs font-body text-[#bec8d2] mt-0.5">
              {plan
                ? `${fmtNumber(unitsProcured)} units procured via ${routesUsed.length > 0 ? routesUsed.join(', ') : 'no freight leg'}; ${fmtNumber(plan.transfers.reduce((n, t) => n + t.quantity, 0))} units transferred between warehouses.`
                : 'Loading the plan summary…'}
            </p>
          </div>
          <div className="text-left md:text-right flex-shrink-0">
            <span className="text-[10px] font-mono text-[#88929b] uppercase block">PLAN SPEND</span>
            <div className="text-[#89ceff] font-headline font-bold text-sm">{fmtCost(c.plan_spend)}</div>
            <span className="text-[10px] font-mono text-[#88929b]">{c.label ?? 'Prototype Optimization'} · version {c.version}</span>
          </div>
        </div>

        {/* Verdict banner */}
        {verdict.status === 'REJECTED' && (
          <div className="p-4 bg-[#060e20] border-l-4 border-[#ffb4ab] rounded flex items-start gap-3">
            <span className="material-symbols-outlined text-[#ffb4ab] text-[22px] flex-shrink-0">gpp_bad</span>
            <div className="text-xs font-mono">
              <span className="text-[#ffb4ab] font-bold block uppercase">COMPLIANCE REJECTED THE PLAN</span>
              <p className="text-[#bec8d2] mt-0.5 font-body">{verdict.reason}</p>
              <p className="text-[#88929b] mt-1 font-body">
                A hard violation is never sent for approval, whatever the cost. {c.replan_count > 0 ? `The optimizer already replanned ${c.replan_count}× without the offenders.` : ''}
              </p>
            </div>
          </div>
        )}
        {verdict.status === 'ESCALATED' && (
          <div className="p-4 bg-[#060e20] border-l-4 border-[#ffb95f] rounded flex items-start gap-3">
            <span className="material-symbols-outlined text-[#ffb95f] text-[22px] flex-shrink-0">warning</span>
            <div className="text-xs font-mono">
              <span className="text-[#ffb95f] font-bold block uppercase">HUMAN APPROVAL REQUIRED</span>
              <p className="text-[#bec8d2] mt-0.5 font-body">{verdict.reason}</p>
            </div>
          </div>
        )}
        {verdict.status === 'APPROVED' && (
          <div className="p-4 bg-[#060e20] border-l-4 border-[#4edea3] rounded flex items-start gap-3">
            <span className="material-symbols-outlined text-[#4edea3] text-[22px] flex-shrink-0">verified</span>
            <div className="text-xs font-mono">
              <span className="text-[#4edea3] font-bold block uppercase">IN POLICY — NO HUMAN DECISION NEEDED</span>
              <p className="text-[#bec8d2] mt-0.5 font-body">{verdict.reason}</p>
            </div>
          </div>
        )}

        {/* Checks */}
        <div className="space-y-3">
          <h3 className="text-sm font-headline font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-[#4edea3] text-[18px]">verified</span>
            <span>Automated Policy Checks ({verdict.checks.filter((k) => k.passed).length}/{verdict.checks.length} passed)</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
            {verdict.checks.map((check, i) => (
              <CheckCard key={check.name} check={check} index={i} />
            ))}
          </div>
        </div>

        {sim.error && (
          <div className="p-3 bg-[#060e20] border border-[#93000a] rounded-lg text-xs font-mono text-[#ffb4ab] flex items-start justify-between gap-3">
            <span>{sim.error}</span>
            <button onClick={sim.clearError} className="text-[#88929b] hover:text-white">
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        )}

        {/* The decision */}
        {pending && (
          <div className="pt-4 border-t border-[#3e4850] space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-[#88929b] block mb-1">Decided by (recorded in the audit trail)</label>
                <input
                  value={approver}
                  onChange={(e) => setApproverPersist(e.target.value)}
                  placeholder="Your name"
                  maxLength={100}
                  className="w-full h-9 bg-[#060e20] text-sm font-mono text-white placeholder-[#88929b] rounded border border-[#3e4850] focus:outline-hidden focus:border-[#89ceff] px-2"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] font-mono uppercase tracking-wider text-[#88929b] block mb-1">Note (optional)</label>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={1000}
                  className="w-full h-9 bg-[#060e20] text-sm font-body text-white rounded border border-[#3e4850] focus:outline-hidden focus:border-[#89ceff] px-2"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-mono text-[#88929b]">
                <span className="material-symbols-outlined text-[#89ceff]">fingerprint</span>
                <span>Names are recorded but not authenticated (there is no login). The decision is tied to plan version {c.version}: if the plan changes first, it is refused.</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => decide('reject')}
                  disabled={!canDecide}
                  className="px-4 py-2 border border-[#3e4850] hover:bg-[#222a3d] disabled:opacity-40 disabled:cursor-not-allowed text-white font-headline text-xs rounded transition-colors"
                  title="Ends this simulation as REJECTED; run a new scenario to plan again"
                >
                  Reject Plan
                </button>
                <button
                  onClick={() => decide('approve')}
                  disabled={!canDecide}
                  className="px-6 py-2.5 bg-[#00a572] hover:bg-[#4edea3] hover:text-[#003824] disabled:opacity-40 disabled:cursor-not-allowed text-white font-headline text-xs font-bold rounded flex items-center gap-2 shadow-lg shadow-[#00a572]/20 transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">check</span>
                  <span>APPROVE PLAN</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {c.approval.status === 'APPROVED' && (
          <div className="p-4 bg-[#00a572]/20 border-2 border-[#4edea3] rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-[#4edea3] text-[#003824] flex items-center justify-center font-bold flex-shrink-0">
                <span className="material-symbols-outlined text-[20px]">done_all</span>
              </div>
              <div className="text-xs font-mono">
                <h4 className="text-[#4edea3] font-bold text-sm uppercase">PLAN APPROVED{decidedBy ? ` BY ${decidedBy.toUpperCase()}` : ''} — FINALIZED</h4>
                <p className="text-[#bec8d2] mt-0.5">{c.approval.decision ? `Recorded ${c.approval.decision.decided_at}${c.approval.decision.note ? ` · "${c.approval.decision.note}"` : ''}` : ''}</p>
                <p className="text-[#88929b] text-[10px] mt-0.5">This finalizes the plan in this app's world state. No purchase orders are sent anywhere: there is no ERP connection.</p>
              </div>
            </div>
            <button onClick={() => onNavigate('scenarios')} className="px-4 py-2 bg-[#131b2e] hover:bg-[#222a3d] border border-[#3e4850] text-[#89ceff] font-headline text-xs font-bold rounded transition-colors whitespace-nowrap">
              View Benchmark Comparison
            </button>
          </div>
        )}

        {c.approval.status === 'REJECTED' && (
          <div className="p-4 bg-[#93000a]/20 border border-[#ffb4ab] rounded-lg text-xs font-mono">
            <span className="font-bold block uppercase text-[#ffb4ab]">PLAN REJECTED{decidedBy ? ` BY ${decidedBy.toUpperCase()}` : ''}</span>
            <p className="text-[#bec8d2] mt-0.5 font-body">{c.approval.decision?.note || 'No note recorded.'} The simulation is closed; run a new scenario to plan again.</p>
          </div>
        )}
      </div>
    </div>
  );
};
