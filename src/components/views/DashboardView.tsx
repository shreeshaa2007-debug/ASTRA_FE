import React, { useState } from 'react';
import { getDashboard, getDisruptions, getRoutes } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import { useSimulation } from '../../context/SimulationContext';
import { GlobalMap } from '../common/GlobalMap';
import { EngineBadge, ErrorBlock, LoadingBlock, StatusPill } from '../common/StateNotice';
import { Card, CardTitle, Donut, IconChip, MiniRing, Segment, StackedMeter, StatTile, Tone } from '../common/ui';
import { ViewMode } from '../../types';
import { ApiRoute, DashboardResponse } from '../../types/api';
import { fmtCost, fmtNumber, fmtPct, titleCase } from '../../utils/format';
import { HumanizedNarrativeBanner } from '../common/HumanizedNarrativeBanner';

interface DashboardViewProps {
  onNavigate: (view: ViewMode) => void;
  onSelectRoute?: (route: ApiRoute) => void;
}

interface KpiCard {
  id: string;
  icon: string;
  label: string;
  value: string;
  tone: Tone;
  line1: string;
  line2: string;
}

function buildCards(d: DashboardResponse): KpiCard[] {
  const k = d.kpis;
  const routesOk = k.routes_total - k.routes_disrupted;
  return [
    {
      id: 'routes',
      icon: 'alt_route',
      label: 'Routes available',
      value: `${routesOk}/${k.routes_total}`,
      tone: k.routes_disrupted > 0 ? 'danger' : 'success',
      line1: k.routes_disrupted > 0 ? `${k.routes_disrupted} route${k.routes_disrupted === 1 ? '' : 's'} disrupted` : 'No route disrupted',
      line2: 'Logistics network status',
    },
    k.shipments_at_risk !== null
      ? {
          id: 'shipments',
          icon: 'local_shipping',
          label: 'Shipments at risk',
          value: String(k.shipments_at_risk),
          tone: k.shipments_at_risk > 0 ? 'danger' : 'success',
          line1: `${fmtNumber(k.units_at_risk ?? 0)} units of the modeled baseline plan`,
          line2: 'Not observed shipments: there is no shipment dataset',
        }
      : {
          id: 'shipments',
          icon: 'local_shipping',
          label: 'Shipments at risk',
          value: 'N/A',
          tone: 'primary',
          line1: 'Nothing to compare against',
          line2: d.unavailable.shipments_at_risk ?? 'No finalized simulation',
        },
    {
      id: 'inventory',
      icon: 'inventory_2',
      label: 'Inventory at risk',
      value: k.inventory_records > 0 ? `${k.inventory_at_risk}/${k.inventory_records}` : '—',
      tone: k.inventory_records === 0 ? 'primary' : k.inventory_at_risk > 0 ? 'warning' : 'success',
      line1: k.inventory_records > 0 ? 'Warehouse-product records at MEDIUM/HIGH risk' : 'Not assessed yet',
      line2: k.inventory_records > 0 ? 'From the Inventory Agent' : 'A simulation run assesses inventory',
    },
    {
      id: 'suppliers',
      icon: 'factory',
      label: 'Supplier health',
      value: fmtPct(k.supplier_health_pct, 0),
      tone: k.suppliers_disrupted > 0 ? 'danger' : k.suppliers_reduced > 0 ? 'warning' : 'success',
      line1: 'Suppliers fully ACTIVE',
      line2: `${k.suppliers_disrupted} disrupted · ${k.suppliers_reduced} reduced of ${k.suppliers_total}`,
    },
    {
      id: 'disruptions',
      icon: 'crisis_alert',
      label: 'Active disruptions',
      value: String(k.active_disruptions).padStart(2, '0'),
      tone: k.active_disruptions > 0 ? 'danger' : 'success',
      line1: k.active_disruptions > 0 ? 'Sensed in the latest finalized run' : 'None sensed',
      line2: k.estimated_exposure !== null ? `Value at risk: ${fmtCost(k.estimated_exposure)}` : 'Value at risk: N/A',
    },
  ];
}

const MODE_ICON: Record<string, string> = { sea: 'directions_boat', air: 'flight', rail: 'train', road: 'local_shipping', truck: 'local_shipping' };

