import React, { useEffect, useState } from 'react';
import { getRoutes, getShipments } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import { useSimulation } from '../../context/SimulationContext';
import { GlobalMap } from '../common/GlobalMap';
import { ErrorBlock, LoadingBlock, StatusPill } from '../common/StateNotice';
import { ViewMode } from '../../types';
import { ApiShipment } from '../../types/api';
import { fmtDays, fmtNumber } from '../../utils/format';

interface LogisticsViewProps {
  onNavigate: (view: ViewMode) => void;
  initialRouteId?: string;
}

export const LogisticsView: React.FC<LogisticsViewProps> = ({ onNavigate, initialRouteId }) => {
  const { simulationId, status } = useSimulation();
  const version = status?.version;

  const routes = useFetch(() => getRoutes(simulationId ?? undefined), [simulationId], true, [version]);
  const shipments = useFetch(() => getShipments(simulationId ?? undefined), [simulationId], true, [version]);

  const [selectedRouteId, setSelectedRouteId] = useState<string | undefined>(initialRouteId);
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);

  useEffect(() => {
    if (initialRouteId) setSelectedRouteId(initialRouteId);
  }, [initialRouteId]);

  const routeList = routes.data?.routes ?? [];
  const shipmentList = shipments.data?.shipments ?? [];
  const selectedShipment: ApiShipment | null = shipmentList.find((s) => s.shipment_id === selectedShipmentId) ?? shipmentList[0] ?? null;
  const routeOf = (id: string | null) => routeList.find((r) => r.route_id === id) ?? null;
  const shipmentRoute = routeOf(selectedShipment?.route_id ?? null);
  const shownShipments = selectedRouteId ? shipmentList.filter((s) => s.route_id === selectedRouteId) : shipmentList;

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-line">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-mono font-bold rounded-lg">MULTIMODAL ROUTES &amp; PLANNED SHIPMENTS</span>
            <span className="text-[11px] font-mono text-muted">Lanes are synthetic between real ports · no shipment tracking data exists</span>
            {routes.data?.label && <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-mono font-bold rounded-lg">{routes.data.label}</span>}
          </div>
          <h1 className="text-2xl sm:text-3xl font-headline font-bold text-ink tracking-tight mt-1">Logistics Network</h1>
          <p className="text-sm font-body text-ink-2 mt-0.5">
            {simulationId ? `Route status as of simulation ${simulationId}, and the volume its plan puts on each route.` : 'The baseline route network. Run a simulation to see routes disrupted and shipments planned.'}
          </p>
        </div>

        <button onClick={() => onNavigate('simulator')} className="px-4 py-2 bg-primary hover:bg-primary-strong text-white font-headline text-xs font-bold rounded-lg transition-colors">
          Run Reroute Simulation
        </button>
      </div>

      {routes.error && <ErrorBlock error={routes.error} onRetry={routes.reload} />}
      {routes.loading && !routes.data && <LoadingBlock label="Loading the route network…" />}
      {routes.data && (
        <GlobalMap
          routes={routeList}
          onSelectRoute={(r) => setSelectedRouteId((cur) => (cur === r.route_id ? undefined : r.route_id))}
          selectedRouteId={selectedRouteId}
        />
      )}

      {/* Route table */}
      {routes.data && (
        <div className="bg-card rounded-2xl p-5 space-y-4 shadow-card">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <h3 className="text-sm font-headline font-bold text-ink">Routes</h3>
            <span className="text-xs font-mono text-muted">Click a route to filter shipments · click again to clear</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-inset text-muted text-[10px] uppercase border-b border-line">
                <tr>
                  <th className="p-3">Route</th>
                  <th className="p-3">Origin → Destination</th>
                  <th className="p-3">Mode</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Transit</th>
                  <th className="p-3 text-right">Cost / unit</th>
                  <th className="p-3 text-right">Capacity</th>
                  <th className="p-3 text-right">Planned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-ink-2">
                {routeList.map((r) => (
                  <tr
                    key={r.route_id}
                    onClick={() => setSelectedRouteId((cur) => (cur === r.route_id ? undefined : r.route_id))}
                    className={`cursor-pointer transition-colors ${r.route_id === selectedRouteId ? 'bg-raised text-ink' : 'hover:bg-card'}`}
                  >
                    <td className="p-3 font-bold text-ink">{r.route_id}</td>
                    <td className="p-3 text-[11px]">{r.origin} → {r.destination}</td>
                    <td className="p-3 uppercase">{r.transport_mode}</td>
                    <td className="p-3"><StatusPill value={r.status} /></td>
                    <td className="p-3 text-right tabular-nums">{fmtDays(r.transit_time_days)}</td>
                    <td className="p-3 text-right tabular-nums">{fmtNumber(r.cost_per_unit, 2)}</td>
                    <td className="p-3 text-right tabular-nums">{fmtNumber(r.capacity)}</td>
                    <td className={`p-3 text-right font-bold tabular-nums ${(r.planned_quantity ?? 0) > 0 ? 'text-success' : 'text-muted'}`}>
                      {r.planned_quantity === null ? '—' : fmtNumber(r.planned_quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Shipments the plan proposes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-4 bg-card rounded-2xl p-5 space-y-4 shadow-card">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">package_2</span>
              <span className="font-headline font-bold text-ink text-sm">Shipment Inspector</span>
            </div>
            {selectedShipment && <StatusPill value={selectedShipment.status} />}
          </div>

          {selectedShipment ? (
            <div className="space-y-3 font-mono text-xs">
              <div>
                <span className="text-muted block text-[10px]">SHIPMENT ID</span>
                <span className="text-ink font-bold text-lg break-all">{selectedShipment.shipment_id}</span>
                <span className="text-primary text-[11px] block">product {selectedShipment.product_id} · from {selectedShipment.supplier_id}</span>
              </div>
              <div className="p-3 bg-inset rounded-lg border border-line space-y-2">
                <div>
                  <span className="text-muted block text-[10px]">LANE</span>
                  <span className="text-ink font-bold">{selectedShipment.route_id ?? 'No freight leg modeled'}</span>
                  {shipmentRoute && <span className="text-muted block text-[11px]">{shipmentRoute.origin} → {shipmentRoute.destination}</span>}
                </div>
                <div className="flex justify-between text-[11px]"><span className="text-ink-2">Mode:</span><span className="text-ink uppercase">{selectedShipment.transport_mode ?? 'direct'}</span></div>
                {shipmentRoute && <div className="flex justify-between text-[11px]"><span className="text-ink-2">Route status:</span><StatusPill value={shipmentRoute.status} /></div>}
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-line">
                <div><span className="text-muted block text-[10px]">QUANTITY</span><span className="text-ink font-bold">{fmtNumber(selectedShipment.quantity)} units</span></div>
                <div><span className="text-muted block text-[10px]">ARRIVAL</span><span className="text-success font-bold">day {selectedShipment.arrival_days.toFixed(1)}</span></div>
                <div><span className="text-muted block text-[10px]">FREIGHT / UNIT</span><span className="text-ink font-bold">{fmtNumber(selectedShipment.freight_unit_cost, 2)}</span></div>
              </div>
              <p className="pt-2 border-t border-line text-[10px] text-muted font-body">{selectedShipment.provenance}</p>
            </div>
          ) : (
            <p className="text-xs font-body text-muted">
              No shipments to inspect. There is no shipment dataset, so shipments here are only what a finalized or pending plan proposes.
            </p>
          )}
        </div>

        <div className="lg:col-span-8 bg-card rounded-2xl p-5 space-y-4 shadow-card">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <h3 className="text-sm font-headline font-bold text-ink">
              Shipments the plan proposes{selectedRouteId ? ` on ${selectedRouteId}` : ''}
            </h3>
            <span className="text-xs font-mono text-muted">{shipments.data?.simulation_id ? `simulation ${shipments.data.simulation_id}` : 'no plan'}</span>
          </div>

          {shipments.error && <ErrorBlock error={shipments.error} onRetry={shipments.reload} />}
          {shipments.loading && !shipments.data && <LoadingBlock />}
          {shipments.data && (
            <>
              <p className="text-[11px] font-mono text-muted">{shipments.data.note}. PROPOSED until the plan is finalized, then PLANNED.</p>
              {shownShipments.length === 0 ? (
                <p className="text-xs font-body text-ink-2">
                  {shipmentList.length === 0
                    ? 'No shipments: no plan exists yet (the dashboard-scoped simulation has no OPTIMAL plan, or none has been finalized).'
                    : 'No proposed shipment uses this route.'}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs">
                    <thead className="bg-inset text-muted text-[10px] uppercase border-b border-line">
                      <tr>
                        <th className="p-3">Shipment</th>
                        <th className="p-3">Supplier</th>
                        <th className="p-3">Route</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Quantity</th>
                        <th className="p-3 text-right">Freight / unit</th>
                        <th className="p-3 text-right">Arrival</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line text-ink-2">
                      {shownShipments.map((s) => (
                        <tr
                          key={s.shipment_id}
                          onClick={() => setSelectedShipmentId(s.shipment_id)}
                          className={`cursor-pointer transition-colors ${s.shipment_id === selectedShipment?.shipment_id ? 'bg-raised text-ink' : 'hover:bg-card'}`}
                        >
                          <td className="p-3 font-bold text-ink">{s.shipment_id}</td>
                          <td className="p-3">{s.supplier_id}</td>
                          <td className="p-3 text-[11px]">{s.route_id ?? '—'} {s.transport_mode ? `(${s.transport_mode})` : ''}</td>
                          <td className="p-3"><StatusPill value={s.status} /></td>
                          <td className="p-3 text-right tabular-nums">{fmtNumber(s.quantity)}</td>
                          <td className="p-3 text-right tabular-nums">{fmtNumber(s.freight_unit_cost, 2)}</td>
                          <td className="p-3 text-right tabular-nums text-success font-bold">day {s.arrival_days.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
