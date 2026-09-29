/**
 * Manual disruption entry — the live-presentation path.
 *
 * Two real modes, both hitting the actual backend pipeline (docs/api-plan.md), never a
 * client-side fake:
 *   "Describe it"   free text -> POST /api/simulations + /run (signal), goes through the real
 *                    Sensing Agent (LLM). This is what lets someone type a disruption on stage.
 *   "Quick scenario" one of the 4 real defined scenarios (backend/config/scenarios.yaml) ->
 *                    POST /api/scenarios/{id}/run — deterministic, no LLM latency/variance,
 *                    useful as a rehearsed fallback if the live free-text path is asked about.
 */
import React, { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, Radio, Send, X } from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';
import { useOilShield } from '../../context/OilShieldContext';
import { useFetch } from '../../hooks/useFetch';
import { getProducts, getScenarios } from '../../services/api';

const MAX_SIGNAL_CHARS = 4000; // matches backend/config/sensing_config.yaml's limit; the backend is the source of truth, this is just a live counter

export const ReportDisruptionModal: React.FC = () => {
  const { isReportModalOpen, closeReportModal } = useOilShield();
  const sim = useSimulation();
  const productsQ = useFetch(() => getProducts(), [], isReportModalOpen);
  const scenariosQ = useFetch(() => getScenarios(), [], isReportModalOpen);

  const [mode, setMode] = useState<'manual' | 'scenario'>('manual');
  const [signal, setSignal] = useState('');
  const [productId, setProductId] = useState('');
  const [scenarioId, setScenarioId] = useState('');

  const plannable = (productsQ.data ?? []).filter((p) => p.has_suppliers);
  const modeledScenarios = (scenariosQ.data ?? []).filter((s) => s.modeled);

  useEffect(() => {
    if (!productId && plannable[0]) setProductId(plannable[0].product_id);
  }, [plannable, productId]);
  useEffect(() => {
    if (!scenarioId && modeledScenarios[0]) setScenarioId(modeledScenarios[0].scenario_id);
  }, [modeledScenarios, scenarioId]);

  useEffect(() => {
    if (isReportModalOpen) sim.clearError();
  }, [isReportModalOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isReportModalOpen) return null;

  const submitManual = async () => {
    if (!signal.trim() || !productId) return;
    await sim.start({ signal: signal.trim(), productId, scenarioType: 'LIVE_REPORT' });
    if (!sim.error) {
      setSignal('');
      closeReportModal();
    }
  };

  const submitScenario = async () => {
    if (!scenarioId) return;
    const ok = await sim.startScenario({ scenarioId, productId: productId || undefined });
    if (ok) closeReportModal();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4" onMouseDown={closeReportModal}>
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-pop border border-slate-200 overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Report a Disruption</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Runs the real pipeline — Sensing, Inventory, Logistics, Sourcing, Optimizer, Compliance.</p>
          </div>
          <button onClick={closeReportModal} className="h-8 w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pt-3 flex gap-1.5">
          <button
            onClick={() => setMode('manual')}
            className={`flex-1 h-9 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${mode === 'manual' ? 'bg-[#154734] text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
          >
            <Send className="w-3.5 h-3.5" /> Describe it
          </button>
          <button
            onClick={() => setMode('scenario')}
            className={`flex-1 h-9 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${mode === 'scenario' ? 'bg-[#154734] text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
          >
            <Radio className="w-3.5 h-3.5" /> Quick scenario
          </button>
        </div>

        <div className="p-5 space-y-4">
          {mode === 'manual' ? (
            <>
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Product</label>
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="mt-1 w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                >
                  {plannable.length === 0 && <option value="">Loading products…</option>}
                  {plannable.map((p) => (
                    <option key={p.product_id} value={p.product_id}>
                      {p.product_id} ({p.supplier_count} supplier{p.supplier_count === 1 ? '' : 's'})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Disruption report</label>
                <textarea
                  value={signal}
                  onChange={(e) => setSignal(e.target.value.slice(0, MAX_SIGNAL_CHARS))}
                  placeholder="e.g. A container vessel has run aground in the Suez Canal, blocking traffic in both directions."
                  rows={5}
                  className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 resize-none focus:bg-white focus:border-[#154734] focus:outline-hidden"
                />
                <div className="mt-1 text-right text-[10px] text-slate-400">{signal.length} / {MAX_SIGNAL_CHARS}</div>
              </div>
              {sim.error && (
                <div className="flex items-start gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg text-[11px] text-red-700">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> {sim.error}
                </div>
              )}
              <button
                onClick={submitManual}
                disabled={sim.busy || !signal.trim() || !productId}
                className="w-full h-10 bg-[#154734] hover:bg-[#1b5941] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                {sim.busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                {sim.busy ? 'Running the pipeline…' : 'Run Analysis'}
              </button>
              <p className="text-[10px] text-slate-400">Goes through the real Sensing Agent (LLM). Wording may vary run to run.</p>
            </>
          ) : (
            <>
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Defined scenario</label>
                <select
                  value={scenarioId}
                  onChange={(e) => setScenarioId(e.target.value)}
                  className="mt-1 w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                >
                  {modeledScenarios.length === 0 && <option value="">Loading scenarios…</option>}
                  {modeledScenarios.map((s) => (
                    <option key={s.scenario_id} value={s.scenario_id}>{s.label}</option>
                  ))}
                </select>
                {scenarioId && (
                  <p className="mt-1.5 text-[11px] text-slate-500">{modeledScenarios.find((s) => s.scenario_id === scenarioId)?.description}</p>
                )}
              </div>
              {sim.error && (
                <div className="flex items-start gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg text-[11px] text-red-700">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> {sim.error}
                </div>
              )}
              <button
                onClick={submitScenario}
                disabled={sim.busy || !scenarioId}
                className="w-full h-10 bg-[#154734] hover:bg-[#1b5941] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                {sim.busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radio className="w-3.5 h-3.5" />}
                {sim.busy ? 'Running the pipeline…' : 'Run This Scenario'}
              </button>
              <p className="text-[10px] text-slate-400">Deterministic — no LLM call, always produces the same disruption event.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
