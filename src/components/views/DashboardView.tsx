import React from 'react';
import { getDashboard, getDisruptions, getRoutes } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import { useSimulation } from '../../context/SimulationContext';
import { GlobalMap } from '../common/GlobalMap';
import { EngineBadge, ErrorBlock, LoadingBlock, StatusPill } from '../common/StateNotice';
import { ViewMode } from '../../types';
import { ApiRoute, DashboardResponse } from '../../types/api';
import { fmtCost, fmtNumber, fmtPct, titleCase } from '../../utils/format';

interface DashboardViewProps {
  onNavigate: (view: ViewMode) => void;
  onSelectRoute?: (route: ApiRoute) => void;
}

type Tone = 'critical' | 'warning' | 'healthy' | 'info';

interface Card {
  id: string;
  label: string;
  value: string;
  tone: Tone;
  line1: string;
  line2: string;
}

function buildCards(d: DashboardResponse): Card[] {
  const k = d.kpis;
  const routesOk = k.routes_total - k.routes_disrupted;
  return [
    {
      id: 'routes',
      label: 'ROUTES AVAILABLE',
      value: `${routesOk}/${k.routes_total}`,
      tone: k.routes_disrupted > 0 ? 'critical' : 'healthy',
      line1: k.routes_disrupted > 0 ? `${k.routes_disrupted} route${k.routes_disrupted === 1 ? '' : 's'} disrupted` : 'No route disrupted',
      line2: 'Logistics network status',
    },
    k.shipments_at_risk !== null
      ? {
          id: 'shipments',
          label: 'SHIPMENTS AT RISK',
          value: String(k.shipments_at_risk),
          tone: k.shipments_at_risk > 0 ? 'critical' : 'healthy',
          line1: `${fmtNumber(k.units_at_risk ?? 0)} units of the modeled baseline plan`,
          line2: 'Not observed shipments: there is no shipment dataset',
        }
      : {
          id: 'shipments',
          label: 'SHIPMENTS AT RISK',
          value: 'N/A',
          tone: 'info',
          line1: 'Nothing to compare against',
          line2: d.unavailable.shipments_at_risk ?? 'No finalized simulation',
        },
    {
      id: 'inventory',
      label: 'INVENTORY AT RISK',
      value: k.inventory_records > 0 ? `${k.inventory_at_risk}/${k.inventory_records}` : '—',
      tone: k.inventory_records === 0 ? 'info' : k.inventory_at_risk > 0 ? 'warning' : 'healthy',
      line1: k.inventory_records > 0 ? 'Warehouse-product records at MEDIUM/HIGH risk' : 'Not assessed yet',
      line2: k.inventory_records > 0 ? 'From the Inventory Agent' : 'A simulation run assesses inventory',
    },
    {
      id: 'suppliers',
      label: 'SUPPLIER HEALTH',
      value: fmtPct(k.supplier_health_pct, 0),
      tone: k.suppliers_disrupted > 0 ? 'critical' : k.suppliers_reduced > 0 ? 'warning' : 'healthy',
      line1: 'Suppliers fully ACTIVE',
      line2: `${k.suppliers_disrupted} disrupted · ${k.suppliers_reduced} reduced of ${k.suppliers_total}`,
    },
    {
      id: 'disruptions',
      label: 'ACTIVE DISRUPTIONS',
      value: String(k.active_disruptions).padStart(2, '0'),
      tone: k.active_disruptions > 0 ? 'critical' : 'healthy',
      line1: k.active_disruptions > 0 ? 'Sensed in the latest finalized run' : 'None sensed',
      line2: k.estimated_exposure !== null ? `Value at risk: ${fmtCost(k.estimated_exposure)}` : 'Value at risk: N/A',
    },
  ];
}

