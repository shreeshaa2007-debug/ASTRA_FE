import React, { useState } from 'react';
import { getDecision, getSuppliers } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import { useSimulation } from '../../context/SimulationContext';
import { productLabel, useProducts } from '../../hooks/useProducts';
import { ErrorBlock, LoadingBlock, StatusPill } from '../common/StateNotice';
import { ViewMode } from '../../types';
import { ApiSupplier } from '../../types/api';
import { fmtNumber, fmtPct, fmtShare } from '../../utils/format';

interface SourcingViewProps {
  onNavigate: (view: ViewMode) => void;
}

const STATUS_BAR: Record<string, string> = { ACTIVE: '#89ceff', REDUCED: '#ffb95f', DISRUPTED: '#ffb4ab' };
const MIX_COLORS = ['#89ceff', '#4edea3', '#ffb95f', '#c4b5fd', '#f9a8d4'];

export const SourcingView: React.FC<SourcingViewProps> = ({ onNavigate }) => {
  const { simulationId, status } = useSimulation();
  const version = status?.version;
  const [productChoice, setProductChoice] = useState<string>('22197');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const products = useProducts();

  // With a simulation: its status overlay, for the product its plan covers (the API picks it).
  // Without one: the baseline roster for the chosen product.
  const suppliers = useFetch(
    () => getSuppliers(simulationId ?? undefined, simulationId ? undefined : productChoice),
    [simulationId, simulationId ? null : productChoice],
    true,
    [version]
  );
  const decision = useFetch(() => getDecision(simulationId!), [simulationId], !!simulationId, [version]);

  const data = suppliers.data;
  const product = data?.product_id ?? productChoice;
  const rows: ApiSupplier[] = (data?.suppliers ?? []).filter((s) => s.product_id === product);
  const mix = data?.recommended_mix ?? null;
  const hasPlan = !!mix && mix.length > 0;

  const selected = rows.find((s) => `${s.supplier_id}-${s.product_id}` === selectedKey) ?? rows[0] ?? null;
  const maxCapacity = Math.max(1, ...rows.map((s) => s.capacity));

  const excluded = decision.data?.excluded_options.filter((e) => selected && e.kind === 'supplier' && e.id === selected.supplier_id) ?? [];
  const deviations = decision.data?.deviations.filter((v) => selected && v.agent === 'sourcing' && v.recommended.includes(selected.supplier_id)) ?? [];

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#3e4850]">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 bg-[#00a572]/20 text-[#4edea3] text-[10px] font-mono font-bold rounded">SUPPLIER ROSTER &amp; TARIFF EXPOSURE</span>
            <span className="text-[11px] font-mono text-[#88929b]">Suppliers are synthetic (no public dataset has capacity or cost) · tariffs are real World Bank rates</span>
            {data?.label && <span className="px-2 py-0.5 bg-[#0ea5e9]/20 text-[#89ceff] text-[10px] font-mono font-bold rounded">{data.label}</span>}
          </div>
          <h1 className="text-2xl sm:text-3xl font-headline font-bold text-white tracking-tight mt-1">Sourcing Intelligence</h1>
          <p className="text-sm font-body text-[#bec8d2] mt-0.5">
            {simulationId ? `Supplier status as of simulation ${simulationId}, and the mix its plan recommends.` : 'Baseline supplier roster. Run a simulation to overlay disruptions and see a recommended mix.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-[10px] font-mono uppercase text-[#88929b]">Product</label>
          <select
            value={product}
            disabled={!!simulationId && !!data?.product_id}
            onChange={(e) => setProductChoice(e.target.value)}
            title={simulationId && data?.product_id ? 'A simulation plans one product; this is that product.' : undefined}
            className="h-8 bg-[#060e20] text-xs font-mono text-white rounded border border-[#3e4850] focus:outline-hidden focus:border-[#89ceff] px-2 disabled:opacity-70"
          >
            {(simulationId && data?.product_id ? [{ product_id: product, supplier_count: 0, has_suppliers: true }] : products.plannable).map((p) => (
              <option key={p.product_id} value={p.product_id}>{simulationId && data?.product_id ? p.product_id : productLabel(p)}</option>
            ))}
          </select>
          <button onClick={() => onNavigate('compliance')} className="px-4 py-2 bg-[#0ea5e9] hover:bg-[#89ceff] hover:text-[#00344d] text-white font-headline text-xs font-bold rounded transition-colors">
            Review Approvals
          </button>
        </div>
      </div>

      {suppliers.error && <ErrorBlock error={suppliers.error} onRetry={suppliers.reload} />}
      {suppliers.loading && !data && <LoadingBlock />}

      {data && (
        <>
          {/* Capacity vs recommended mix */}
          <div className="bg-[#131b2e] border border-[#3e4850] rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#3e4850] pb-3">
              <h2 className="text-lg font-headline font-bold text-white">Supply available vs. the recommended mix — product {product}</h2>
              <span className="text-xs font-mono text-[#88929b]">{rows.length} suppliers</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="p-4 bg-[#060e20] rounded-lg border border-[#3e4850] space-y-3">
                <span className="text-xs font-mono font-bold text-[#bec8d2] uppercase">Available capacity (units)</span>
                <div className="space-y-3 pt-1">
                  {rows.map((s) => (
                    <div key={s.supplier_id}>
                      <div className="flex justify-between text-xs font-mono">
                        <span className={s.status === 'DISRUPTED' ? 'text-[#ffb4ab] font-bold' : 'text-white'}>{s.supplier_id} · {s.supplier_name}</span>
                        <span className="font-bold" style={{ color: STATUS_BAR[s.status] ?? '#89ceff' }}>{fmtNumber(s.capacity)} {s.status !== 'ACTIVE' ? `(${s.status})` : ''}</span>
                      </div>
                      <div className="w-full bg-[#1e293b] h-2 rounded-full overflow-hidden mt-1">
                        <div className="h-full" style={{ width: `${(s.capacity / maxCapacity) * 100}%`, background: STATUS_BAR[s.status] ?? '#89ceff' }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`p-4 bg-[#060e20] rounded-lg ${hasPlan ? 'border-2 border-[#0ea5e9] shadow-lg shadow-[#0ea5e9]/10' : 'border border-[#3e4850]'} space-y-3`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[#89ceff] uppercase">Recommended sourcing mix</span>
                  {hasPlan && data.label && <span className="px-2 py-0.5 bg-[#0ea5e9] text-[#00344d] text-[10px] font-mono font-bold rounded">{data.label.toUpperCase()}</span>}
                </div>
                {hasPlan ? (
                  <div className="space-y-3 pt-1">
                    {mix!.map((m, i) => (
                      <div key={m.supplier_id}>
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-white">{m.supplier_id} · {rows.find((r) => r.supplier_id === m.supplier_id)?.supplier_name ?? ''}</span>
                          <span className="font-bold" style={{ color: MIX_COLORS[i % MIX_COLORS.length] }}>{fmtShare(m.share)} ({fmtNumber(m.quantity)})</span>
                        </div>
                        <div className="w-full bg-[#1e293b] h-2 rounded-full overflow-hidden mt-1">
                          <div className="h-full" style={{ width: `${m.share * 100}%`, background: MIX_COLORS[i % MIX_COLORS.length] }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs font-body text-[#88929b] pt-1">
                    No plan for this product yet, so there is no recommended mix. There is also no "current" procurement split in the data — the mix is only ever what an optimizer run produces.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Detail + table */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-4 bg-[#131b2e] border border-[#3e4850] rounded-lg p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#3e4850] pb-3">
                <h3 className="text-sm font-headline font-bold text-white">Supplier Dossier</h3>
                {selected && <StatusPill value={selected.status} />}
              </div>

              {selected ? (
                <div className="space-y-3 font-mono text-xs">
                  <div>
                    <span className="text-[#88929b] block text-[10px]">SUPPLIER</span>
                    <span className="text-white font-bold text-base">{selected.supplier_name}</span>
                    <span className="text-[#88929b] text-[11px] block">{selected.supplier_id} · {selected.region}</span>
                  </div>

                  <div className="p-3 bg-[#060e20] rounded border border-[#3e4850]/60 space-y-1.5">
                    <div className="flex justify-between"><span className="text-[#bec8d2]">Capacity:</span><span className="text-white font-bold">{fmtNumber(selected.capacity)} units</span></div>
                    <div className="flex justify-between"><span className="text-[#bec8d2]">Lead time:</span><span className="text-[#89ceff] font-bold">{selected.lead_time_days} d</span></div>
                    <div className="flex justify-between"><span className="text-[#bec8d2]">Unit cost:</span><span className="text-white font-bold">{fmtNumber(selected.unit_cost, 2)}</span></div>
                    <div className="flex justify-between"><span className="text-[#bec8d2]">Tariff ({selected.region}):</span><span className="text-[#ffb95f] font-bold">{fmtPct(selected.tariff_rate_pct, 2)}</span></div>
                    <div className="flex justify-between"><span className="text-[#bec8d2]">Reliability:</span><span className="text-white font-bold">{fmtShare(selected.reliability, 0)}</span></div>
                    <div className="flex justify-between"><span className="text-[#bec8d2]">Risk level:</span><StatusPill value={selected.risk_level} /></div>
                  </div>

                  <div className="pt-2 border-t border-[#3e4850]/50 space-y-1.5">
                    <span className="text-[#88929b] block text-[10px]">IN THE CURRENT PLAN</span>
                    <p className="text-[11px] font-body text-[#bec8d2] leading-relaxed">
                      {selected.recommended_quantity === null
                        ? 'No plan covers this product yet.'
                        : selected.recommended_quantity > 0
                        ? `The optimizer buys ${fmtNumber(selected.recommended_quantity)} units from this supplier.`
                        : 'The optimizer buys nothing from this supplier.'}
                    </p>
                    {excluded.map((e) => (
                      <p key={e.id} className="text-[11px] font-body text-[#ffb4ab]">Excluded from the plan: {e.reason}</p>
                    ))}
                    {deviations.map((v, i) => (
                      <p key={i} className="text-[11px] font-body text-[#88929b]">
                        The Sourcing Agent alone suggested {v.recommended}; the joint plan uses {v.planned}. {v.reason}
                      </p>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs font-body text-[#88929b]">No supplier records for this product.</p>
              )}
            </div>

            <div className="lg:col-span-8 bg-[#131b2e] border border-[#3e4850] rounded-lg p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#3e4850] pb-3">
                <h3 className="text-sm font-headline font-bold text-white">Supplier roster</h3>
                <span className="text-xs font-mono text-[#88929b]">Click a row to inspect</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-[#060e20] text-[#88929b] text-[10px] uppercase border-b border-[#3e4850]">
                    <tr>
                      <th className="p-3">Supplier</th>
                      <th className="p-3">Region</th>
                      <th className="p-3 text-right">Lead time</th>
                      <th className="p-3 text-right">Unit cost</th>
                      <th className="p-3 text-right">Tariff</th>
                      <th className="p-3 text-right">Reliab.</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Planned</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#3e4850]/50 text-[#bec8d2]">
                    {rows.map((s) => {
                      const key = `${s.supplier_id}-${s.product_id}`;
                      const isSelected = selected && key === `${selected.supplier_id}-${selected.product_id}`;
                      return (
                        <tr key={key} onClick={() => setSelectedKey(key)} className={`cursor-pointer transition-colors ${isSelected ? 'bg-[#222a3d] text-white' : 'hover:bg-[#171f33]'}`}>
                          <td className="p-3 font-bold text-white">
                            <div>{s.supplier_name}</div>
                            <div className="text-[10px] text-[#88929b]">{s.supplier_id}</div>
                          </td>
                          <td className="p-3 text-[11px]">{s.region}</td>
                          <td className="p-3 text-right tabular-nums">{s.lead_time_days}d</td>
                          <td className="p-3 text-right tabular-nums">{fmtNumber(s.unit_cost, 2)}</td>
                          <td className="p-3 text-right tabular-nums">{fmtPct(s.tariff_rate_pct, 2)}</td>
                          <td className="p-3 text-right tabular-nums">{fmtShare(s.reliability, 0)}</td>
                          <td className="p-3"><StatusPill value={s.status} /></td>
                          <td className="p-3 text-right font-bold tabular-nums">{s.recommended_quantity === null ? '—' : fmtNumber(s.recommended_quantity)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
