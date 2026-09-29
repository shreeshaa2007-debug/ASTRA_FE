import React, { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, ShieldX, CheckCircle2, XCircle, Sparkles, RefreshCw, Play } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import { ApiError, createSimulation, getCompliance, listSimulations, runSimulation } from '../../services/api';
import { ComplianceResponse } from '../../types/api';

const VERDICT: Record<ComplianceResponse['compliance']['status'], { label: string; tone: string; Icon: typeof ShieldCheck }> = {
  APPROVED: { label: 'Approved', tone: 'bg-green-50 text-green-800 border-green-200', Icon: ShieldCheck },
  ESCALATED: { label: 'Escalated to a human', tone: 'bg-amber-50 text-amber-800 border-amber-200', Icon: ShieldAlert },
  REJECTED: { label: 'Rejected', tone: 'bg-red-50 text-red-800 border-red-200', Icon: ShieldX },
};

const prettify = (name: string) => name.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

// A plan reaches Compliance only after Sensing and the optimizer have run, so a fresh run is polled until its verdict exists.
const SAMPLE_RUN = {
  scenario_type: 'SUEZ_CLOSURE',
  signal: 'A container vessel has run aground in the Suez Canal, blocking traffic.',
  product_id: '22197',
  as_of_date: '2011-11-30',
};

export const LiveComplianceVerdict: React.FC = () => {
  const sims = useFetch(() => listSimulations(undefined, 50), []);
  const [chosen, setChosen] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  // newest first: default to the most recent simulation
  const ordered = [...(sims.data ?? [])].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  const simulationId = chosen ?? ordered[0]?.simulation_id ?? null;

  const verdict = useFetch(() => getCompliance(simulationId!), [simulationId], !!simulationId);

  useEffect(() => {
    if (chosen && !ordered.some((s) => s.simulation_id === chosen)) setChosen(null);
  }, [chosen, ordered]);

  const runSample = async () => {
    setRunning(true);
    setRunError(null);
    try {
      const created = await createSimulation(SAMPLE_RUN.scenario_type);
      await runSimulation(created.simulation_id, {
        signal: SAMPLE_RUN.signal,
        product_id: SAMPLE_RUN.product_id,
        as_of_date: SAMPLE_RUN.as_of_date,
      });
      setChosen(created.simulation_id);
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        try {
          await getCompliance(created.simulation_id);
          break;
        } catch (e) {
          if (!(e instanceof ApiError && e.code === 'PLAN_NOT_READY')) throw e;
        }
      }
      sims.reload();
      verdict.reload();
    } catch (e) {
      setRunError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  };

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-2 p-4 border-b border-slate-200">
      <div>
        <h2 className="font-extrabold text-slate-900 text-sm">Live verdict from the Compliance Agent</h2>
        <p className="text-[11px] text-slate-500 mt-0.5">
          Read from the running backend for the selected simulation. The rules decide; the narration only explains.
        </p>
      </div>
      <div className="flex items-center gap-2">
        {ordered.length > 0 && (
          <select
            value={simulationId ?? ''}
            onChange={(e) => setChosen(e.target.value)}
            className="bg-white border border-slate-300 text-xs font-bold rounded-lg px-2.5 py-1.5 text-slate-900"
          >
            {ordered.map((s) => (
              <option key={s.simulation_id} value={s.simulation_id}>
                {s.simulation_id} · {s.scenario_type} · {s.status}
              </option>
            ))}
          </select>
        )}
        <button
          onClick={runSample}
          disabled={running}
          className="px-3 py-1.5 bg-primary hover:bg-primary-strong text-ink rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-60"
        >
          {running ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          {running ? 'Running…' : 'Run Suez closure check'}
        </button>
      </div>
    </div>
  );

  let body: React.ReactNode;
  if (sims.error) {
    body = (
      <Notice tone="red" title="Can't reach the backend">
        {sims.error.message}. Check that the API is running and that this site's API address (VITE_API_BASE_URL) points at it.
      </Notice>
    );
  } else if (sims.loading || (simulationId && verdict.loading && !verdict.data)) {
    body = <Notice title="Loading the verdict…" />;
  } else if (!simulationId) {
    body = (
      <Notice title="No simulations yet">
        Run the Suez closure check above. It runs the real pipeline and shows the Compliance Agent's verdict here.
      </Notice>
    );
  } else if (verdict.error) {
    const notReady = verdict.error instanceof ApiError && verdict.error.code === 'PLAN_NOT_READY';
    body = (
      <Notice tone={notReady ? 'amber' : 'red'} title={notReady ? 'This simulation has not reached compliance yet' : "Couldn't load the verdict"}>
        {verdict.error.message}
      </Notice>
    );
  } else if (verdict.data) {
    const c = verdict.data.compliance;
    const v = VERDICT[c.status];
    body = (
      <div className="p-4 space-y-4">
        <div className={`flex flex-wrap items-center gap-3 p-3 rounded-xl border ${v.tone}`}>
          <v.Icon className="w-6 h-6 flex-shrink-0" />
          <div className="flex-1 min-w-[200px]">
            <div className="font-extrabold text-sm">{v.label}</div>
            <div className="text-xs mt-0.5">{c.reason}</div>
          </div>
          <div className="text-right text-[11px] font-mono">
            <div>{c.requires_human ? 'Human sign-off required' : 'No human sign-off needed'}</div>
            <div>Approval: {verdict.data.approval.status}</div>
            {verdict.data.plan_spend != null && <div>Plan spend: ${verdict.data.plan_spend.toLocaleString()}</div>}
          </div>
        </div>

        {c.rationale && (
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-accent" /> Plain-English explanation
              <span className="font-normal text-[10px] text-slate-400">(AI-written; does not decide the verdict)</span>
            </div>
            {c.rationale.replace(/\*\*/g, '')}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-[10px] uppercase tracking-wide text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-2 pr-3">Check</th>
                <th className="py-2 pr-3">Result</th>
                <th className="py-2">Detail</th>
              </tr>
            </thead>
            <tbody>
              {c.checks.map((k) => (
                <tr key={k.name} className="border-b border-slate-100 align-top">
                  <td className="py-2 pr-3 font-semibold text-slate-800">{prettify(k.name)}</td>
                  <td className="py-2 pr-3">
                    {k.passed ? (
                      <span className="inline-flex items-center gap-1 text-green-700 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Passed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-700 font-bold">
                        <XCircle className="w-3.5 h-3.5" /> Failed
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-slate-600">
                    {k.detail}
                    {k.offenders && k.offenders.length > 0 && (
                      <div className="mt-1 text-[11px] text-red-700">Offenders: {k.offenders.join(', ')}</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {header}
      {runError && (
        <div className="m-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">Run failed: {runError}</div>
      )}
      {body}
    </div>
  );
};

const Notice: React.FC<{ title: string; tone?: 'red' | 'amber'; children?: React.ReactNode }> = ({ title, tone, children }) => (
  <div
    className={`m-4 p-4 rounded-xl border text-xs ${
      tone === 'red' ? 'bg-red-50 border-red-200 text-red-800' : tone === 'amber' ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-slate-50 border-slate-200 text-slate-600'
    }`}
  >
    <div className="font-bold">{title}</div>
    {children && <div className="mt-1">{children}</div>}
  </div>
);