// Availability per transport mode, from the routes the API returned: what is fine, what is disrupted, how much of the plan rides on it.
function byMode(routes: ApiRoute[]) {
  const modes = new Map<string, { total: number; disrupted: number; planned: number }>();
  for (const r of routes) {
    const key = r.transport_mode.toLowerCase();
    const m = modes.get(key) ?? { total: 0, disrupted: 0, planned: 0 };
    m.total += 1;
    if (r.status === 'DISRUPTED') m.disrupted += 1;
    m.planned += r.planned_quantity ?? 0;
    modes.set(key, m);
  }
  return Array.from(modes.entries()).sort((a, b) => b[1].total - a[1].total);
}

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
  const k = d?.kpis;

  const supplierSegments: Segment[] = k
    ? [
        { key: 'active', label: 'Active', value: Math.max(0, k.suppliers_total - k.suppliers_reduced - k.suppliers_disrupted), tone: 'success', icon: 'check_circle' },
        { key: 'reduced', label: 'Reduced', value: k.suppliers_reduced, tone: 'warning', icon: 'warning' },
        { key: 'disrupted', label: 'Disrupted', value: k.suppliers_disrupted, tone: 'danger', icon: 'error' },
      ]
    : [];
  const modeRows = routes.data ? byMode(routes.data.routes) : [];
  const [selectedRouteId, setSelectedRouteId] = useState<string>('SHA-ROT-CAPE');

  return (
    <div className="space-y-5">
      {/* Page title */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse"></span>
            <span className="text-[11px] text-primary font-bold">Operations Deck · Live MVP backend (no SAP connection)</span>
            <EngineBadge label={d?.label} engine={d?.engine} />
          </div>
          <h1 className="text-2xl sm:text-[28px] font-headline font-extrabold text-ink tracking-tight mt-1">Global Supply Chain Command Center</h1>
          <p className="text-[13px] text-ink-2 mt-0.5">
            {d ? `Showing ${d.reflects}${d.simulation_id ? ` (${d.simulation_id})` : ''}.` : 'Network status, sensed disruptions and the latest response plan.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {lead ? (
            <div className="h-11 px-4 bg-danger-soft text-danger text-[12px] font-bold rounded-xl flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="radar-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-danger"></span>
              </span>
              <span>{titleCase(lead.event_type)} · {lead.location}</span>
            </div>
          ) : (
            <div className="h-11 px-4 bg-success-soft text-success text-[12px] font-bold rounded-xl flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              No active disruption
            </div>
          )}
          <button
            onClick={() => onNavigate('simulator')}
            className="h-11 px-5 bg-primary hover:bg-primary-strong text-white text-[13px] font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-primary/30 transition-all active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[18px]">bolt</span>
            <span>Simulate &amp; Mitigate</span>
          </button>
        </div>
      </div>

      {/* Humanized Narrative Briefing with Single-Route Mitigation & Searchable Menu */}
      <HumanizedNarrativeBanner
        onNavigate={onNavigate}
        routes={routes.data?.routes}
        selectedRouteId={selectedRouteId}
        onSelectRoute={(r) => setSelectedRouteId(r.route_id)}
      />

      {dashboard.error && <ErrorBlock error={dashboard.error} onRetry={dashboard.reload} />}
      {dashboard.loading && !d && <LoadingBlock />}

      {/* KPI tiles */}
      {d && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {buildCards(d).map((card) => (
            <StatTile key={card.id} icon={card.icon} label={card.label} value={card.value} tone={card.tone} line1={card.line1} line2={card.line2} />
          ))}
        </div>
      )}

      {/* The network map, and the supplier base beside it */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-7 flex flex-col">
          {routes.error && <ErrorBlock error={routes.error} onRetry={routes.reload} />}
          {routes.data && (
            <GlobalMap
              routes={routes.data.routes}
              selectedRouteId={selectedRouteId}
              onSelectRoute={(r) => {
                setSelectedRouteId(r.route_id);
                onSelectRoute?.(r);
              }}
              emptyHint="Hover a route for its facts · click one to open it in Logistics."
            />
          )}
          {routes.loading && !routes.data && <LoadingBlock label="Loading the route network…" />}
        </div>

        <Card className="xl:col-span-5 p-5 flex flex-col justify-between gap-5">
          <CardTitle title="Suppliers by status" hint={k ? `${k.suppliers_total} suppliers in the network` : 'From the supplier dataset'} />
          {k ? (
            <>
              <Donut
                segments={supplierSegments}
                centerValue={fmtPct(k.supplier_health_pct, 0)}
                centerLabel="fully active"
                ariaLabel={`Suppliers by status: ${supplierSegments.map((s) => `${s.value} ${s.label.toLowerCase()}`).join(', ')}`}
              />
              <p className="text-[11px] text-muted leading-relaxed">Health is the share of suppliers whose status is ACTIVE; REDUCED ones still ship, at lower capacity.</p>
              {k.inventory_records > 0 && (
                <div className="flex items-center gap-4 pt-5 border-t border-line">
                  <MiniRing
                    fraction={(k.inventory_records - k.inventory_at_risk) / k.inventory_records}
                    tone={k.inventory_at_risk > 0 ? 'warning' : 'success'}
                    value={fmtPct(((k.inventory_records - k.inventory_at_risk) / k.inventory_records) * 100, 0)}
                    label="safe"
                  />
                  <div className="text-[12px] leading-snug">
                    <div className="text-ink font-bold">{k.inventory_records - k.inventory_at_risk} of {k.inventory_records} stock records safe</div>
                    <div className="text-muted mt-0.5">{k.inventory_at_risk} at MEDIUM/HIGH stock-out risk, per the Inventory Agent</div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-[12px] text-muted">{dashboard.loading ? 'Loading…' : 'Not available.'}</div>
          )}
        </Card>
      </div>

      {/* The latest disruption, and availability by transport mode */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <Card className="xl:col-span-5 p-5 flex flex-col justify-between gap-4">
          <div className="space-y-4">
            {lead ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className="px-3 py-1 bg-danger-soft text-danger text-[10px] font-bold rounded-full flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[13px]">error</span>
                    {lead.severity} · SENSED BY THE SENSING AGENT
                  </span>
                  <span className="text-[11px] text-muted font-medium">confidence {(lead.confidence * 100).toFixed(0)}%</span>
                </div>
                <div>
                  <h2 className="text-[19px] font-headline font-bold text-ink tracking-tight leading-snug">{titleCase(lead.event_type)} — {lead.location}</h2>
                  <p className="text-[12px] text-ink-2 mt-1.5 leading-relaxed">{lead.summary ?? 'No summary was recorded for this event.'}</p>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="p-3 bg-inset rounded-xl">
                    <span className="text-muted block text-[10px] font-semibold uppercase tracking-wide">Duration</span>
                    <span className="text-warning font-bold text-[15px]">{fmtNumber(lead.estimated_duration)} d</span>
                  </div>
                  <div className="p-3 bg-inset rounded-xl">
                    <span className="text-muted block text-[10px] font-semibold uppercase tracking-wide">Routes hit</span>
                    <span className="text-ink font-bold text-[15px]">{lead.affected_routes.length}</span>
                  </div>
                  <div className="p-3 bg-inset rounded-xl">
                    <span className="text-muted block text-[10px] font-semibold uppercase tracking-wide">Suppliers hit</span>
                    <span className="text-ink font-bold text-[15px]">{lead.affected_suppliers.length}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <span className="px-3 py-1 bg-success-soft text-success text-[10px] font-bold rounded-full">BASELINE NETWORK</span>
                <h2 className="text-[19px] font-headline font-bold text-ink tracking-tight">No disruption in effect</h2>
                <p className="text-[12px] text-ink-2 leading-relaxed">
                  Nothing has been sensed in a finalized simulation, so the map and KPIs show the baseline network. Run a scenario in the simulator to see the agents respond.
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button onClick={() => onNavigate('decisions')} className="h-10 px-4 bg-inset hover:bg-raised text-[12px] font-bold text-ink-2 rounded-xl transition-colors">
              Inspect Reasoning
            </button>
            <button onClick={() => onNavigate('simulator')} className="h-10 px-4 bg-primary hover:bg-primary-strong text-white text-[12px] font-bold rounded-xl flex items-center gap-1.5 transition-colors">
              <span>Open Simulator</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        </Card>

        <Card className="xl:col-span-7 p-5 flex flex-col gap-4">
          <CardTitle title="Routes by transport mode" hint="Availability and the plan's volume, from the routes the API returned" />
          {modeRows.length > 0 ? (
            <div>
              <div className="grid grid-cols-[minmax(84px,1fr)_minmax(0,2fr)_104px_92px] items-center gap-4 pb-2 text-[11px] font-semibold text-muted">
                <span>Mode</span>
                <span>Availability</span>
                <span className="text-right">Available</span>
                <span className="text-right">Plan volume</span>
              </div>
              <ul className="divide-y divide-line">
                {modeRows.map(([mode, m]) => (
                  <li key={mode} className="grid grid-cols-[minmax(84px,1fr)_minmax(0,2fr)_104px_92px] items-center gap-4 py-3">
                    <span className="flex items-center gap-2.5 min-w-0">
                      <IconChip icon={MODE_ICON[mode] ?? 'route'} tone="primary" />
                      <span className="text-[13px] font-semibold text-ink capitalize truncate">{mode}</span>
                    </span>
                    <StackedMeter
                      total={m.total}
                      parts={[
                        { value: m.total - m.disrupted, tone: 'primary', label: 'Available' },
                        { value: m.disrupted, tone: 'danger', label: 'Disrupted' },
                      ]}
                    />
                    <span className="text-right text-[13px] font-bold text-ink whitespace-nowrap">
                      {m.total - m.disrupted}/{m.total}
                      {m.disrupted > 0 && (
                        <span className="block text-[10px] font-semibold text-danger leading-tight">
                          <span className="material-symbols-outlined text-[11px] align-[-2px]">error</span> {m.disrupted} disrupted
                        </span>
                      )}
                    </span>
                    <span className="text-right text-[13px] font-semibold text-ink-2">{m.planned > 0 ? fmtNumber(m.planned) : '—'}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="text-[12px] text-muted">{routes.loading ? 'Loading…' : 'No routes to summarise.'}</div>
          )}
        </Card>
      </div>

      {/* Plan overview, real historical events, and the way into the agent trail */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <Card className="xl:col-span-5 p-5 flex flex-col gap-4">
          <CardTitle title="Plan overview" hint={d?.kpis.plan_status ? 'The latest finalized response plan' : 'Appears once a simulation has produced a plan'} />
          {k && k.plan_status ? (
            <div className="space-y-2 text-[12px]">
              <div className="flex items-center justify-between"><span className="text-ink-2">Plan status</span><StatusPill value={k.plan_status} /></div>
              <div className="flex items-center justify-between"><span className="text-ink-2">Plan spend</span><span className="text-ink font-bold">{fmtCost(k.plan_spend)}</span></div>
              <div className="flex items-center justify-between"><span className="text-ink-2">Approval</span><StatusPill value={k.approval_status ?? 'NOT_EVALUATED'} /></div>
            </div>
          ) : (
            <p className="text-[12px] text-ink-2 leading-relaxed">No plan yet. Run a scenario and the optimizer&apos;s plan, its spend and the compliance verdict show up here.</p>
          )}
        </Card>

        {/* Reference events: real curated history, not a live feed */}
        <Card className="xl:col-span-4 p-5 flex flex-col gap-3">
          <CardTitle title="Real historical events" hint="Curated reference events, not a live feed" />
          <ul className="space-y-2 min-h-[64px]">
            {disruptions.data?.historical.events.map((e) => (
              <li key={e.event_id} className="flex items-start gap-3" title={e.provenance}>
                <span className="mt-0.5 px-2 py-0.5 rounded-lg bg-warning-soft text-warning text-[11px] font-bold font-mono whitespace-nowrap">{e.start_date.slice(0, 10)}</span>
                <span className="text-[12px] text-ink-2 leading-snug">{titleCase(e.event_type)} — {e.location}</span>
              </li>
            ))}
            {disruptions.error && <li className="text-[12px] text-danger">could not load events</li>}
            {disruptions.loading && !disruptions.data && <li className="text-[12px] text-muted">loading…</li>}
          </ul>
        </Card>

        <Card className="xl:col-span-3 p-5 flex flex-col justify-between gap-4 bg-gradient-to-br from-primary-soft to-card">
          <div>
            <IconChip icon="monitor_heart" tone="primary" size="lg" />
            <h2 className="font-headline text-[15px] font-bold text-ink mt-3">Agent Monitor</h2>
            <p className="text-[12px] text-ink-2 mt-1 leading-relaxed">Every agent step, checkpoint and verdict of the current run, with the log behind it.</p>
          </div>
          <button onClick={() => onNavigate('monitor')} className="h-10 px-4 bg-primary hover:bg-primary-strong text-white text-[13px] font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-primary/25 transition-colors">
            <span>Open Agent Monitor</span>
            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
          </button>
        </Card>
      </div>
    </div>
  );
};
