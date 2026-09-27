import React, { useEffect, useState } from 'react';
import { getScenarioComparison, getScenarios } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import { productLabel, useProducts } from '../../hooks/useProducts';
import { useSimulation } from '../../context/SimulationContext';
import { ComparisonCards } from '../common/ComparisonCards';
import { ErrorBlock, LoadingBlock } from '../common/StateNotice';
import { ViewMode } from '../../types';

interface ScenariosViewProps {
  onNavigate: (view: ViewMode) => void;
}

export const ScenariosView: React.FC<ScenariosViewProps> = ({ onNavigate }) => {
  const sim = useSimulation();
  const scenarios = useFetch(getScenarios, []);
  const products = useProducts();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [productId, setProductId] = useState<string>('22197');

  const list = scenarios.data ?? [];
  const selected = list.find((s) => s.scenario_id === selectedId) ?? null;

  // start on the first scenario the model can actually simulate
  useEffect(() => {
    if (!selectedId && list.length) setSelectedId((list.find((s) => s.modeled) ?? list[0]).scenario_id);
  }, [list, selectedId]);

  const comparison = useFetch(() => getScenarioComparison(selected!.scenario_id, productId), [selected?.scenario_id, productId], !!selected?.modeled);

  const runThrough = async () => {
    if (!selected) return;
    if (await sim.startScenario({ scenarioId: selected.scenario_id, productId })) onNavigate('simulator');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-line">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-mono font-bold rounded-lg">SCENARIO BENCHMARK</span>
            <span className="text-[11px] font-mono text-muted">Normal operations vs. doing nothing vs. the optimized response · computed live, no LLM</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-headline font-bold text-ink tracking-tight mt-1">Scenario Comparison</h1>
          <p className="text-sm font-body text-ink-2 mt-0.5">
            What a disruption does to a product's supply plan, and what the optimizer's response costs and buys. The baseline is a modeled counterfactual — there are no shipment records.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-[10px] font-mono uppercase text-muted">Product</label>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="h-8 bg-inset text-xs font-mono text-ink rounded-lg border border-line focus:outline-hidden focus:border-primary px-2"
          >
            {(products.plannable.length ? products.plannable : [{ product_id: productId, supplier_count: 0, has_suppliers: true }]).map((p) => (
              <option key={p.product_id} value={p.product_id}>{productLabel(p)}</option>
            ))}
          </select>
        </div>
      </div>

      {scenarios.error && <ErrorBlock error={scenarios.error} onRetry={scenarios.reload} />}
      {scenarios.loading && !scenarios.data && <LoadingBlock label="Loading the scenario definitions…" />}

      {list.length > 0 && (
        <div className="p-5 bg-card rounded-2xl space-y-4 shadow-card">
          <label className="text-[11px] font-mono uppercase tracking-wider text-muted block font-semibold">Pick a scenario:</label>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
            {list.map((s) => (
              <button
                key={s.scenario_id}
                onClick={() => setSelectedId(s.scenario_id)}
                className={`p-3 text-left rounded-lg border transition-all text-xs font-mono flex flex-col gap-1 ${
                  s.scenario_id === selectedId
                    ? 'bg-raised border-primary text-primary shadow-md shadow-primary/10'
                    : s.modeled
                    ? 'bg-inset border-line text-ink-2 hover:border-muted hover:text-ink'
                    : 'bg-inset border-line text-muted hover:border-muted'
                }`}
              >
                <span className="font-bold">{s.label}</span>
                {s.modeled ? (
                  <span className="text-[10px] text-muted">
                    {s.event?.severity} · {s.event?.estimated_duration}d · {s.event?.event_type.replace(/_/g, ' ')}
                  </span>
                ) : (
                  <span className="text-[10px] text-warning">NOT MODELED YET</span>
                )}
              </button>
            ))}
          </div>

          {selected && (
            <div className="pt-3 border-t border-line flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="space-y-1 max-w-3xl">
                <p className="text-sm font-body text-ink-2">{selected.description}</p>
                {selected.event && (
                  <p className="text-[11px] font-mono text-muted">
                    {selected.event.location}
                    {selected.event.affected_routes.length > 0 && ` · routes ${selected.event.affected_routes.join(', ')}`}
                    {selected.event.affected_suppliers.length > 0 && selected.modeled && selected.tariff_changes.length === 0 && ` · suppliers ${selected.event.affected_suppliers.join(', ')}`}
                    {selected.tariff_changes.map((t) => ` · ${t.iso3} tariff ${t.baseline_pct}% → ${t.scenario_pct}%`).join('')}
                  </p>
                )}
              </div>
              {selected.modeled && (
                <button
                  onClick={runThrough}
                  disabled={sim.busy}
                  className="px-4 py-2 bg-primary hover:bg-primary-strong disabled:opacity-50 text-white font-headline text-xs font-bold rounded-lg flex items-center gap-2 whitespace-nowrap transition-colors self-start md:self-center"
                  title="Creates a simulation and runs the full pipeline on it (sensing, agents, optimizer, compliance) — no LLM call"
                >
                  <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                  <span>Run through the full pipeline</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {sim.error && (
        <div className="p-3 bg-card border border-danger/40 rounded-2xl text-xs font-mono text-danger flex items-start justify-between gap-3 shadow-card">
          <span>{sim.error}</span>
          <button onClick={sim.clearError} className="text-muted hover:text-ink">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {selected && !selected.modeled && (
        <div className="p-5 bg-card border border-warning/50 rounded-2xl space-y-2 shadow-card">
          <div className="flex items-center gap-2 text-warning text-xs font-mono font-bold uppercase">
            <span className="material-symbols-outlined text-[18px]">block</span>
            <span>Not simulated: the model can't represent it yet</span>
          </div>
          <p className="text-sm font-body text-ink-2">{selected.not_modeled_reason}</p>
          <p className="text-xs font-body text-muted">A number here would have to be invented, so there isn't one.</p>
        </div>
      )}

      {selected?.modeled && comparison.error && <ErrorBlock error={comparison.error} onRetry={comparison.reload} />}
      {selected?.modeled && comparison.loading && !comparison.data && <LoadingBlock label="Solving the baseline, evaluating inaction and optimizing the response…" />}
      {selected?.modeled && comparison.data && <ComparisonCards c={comparison.data} />}
    </div>
  );
};
