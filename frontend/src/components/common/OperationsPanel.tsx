import React, { useState } from 'react';
import { getMetrics, getModelMonitoring, getReady } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import { ErrorBlock, LoadingBlock } from './StateNotice';
import { CounterRow, MetricsSnapshot, SummaryRow } from '../../types/api';
import { fmtNumber } from '../../utils/format';

// What an operator wants to know about the running system, straight from the backend's own
// counters (GET /api/metrics, /api/monitoring/model, /api/ready). Nothing here is computed
// from the run the page happens to be showing: it is the whole process since it started.

const counters = (m: MetricsSnapshot, name: string): CounterRow[] => m.counters[name] ?? [];
const summaries = (m: MetricsSnapshot, name: string): SummaryRow[] => m.summaries[name] ?? [];
const total = (rows: CounterRow[]) => rows.reduce((n, r) => n + r.value, 0);
const ms = (v: number | null | undefined) => (v === null || v === undefined ? '—' : v >= 1000 ? `${(v / 1000).toFixed(1)}s` : `${v.toFixed(v < 10 ? 1 : 0)}ms`);
const by = (rows: CounterRow[], key: string) => rows.map((r) => `${r.labels[key]} ${fmtNumber(r.value)}`).join(' · ') || '—';

const Card: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="p-4 bg-[#060e20] rounded-lg border border-[#3e4850]/70 space-y-2 text-xs font-mono">
    <span className="text-[10px] uppercase tracking-wider text-[#88929b] block font-bold">{title}</span>
    {children}
  </div>
);

const Line: React.FC<{ label: string; value: React.ReactNode; tone?: 'bad' | 'good' | 'warn' }> = ({ label, value, tone }) => (
  <div className="flex justify-between gap-3">
    <span className="text-[#88929b] truncate min-w-0" title={label}>{label}</span>
    <span className={`font-bold text-right whitespace-nowrap ${tone === 'bad' ? 'text-[#ffb4ab]' : tone === 'good' ? 'text-[#4edea3]' : tone === 'warn' ? 'text-[#ffb95f]' : 'text-white'}`}>{value}</span>
  </div>
);