const border: Record<Tone, string> = {
  critical: 'border-[#93000a] hover:border-[#ffb4ab]',
  warning: 'border-[#3e4850] hover:border-[#ffb95f]',
  healthy: 'border-[#3e4850] hover:border-[#4edea3]',
  info: 'border-[#3e4850] hover:border-[#89ceff]',
};
const valueColor: Record<Tone, string> = {
  critical: 'text-[#ffb4ab]',
  warning: 'text-[#ffb95f]',
  healthy: 'text-[#4edea3]',
  info: 'text-[#89ceff]',
};

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, onSelectRoute }) => {
  const { status } = useSimulation();
  // The dashboard follows the latest *finalized* simulation, so refetch when the
  // current one reaches a new state (e.g. is approved and becomes COMPLETED).
  const refreshKey = `${status?.simulation_id}:${status?.status}:${status?.version}`;

  const dashboard = useFetch(getDashboard, [], true, [refreshKey]);
  const simId = dashboard.data?.simulation_id ?? undefined;
  const routes = useFetch(() => getRoutes(simId), [simId], dashboard.data !== null, [refreshKey]);
  const disruptions = useFetch(() => getDisruptions({ source: 'curated', limit: 4 }), [], true, [refreshKey]);

  const active = disruptions.data?.active ?? [];
  const lead = active[0];
  const d = dashboard.data;

  return (
    <div className="space-y-6">
      {/* Page Title & Status Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#3e4850]">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#4edea3] animate-pulse"></span>
            <span className="text-[11px] font-mono text-[#89ceff] uppercase tracking-wider font-semibold">
              Operations Deck · Live MVP backend (no SAP connection)
            </span>
            <EngineBadge label={d?.label} engine={d?.engine} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-headline font-bold text-white tracking-tight mt-1">Global Supply Chain Command Center</h1>
          <p className="text-sm font-body text-[#bec8d2] mt-0.5">
            {d ? `Showing ${d.reflects}${d.simulation_id ? ` (${d.simulation_id})` : ''}.` : 'Network status, sensed disruptions and the latest response plan.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {lead ? (
            <div className="px-3 py-1.5 bg-[#93000a]/20 border-l-2 border-[#ffb4ab] text-[#ffb4ab] text-xs font-mono uppercase flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#ffb4ab] animate-ping"></span>
              <span>{titleCase(lead.event_type)} · {lead.location}</span>
            </div>
          ) : (
            <div className="px-3 py-1.5 bg-[#00a572]/10 border-l-2 border-[#4edea3] text-[#4edea3] text-xs font-mono uppercase">No active disruption</div>
          )}
          <button
            onClick={() => onNavigate('simulator')}
            className="px-4 py-2 bg-[#0ea5e9] hover:bg-[#89ceff] hover:text-[#00344d] text-white font-headline text-[13px] font-bold rounded flex items-center gap-2 shadow-lg shadow-[#0ea5e9]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[18px]">bolt</span>
            <span>Simulate &amp; Mitigate</span>
          </button>
        </div>
      </div>

      {dashboard.error && <ErrorBlock error={dashboard.error} onRetry={dashboard.reload} />}
      {dashboard.loading && !d && <LoadingBlock />}

      {/* KPI strip */}
      {d && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {buildCards(d).map((card) => (
            <div key={card.id} className={`p-3.5 bg-[#131b2e] border ${border[card.tone]} rounded-lg relative overflow-hidden transition-all duration-200 flex flex-col justify-between`}>
              <div>
                <div className="flex items-center justify-between text-[11px] font-mono text-[#88929b] tracking-wider uppercase">
                  <span>{card.label}</span>
                  {card.tone === 'critical' && <span className="h-2 w-2 rounded-full bg-[#ffb4ab] animate-ping"></span>}
                  {card.tone === 'warning' && <span className="material-symbols-outlined text-[14px] text-[#ffb95f]">warning</span>}
                  {card.tone === 'healthy' && <span className="material-symbols-outlined text-[14px] text-[#4edea3]">verified</span>}
                </div>
                <div className={`text-2xl sm:text-3xl font-headline font-bold mt-1.5 ${valueColor[card.tone]} tabular-nums`}>{card.value}</div>
              </div>
              <div className="mt-3 pt-2 border-t border-[#3e4850]/50 space-y-0.5">
                <div className="text-[11px] font-mono text-[#bec8d2]">{card.line1}</div>
                <div className="text-[10px] font-body text-[#88929b]">{card.line2}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Latest disruption + plan summary, and the network map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 bg-[#131b2e] border border-[#3e4850] rounded-lg p-5 flex flex-col justify-between relative overflow-hidden">
          <div className="space-y-4">
            {lead ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 bg-[#93000a] text-[#ffdad6] text-[10px] font-mono font-bold rounded flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#ffb4ab] animate-pulse"></span>
                    {lead.severity} · SENSED BY THE SENSING AGENT
                  </span>
                  <span className="text-[11px] font-mono text-[#88929b]">confidence {(lead.confidence * 100).toFixed(0)}%</span>
                </div>
                <div>
                  <h2 className="text-xl font-headline font-bold text-white tracking-tight">{titleCase(lead.event_type)} — {lead.location}</h2>
                  <p className="text-xs font-body text-[#bec8d2] mt-1.5 leading-relaxed">{lead.summary ?? 'No summary was recorded for this event.'}</p>
                </div>
                <div className="grid grid-cols-3 gap-2 py-3 border-y border-[#3e4850] text-[11px] font-mono">
                  <div className="p-2 bg-[#060e20] rounded border border-[#3e4850]/50">
                    <span className="text-[#88929b] block text-[9px] uppercase">DURATION</span>
                    <span className="text-[#ffb95f] font-bold">{fmtNumber(lead.estimated_duration)} d</span>
                  </div>
                  <div className="p-2 bg-[#060e20] rounded border border-[#3e4850]/50">
                    <span className="text-[#88929b] block text-[9px] uppercase">ROUTES HIT</span>
                    <span className="text-white font-bold">{lead.affected_routes.length}</span>
                  </div>
                  <div className="p-2 bg-[#060e20] rounded border border-[#3e4850]/50">
                    <span className="text-[#88929b] block text-[9px] uppercase">SUPPLIERS HIT</span>
                    <span className="text-white font-bold">{lead.affected_suppliers.length}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <span className="px-2.5 py-1 bg-[#00a572]/20 text-[#4edea3] text-[10px] font-mono font-bold rounded">BASELINE NETWORK</span>
                <h2 className="text-xl font-headline font-bold text-white tracking-tight">No disruption in effect</h2>
                <p className="text-xs font-body text-[#bec8d2] leading-relaxed">
                  Nothing has been sensed in a finalized simulation, so the map and KPIs show the baseline network. Run a scenario in the simulator to see the agents respond.
                </p>
              </div>
            )}

            {d && d.kpis.plan_status && (
              <div className="space-y-1.5 text-[11px] font-mono">
                <div className="flex justify-between"><span className="text-[#bec8d2]">Plan status:</span><StatusPill value={d.kpis.plan_status} /></div>
                <div className="flex justify-between"><span className="text-[#bec8d2]">Plan spend:</span><span className="text-white font-bold">{fmtCost(d.kpis.plan_spend)}</span></div>
                <div className="flex justify-between"><span className="text-[#bec8d2]">Approval:</span><StatusPill value={d.kpis.approval_status ?? 'NOT_EVALUATED'} /></div>
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-[#3e4850] flex flex-wrap items-center justify-end gap-2">
            <button onClick={() => onNavigate('decisions')} className="px-3 py-1.5 border border-[#3e4850] hover:bg-[#222a3d] text-xs font-headline text-[#dae2fd] rounded transition-colors">
              Inspect Reasoning
            </button>
            <button onClick={() => onNavigate('simulator')} className="px-3.5 py-1.5 bg-[#0ea5e9] hover:bg-[#89ceff] hover:text-[#00344d] text-white font-headline text-xs font-bold rounded flex items-center gap-1.5 transition-all">
              <span>Open Simulator</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </button>
          </div>
        </div>

        <div className="lg:col-span-7 flex flex-col">
          {routes.error && <ErrorBlock error={routes.error} onRetry={routes.reload} />}
          {routes.data && <GlobalMap routes={routes.data.routes} onSelectRoute={onSelectRoute} />}
          {routes.loading && !routes.data && <LoadingBlock label="Loading the route network…" />}
        </div>
      </div>

      {/* Reference events: real curated history, not a live feed */}
      <div className="bg-[#131b2e] border border-[#3e4850] rounded-lg p-3 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
        <div className="flex items-center gap-3 overflow-x-auto py-1">
          <span className="px-2 py-0.5 bg-[#060e20] text-[#89ceff] font-bold rounded text-[10px] uppercase whitespace-nowrap">Real historical events</span>
          {disruptions.data?.historical.events.map((e, i) => (
            <React.Fragment key={e.event_id}>
              {i > 0 && <span className="text-[#3e4850]">·</span>}
              <span className="text-[#bec8d2] whitespace-nowrap" title={e.provenance}>
                <strong className="text-[#ffb95f]">{e.start_date.slice(0, 10)}</strong> {titleCase(e.event_type)} — {e.location}
              </span>
            </React.Fragment>
          ))}
          {disruptions.error && <span className="text-[#ffb4ab]">could not load events</span>}
          {disruptions.loading && !disruptions.data && <span className="text-[#88929b]">loading…</span>}
        </div>
        <button onClick={() => onNavigate('monitor')} className="text-[11px] text-[#89ceff] hover:underline flex items-center gap-1 whitespace-nowrap">
          <span>Open Agent Monitor</span>
          <span className="material-symbols-outlined text-[14px]">open_in_new</span>
        </button>
      </div>
    </div>
  );
};
