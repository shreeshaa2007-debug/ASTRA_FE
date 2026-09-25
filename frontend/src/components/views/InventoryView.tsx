import React, { useMemo, useState } from 'react';
import { getInventory, getInventoryForecast } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import { useSimulation } from '../../context/SimulationContext';
import { WAREHOUSES } from '../../data/network';
import { productLabel, useProducts } from '../../hooks/useProducts';
import { ErrorBlock, LoadingBlock, StatusPill } from '../common/StateNotice';
import { ViewMode } from '../../types';
import { ApiInventoryRow, ForecastPoint } from '../../types/api';
import { fmtNumber } from '../../utils/format';

interface InventoryViewProps {
  onNavigate: (view: ViewMode) => void;
}

const W = 600;
const H = 180;
const PAD = { l: 50, r: 20, t: 16, b: 28 };

// Actual demand (solid) followed by the model's point forecast (dashed). XGBoost
// gives no interval, so no confidence band is drawn — the API says so too.
const ForecastChart: React.FC<{ actual: ForecastPoint[]; predicted: ForecastPoint[] }> = ({ actual, predicted }) => {
  const all = [...actual, ...predicted];
  const max = Math.max(1, ...all.map((p) => p.value)) * 1.1;
  const n = all.length;
  const x = (i: number) => PAD.l + (i / Math.max(1, n - 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) => H - PAD.b - (v / max) * (H - PAD.t - PAD.b);
  const path = (pts: ForecastPoint[], offset: number) => pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(offset + i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ');
  // start the dashed line at the last actual point so the two segments join
  const predPath = predicted.length ? `M ${x(actual.length - 1).toFixed(1)} ${y(actual[actual.length - 1]?.value ?? 0).toFixed(1)} ` + path(predicted, actual.length).replace(/^M/, 'L') : '';
  const ticks = [0, 0.5, 1].map((f) => max * f);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" fill="none">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD.l} y1={y(t)} x2={W - PAD.r} y2={y(t)} stroke="#1e293b" strokeDasharray="3 3" />
          <text x={PAD.l - 6} y={y(t) + 3} fill="#88929b" fontSize="9" fontFamily="JetBrains Mono" textAnchor="end">{Math.round(t)}</text>
        </g>
      ))}
      {actual.length > 0 && <path d={path(actual, 0)} stroke="#89ceff" strokeWidth="2.2" />}
      {predPath && <path d={predPath} stroke="#4edea3" strokeWidth="2.2" strokeDasharray="5 3" />}
      {actual.length > 0 && (
        <line x1={x(actual.length - 1)} y1={PAD.t} x2={x(actual.length - 1)} y2={H - PAD.b} stroke="#3e4850" strokeDasharray="2 3" />
      )}
      {actual[0] && <text x={PAD.l} y={H - 8} fill="#88929b" fontSize="9" fontFamily="JetBrains Mono">{actual[0].date}</text>}
      {actual.length > 0 && <text x={x(actual.length - 1)} y={H - 8} fill="#88929b" fontSize="9" fontFamily="JetBrains Mono" textAnchor="middle">{actual[actual.length - 1].date}</text>}
      {predicted.length > 0 && <text x={W - PAD.r} y={H - 8} fill="#88929b" fontSize="9" fontFamily="JetBrains Mono" textAnchor="end">{predicted[predicted.length - 1].date}</text>}
    </svg>
  );
};

function riskOf(row: ApiInventoryRow): string {
  if (row.stockout_risk) return row.stockout_risk;
  return row.safety_stock !== null && row.current_stock < row.safety_stock ? 'BELOW SAFETY' : 'NOT ASSESSED';
}