export const OperationsPanel: React.FC<{ refreshOn: unknown[]; defaultProductId?: string }> = ({ refreshOn, defaultProductId = '22197' }) => {
  const metrics = useFetch(getMetrics, [], true, refreshOn);
  const model = useFetch(() => getModelMonitoring(), [], true, refreshOn);
  const ready = useFetch(getReady, [], true, refreshOn);
  const [backtesting, setBacktesting] = useState(false);
  const [backtestError, setBacktestError] = useState<string | null>(null);

  const runBacktest = async () => {
    setBacktesting(true);
    setBacktestError(null);
    try {
      await getModelMonitoring(defaultProductId);
      model.reload();
    } catch (err) {
      setBacktestError(err instanceof Error ? err.message : String(err));
    } finally {
      setBacktesting(false);
    }
  };

  const m = metrics.data;
  const mm = model.data;
  const requests = m ? counters(m, 'http_requests_total') : [];
  const serverErrors = requests.filter((r) => r.labels.status.startsWith('5')).reduce((n, r) => n + r.value, 0);
  const clientErrors = requests.filter((r) => r.labels.status.startsWith('4')).reduce((n, r) => n + r.value, 0);
  const slowest = m ? [...summaries(m, 'http_request_duration_ms')].sort((a, b) => b.p95 - a.p95).slice(0, 3) : [];
  const steps = m ? summaries(m, 'run_step_duration_ms') : [];
  const solve = m ? summaries(m, 'optimization_solve_ms')[0] : undefined;
  const runDuration = m ? summaries(m, 'run_duration_ms')[0] : undefined;
  const llmLatency = m ? summaries(m, 'llm_latency_ms')[0] : undefined;
  const llmCalls = m ? counters(m, 'llm_calls_total') : [];
  const llmErrors = llmCalls.filter((r) => r.labels.result === 'error').reduce((n, r) => n + r.value, 0);

  return (
    <div className="bg-[#131b2e] border border-[#3e4850] rounded-lg p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#3e4850] pb-3">
        <div>
          <h3 className="text-base font-headline font-bold text-white">Operations</h3>
          <p className="text-[11px] font-mono text-[#88929b]">
            This process since it started{m ? ` (${Math.round(m.uptime_seconds / 60)} min)` : ''} · counters are in-process: one backend worker, or scrape each ·{' '}
            <span className="text-[#89ceff]">/api/metrics?format=prometheus</span> for a scraper
          </p>
        </div>
        <button onClick={() => { metrics.reload(); model.reload(); ready.reload(); }} className="px-2.5 py-1 rounded border border-[#3e4850] text-[#bec8d2] hover:bg-[#222a3d] text-[11px] font-mono">
          Refresh
        </button>
      </div>

      {metrics.error && <ErrorBlock error={metrics.error} onRetry={metrics.reload} />}
      {metrics.loading && !m && <LoadingBlock label="Loading metrics…" />}

      {m && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <Card title="HTTP">
            <Line label="Requests" value={fmtNumber(total(requests))} />
            <Line label="Client errors (4xx)" value={fmtNumber(clientErrors)} />
            <Line label="Server errors (5xx)" value={fmtNumber(serverErrors)} tone={serverErrors > 0 ? 'bad' : 'good'} />
            {slowest.map((s) => (
              <Line key={s.labels.route} label={s.labels.route.replace('/api/', '')} value={`p95 ${ms(s.p95)}`} />
            ))}
          </Card>

          <Card title="Pipeline runs">
            <Line label="Finished" value={by(counters(m, 'runs_total'), 'outcome')} />
            <Line label="In flight" value={fmtNumber(m.gauges.runs_in_flight?.[0]?.value ?? 0)} />
            <Line label="Duration p50 / p95" value={runDuration ? `${ms(runDuration.p50)} / ${ms(runDuration.p95)}` : '—'} />
            <Line label="Replans" value={fmtNumber(total(counters(m, 'replans_total')))} />
            <Line label="Failed steps" value={fmtNumber(total(counters(m, 'run_steps_failed_total')))} tone={total(counters(m, 'run_steps_failed_total')) > 0 ? 'bad' : undefined} />
            {steps.map((s) => (
              <Line key={s.labels.step} label={s.labels.step} value={`${ms(s.p50)} / ${ms(s.p95)} (×${s.count})`} />
            ))}
          </Card>

          <Card title="Optimizer, compliance, approvals">
            <Line label="Solves" value={by(counters(m, 'optimizations_total'), 'status')} />
            <Line label="Solve time p50 / p95" value={solve ? `${ms(solve.p50)} / ${ms(solve.p95)}` : '—'} />
            <Line label="Compliance" value={by(counters(m, 'compliance_verdicts_total'), 'status')} />
            <Line label="Human decisions" value={by(counters(m, 'approvals_total'), 'decision')} />
            <Line label="Checkpoints" value={fmtNumber(total(counters(m, 'checkpoints_total')))} />
          </Card>

          <Card title="Language model">
            <Line label="Calls" value={by(llmCalls, 'result')} tone={llmErrors > 0 ? 'warn' : undefined} />
            <Line label="Latency p50 / p95" value={llmLatency ? `${ms(llmLatency.p50)} / ${ms(llmLatency.p95)}` : '—'} />
            <Line label="Retries" value={fmtNumber(total(counters(m, 'llm_retries_total')))} />
            <Line label="Refused (circuit open)" value={fmtNumber(total(counters(m, 'llm_circuit_open_total')))} tone={total(counters(m, 'llm_circuit_open_total')) > 0 ? 'bad' : undefined} />
            <Line label="Sensing" value={by(counters(m, 'sensing_outcomes_total'), 'status')} />
            {llmCalls.length === 0 && <p className="text-[10px] font-body text-[#88929b]">No call yet — a defined scenario's trigger is structured, so it never calls the model.</p>}
          </Card>
        </div>
      )}

      {model.error && <ErrorBlock error={model.error} onRetry={model.reload} />}
      {mm && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <Card title="Demand model">
            <Line label="Version" value={Object.keys(mm.model_versions).join(', ') || 'no inference yet'} />
            <Line label="Predictions" value={fmtNumber(mm.inference_count)} />
            <Line label="Latency p50 / p95" value={`${ms(mm.latency_ms.p50)} / ${ms(mm.latency_ms.p95)}`} />
            <Line label="Missing-feature rate" value={mm.missing_feature_rate === null ? '—' : `${(mm.missing_feature_rate * 100).toFixed(1)}%`} tone={(mm.missing_feature_rate ?? 0) > 0 ? 'warn' : undefined} />
          </Card>

          <Card title={`Drift (threshold ${mm.drift.threshold_z}σ)`}>
            <Line label="Products checked" value={fmtNumber(mm.drift.products_checked)} />
            <Line label="Drifting" value={fmtNumber(mm.drift.products_drifting)} tone={mm.drift.products_drifting > 0 ? 'warn' : 'good'} />
            {Object.entries(mm.drift.by_product).map(([p, d]) => (
              <Line
                key={p}
                label={`product ${p}`}
                value={d.z === null ? d.status : `${d.status} ${d.z > 0 ? '+' : ''}${d.z}σ`}
                tone={d.status === 'DRIFT' ? 'warn' : d.status === 'OK' ? 'good' : undefined}
              />
            ))}
            <p className="text-[10px] font-body text-[#88929b]">A warning means recent demand looks unlike the training data, so forecasts deserve more suspicion — not that they are wrong. {mm.drift.window_days}-day window vs. training-time 28-day means.</p>
          </Card>

          <Card title="Prediction error (backtest)">
            {Object.values(mm.backtests).map((b) => (
              <Line key={b.product_id} label={`product ${b.product_id} · ${b.horizon_days}d to ${b.as_of}`} value={b.wape === null ? 'n/a' : `WAPE ${(b.wape * 100).toFixed(0)}%`} tone={b.wape !== null && b.wape > 0.5 ? 'warn' : 'good'} />
            ))}
            {Object.keys(mm.backtests).length === 0 && <p className="text-[10px] font-body text-[#88929b]">Not measured yet. A backtest forecasts the last days of known history from before them and scores it against what happened.</p>}
            <button onClick={runBacktest} disabled={backtesting} className="px-2.5 py-1 rounded border border-[#3e4850] text-[#89ceff] hover:bg-[#222a3d] disabled:opacity-50 text-[11px]">
              {backtesting ? 'Scoring…' : `Backtest product ${defaultProductId}`}
            </button>
            {backtestError && <p className="text-[10px] text-[#ffb4ab]">{backtestError}</p>}
          </Card>
        </div>
      )}

      {ready.data && (
        <div className="p-4 bg-[#060e20] rounded-lg border border-[#3e4850]/70 space-y-2 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-[#88929b] font-bold">Readiness</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${ready.data.ready ? (ready.data.degraded ? 'bg-[#d88a00]/30 text-[#ffb95f]' : 'bg-[#00a572]/20 text-[#4edea3]') : 'bg-[#93000a] text-[#ffdad6]'}`}>
              {ready.data.ready ? (ready.data.degraded ? 'READY · DEGRADED' : 'READY') : 'NOT READY'}
            </span>
          </div>
          <ul className="space-y-1">
            {ready.data.checks.map((c) => (
              <li key={c.name} className="flex items-start gap-2">
                <span className={c.ok ? 'text-[#4edea3]' : c.required ? 'text-[#ffb4ab]' : 'text-[#ffb95f]'}>{c.ok ? '✓' : c.required ? '✗' : '!'}</span>
                <span className="text-white w-28 flex-shrink-0">{c.name}{c.required ? '' : ' (optional)'}</span>
                <span className="text-[#bec8d2] font-body">{c.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