export const InventoryView: React.FC<InventoryViewProps> = ({ onNavigate }) => {
  const { simulationId, status } = useSimulation();
  const version = status?.version;
  const [productChoice, setProductChoice] = useState<string>('22197');
  const [warehouse, setWarehouse] = useState<string>('Mumbai');
  const products = useProducts();

  // With a simulation whose Inventory Agent has run: its assessment (for its own product).
  const simInv = useFetch(() => getInventory(simulationId!), [simulationId], !!simulationId, [version]);
  const fromSim = simInv.data?.source === 'simulation';
  const product = fromSim ? simInv.data!.inventory[0]?.product_id ?? productChoice : productChoice;
  // Otherwise the current ledger snapshot for the chosen product.
  const ledger = useFetch(() => getInventory(undefined, productChoice), [productChoice], !simInv.loading && !fromSim);

  const rows: ApiInventoryRow[] = (fromSim ? simInv.data?.inventory : ledger.data?.inventory) ?? [];
  const selected = rows.find((r) => r.warehouse_id === warehouse) ?? rows[0] ?? null;

  const forecast = useFetch(() => getInventoryForecast(product, warehouse, 14), [product, warehouse], rows.length > 0);

  const transfers = useMemo(
    () => rows.filter((r) => r.recommended_transfer).map((r) => ({ to: r.warehouse_id, from: r.recommended_transfer!.from, quantity: r.recommended_transfer!.quantity })),
    [rows]
  );

  const loading = (simInv.loading && !simInv.data) || (!fromSim && ledger.loading && !ledger.data);
  const error = fromSim ? simInv.error : ledger.error ?? (simulationId ? simInv.error : null);

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#3e4850]">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 bg-[#d88a00]/20 text-[#ffb95f] text-[10px] font-mono font-bold rounded">MULTI-WAREHOUSE STOCK &amp; DEMAND FORECAST</span>
            <span className="text-[11px] font-mono text-[#88929b]">
              {forecast.data ? `XGBoost ${forecast.data.model_version}` : 'XGBoost demand model'} · ledger is derived from UCI retail demand with a synthetic 3-warehouse split
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-headline font-bold text-white tracking-tight mt-1">Inventory Intelligence</h1>
          <p className="text-sm font-body text-[#bec8d2] mt-0.5">
            {fromSim ? `The Inventory Agent's assessment for simulation ${simulationId}.` : 'The current ledger snapshot. Run a simulation to add forecast-based risk and transfer recommendations.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-[10px] font-mono uppercase text-[#88929b]">Product</label>
          <select
            value={fromSim ? product : productChoice}
            disabled={fromSim}
            onChange={(e) => setProductChoice(e.target.value)}
            title={fromSim ? "A simulation plans one product; this is that product." : undefined}
            className="h-8 bg-[#060e20] text-xs font-mono text-white rounded border border-[#3e4850] focus:outline-hidden focus:border-[#89ceff] px-2 disabled:opacity-70"
          >
            {(fromSim ? [{ product_id: product, supplier_count: 0, has_suppliers: true }] : products.all.length ? products.all : [{ product_id: productChoice, supplier_count: 0, has_suppliers: true }]).map((p) => (
              <option key={p.product_id} value={p.product_id}>{fromSim ? p.product_id : productLabel(p)}</option>
            ))}
          </select>
          <button onClick={() => onNavigate('compliance')} className="px-4 py-2 bg-[#131b2e] hover:bg-[#222a3d] border border-[#3e4850] text-[#dae2fd] font-headline text-xs font-bold rounded transition-colors">
            Review Approvals
          </button>
        </div>
      </div>

      {error && <ErrorBlock error={error} onRetry={() => { simInv.reload(); ledger.reload(); }} />}
      {loading && <LoadingBlock />}

      {/* Inventory Agent recommendation */}
      {!loading && !error && (
        <div className={`bg-[#131b2e] border-2 ${transfers.length ? 'border-[#89ceff]' : 'border-[#3e4850]'} rounded-lg p-5 space-y-2`}>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-[#0ea5e9] text-[#00344d] text-[10px] font-mono font-bold rounded">INVENTORY AGENT</span>
            <span className={`text-xs font-mono ${transfers.length ? 'text-[#4edea3]' : 'text-[#88929b]'}`}>{fromSim ? (transfers.length ? 'TRANSFER RECOMMENDED' : 'NO TRANSFER RECOMMENDED') : 'NOT RUN'}</span>
          </div>
          {transfers.length > 0 ? (
            <>
              {transfers.map((t) => (
                <h2 key={`${t.from}-${t.to}`} className="text-lg font-headline font-bold text-white">
                  Transfer {fmtNumber(t.quantity)} units from {t.from} → {t.to}
                </h2>
              ))}
              <p className="text-xs font-body text-[#bec8d2] max-w-3xl leading-relaxed">
                This is the agent's own advice. The optimizer weighs it against buying stock and may size it differently — see "Where the joint plan departs from an agent's advice" in the AI Decision Center. Nothing is executed from here: there is no ERP connection.
              </p>
              <button onClick={() => onNavigate('decisions')} className="text-[11px] font-mono text-[#89ceff] hover:underline">Open the decision explanation →</button>
            </>
          ) : (
            <p className="text-xs font-body text-[#bec8d2]">
              {fromSim ? 'No warehouse needs an inbound transfer for this product over the forecast horizon.' : 'Recommendations come from a simulation run; this table is the ledger as it stands.'}
            </p>
          )}
        </div>
      )}

      {rows.length > 0 && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Demand chart */}
            <div className="lg:col-span-7 bg-[#131b2e] border border-[#3e4850] rounded-lg p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#3e4850] pb-3">
                <div>
                  <h3 className="text-sm font-headline font-bold text-white">Demand: last 28 days and 14-day forecast</h3>
                  <p className="text-[11px] font-mono text-[#88929b]">{warehouse} · product {product}</p>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-mono">
                  <span className="flex items-center gap-1 text-white"><span className="h-2 w-2 rounded-full bg-[#89ceff]"></span> Actual demand</span>
                  <span className="flex items-center gap-1 text-[#4edea3]"><span className="h-2 w-2 rounded-full bg-[#4edea3]"></span> Forecast</span>
                </div>
              </div>
              <div className="h-56 bg-[#060e20] rounded border border-[#3e4850] p-3 relative grid-bg">
                {forecast.error && <ErrorBlock error={forecast.error} onRetry={forecast.reload} />}
                {forecast.loading && !forecast.data && <LoadingBlock label="Loading forecast…" />}
                {forecast.data && <ForecastChart actual={forecast.data.actual} predicted={forecast.data.predicted} />}
              </div>
              {forecast.data && <p className="text-[10px] font-mono text-[#88929b]">{forecast.data.note}</p>}
            </div>

            {/* Selected warehouse */}
            <div className="lg:col-span-5 bg-[#131b2e] border border-[#3e4850] rounded-lg p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#3e4850] pb-3">
                <h3 className="text-sm font-headline font-bold text-white">Warehouse detail</h3>
                {selected && <StatusPill value={riskOf(selected)} />}
              </div>
              {selected && (
                <div className="space-y-3 font-mono text-xs">
                  <div>
                    <span className="text-[#88929b] block text-[10px]">WAREHOUSE</span>
                    <span className="text-white font-bold text-base">{selected.warehouse_id}</span>
                    <span className="text-[#88929b] text-[11px] block">product {selected.product_id}{selected.as_of_date ? ` · as of ${selected.as_of_date}` : ''}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#3e4850]/50">
                    <div><span className="text-[#88929b] block text-[10px]">CURRENT STOCK</span><span className="text-white font-bold text-sm">{fmtNumber(selected.current_stock)} units</span></div>
                    <div><span className="text-[#88929b] block text-[10px]">SAFETY STOCK</span><span className="text-[#ffb95f] font-bold text-sm">{fmtNumber(selected.safety_stock)} units</span></div>
                    <div>
                      <span className="text-[#88929b] block text-[10px]">FORECAST DEMAND{selected.horizon_days ? ` (${selected.horizon_days}d)` : ''}</span>
                      <span className="text-white font-bold text-sm">{selected.forecast_demand === null ? 'not assessed' : `${fmtNumber(selected.forecast_demand, 1)} units`}</span>
                    </div>
                    <div><span className="text-[#88929b] block text-[10px]">DAYS OF COVER</span><span className="text-white font-bold text-sm">{selected.days_of_cover === null ? '—' : `${selected.days_of_cover} d`}</span></div>
                  </div>
                  {selected.recommended_transfer && (
                    <div className="pt-2 border-t border-[#3e4850]/50">
                      <span className="text-[#88929b] block text-[10px]">RECOMMENDED INBOUND</span>
                      <span className="text-[#4edea3] font-bold text-sm">{fmtNumber(selected.recommended_transfer.quantity)} units from {selected.recommended_transfer.from}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Matrix */}
          <div className="bg-[#131b2e] border border-[#3e4850] rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#3e4850] pb-3">
              <h3 className="text-sm font-headline font-bold text-white">Warehouse stock matrix — product {product}</h3>
              <span className="text-xs font-mono text-[#88929b]">Click a row to chart that warehouse</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-[#060e20] text-[#88929b] text-[10px] uppercase border-b border-[#3e4850]">
                  <tr>
                    <th className="p-3">Warehouse</th>
                    <th className="p-3">Stockout risk</th>
                    <th className="p-3 text-right">Current stock</th>
                    <th className="p-3 text-right">Safety stock</th>
                    <th className="p-3 text-right">Forecast demand</th>
                    <th className="p-3 text-right">Days of cover</th>
                    <th className="p-3">Recommendation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3e4850]/50 text-[#bec8d2]">
                  {rows.map((r) => (
                    <tr
                      key={r.warehouse_id}
                      onClick={() => setWarehouse(r.warehouse_id)}
                      className={`cursor-pointer transition-colors ${r.warehouse_id === warehouse ? 'bg-[#222a3d] text-white' : 'hover:bg-[#171f33]'}`}
                    >
                      <td className="p-3 font-bold text-white">{r.warehouse_id}</td>
                      <td className="p-3"><StatusPill value={riskOf(r)} /></td>
                      <td className="p-3 text-right tabular-nums">{fmtNumber(r.current_stock)}</td>
                      <td className="p-3 text-right tabular-nums">{fmtNumber(r.safety_stock)}</td>
                      <td className="p-3 text-right tabular-nums">{r.forecast_demand === null ? '—' : fmtNumber(r.forecast_demand, 1)}</td>
                      <td className="p-3 text-right tabular-nums">{r.days_of_cover === null ? '—' : `${r.days_of_cover}d`}</td>
                      <td className="p-3 text-[11px] font-body text-[#89ceff]">
                        {r.recommended_transfer ? `Receive ${fmtNumber(r.recommended_transfer.quantity)} units from ${r.recommended_transfer.from}` : fromSim ? 'No transfer needed' : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] font-mono text-[#88929b]">Warehouses tracked: {WAREHOUSES.join(', ')}. Days of cover = current stock ÷ forecast daily demand.</p>
          </div>
        </>
      )}
    </div>
  );
};
