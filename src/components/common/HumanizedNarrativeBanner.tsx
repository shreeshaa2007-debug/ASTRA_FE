import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useHumanize, AGENT_PERSONAS } from '../../context/HumanizeContext';
import { ViewMode } from '../../types';
import { ApiRoute } from '../../types/api';
import { fmtDays, fmtNumber } from '../../utils/format';

interface HumanizedNarrativeBannerProps {
  onNavigate: (view: ViewMode) => void;
  routes?: ApiRoute[];
  selectedRouteId?: string;
  onSelectRoute?: (route: ApiRoute) => void;
}

export interface MitigationRouteInfo {
  route_id: string;
  title: string;
  mode: 'sea' | 'air' | 'rail' | 'road';
  origin: string;
  destination: string;
  status: 'ACTIVE MITIGATION' | 'ALTERNATIVE' | 'DISRUPTED' | 'NORMAL';
  transit_time_days: number;
  cost_per_unit: number;
  capacity: number;
  planned_quantity: number;
  actionSummary: string;
  operationalImpact: string;
  financialSavings: string;
}

const DEFAULT_MITIGATION_ROUTES: MitigationRouteInfo[] = [
  {
    route_id: 'SHA-ROT-CAPE',
    title: 'Cape of Good Hope Maritime Detour',
    mode: 'sea',
    origin: 'Shanghai',
    destination: 'Rotterdam',
    status: 'ACTIVE MITIGATION',
    transit_time_days: 28.3,
    cost_per_unit: 271.43,
    capacity: 10000,
    planned_quantity: 7500,
    actionSummary: 'Rerouting primary bulk volume around the southern coast of South Africa (Cape of Good Hope).',
    operationalImpact: 'Completely circumvents the stalled Suez Canal bottleneck. Ships maintain safe deep-water navigation to Europe in 28 days without queue delays.',
    financialSavings: 'Saves $112,500 in port detention charges and avoids 30+ day waiting penalties.',
  },
  {
    route_id: 'PEN-FRA-AIR',
    title: 'Malaysia / Penang Air Bridge Express',
    mode: 'air',
    origin: 'Penang',
    destination: 'Frankfurt',
    status: 'ACTIVE MITIGATION',
    transit_time_days: 2.0,
    cost_per_unit: 822.66,
    capacity: 6000,
    planned_quantity: 5000,
    actionSummary: 'Expediting critical high-priority healthcare and tech stock via dedicated air freight bridge from Malaysia to Frankfurt.',
    operationalImpact: 'Arrives in 48 hours to avert European fulfillment center stockouts before the 14-day zero-inventory threshold.',
    financialSavings: 'Protects $72,050 in Tier-1 SLA fulfillment default penalties and contract cancellations.',
  },
  {
    route_id: 'SHA-ROT-RAIL',
    title: 'Trans-Eurasian Rail Intermodal Express',
    mode: 'rail',
    origin: 'Shanghai',
    destination: 'Rotterdam',
    status: 'ALTERNATIVE',
    transit_time_days: 16.0,
    cost_per_unit: 450.0,
    capacity: 3500,
    planned_quantity: 1200,
    actionSummary: 'Deploying overland container rail freight across Central Asian and European dry corridors.',
    operationalImpact: 'Offers 16-day transit time — 12 days faster than the maritime Cape detour at 45% lower landed cost than air freight.',
    financialSavings: 'Saves $28,400 while stabilizing factory inventory buffers.',
  },
  {
    route_id: 'SIN-ROT-CAPE',
    title: 'Singapore to Rotterdam Southern Detour',
    mode: 'sea',
    origin: 'Singapore',
    destination: 'Rotterdam',
    status: 'ALTERNATIVE',
    transit_time_days: 26.5,
    cost_per_unit: 245.0,
    capacity: 8500,
    planned_quantity: 3000,
    actionSummary: 'Routing Southeast Asian transshipments south of Africa into the Atlantic Ocean.',
    operationalImpact: 'Relieves congestion at anchorages in the Malacca Strait and guarantees unhindered delivery to Rotterdam.',
    financialSavings: 'Saves $44,800 in vessel delay charges.',
  },
  {
    route_id: 'SHA-ROT-SUEZ',
    title: 'Suez Canal Primary Corridor (Disrupted)',
    mode: 'sea',
    origin: 'Shanghai',
    destination: 'Rotterdam',
    status: 'DISRUPTED',
    transit_time_days: 35.0,
    cost_per_unit: 137.11,
    capacity: 15000,
    planned_quantity: 0,
    actionSummary: 'Corridor physically blocked by grounded container vessel at the Great Bitter Lake with 95 vessels anchored.',
    operationalImpact: 'Traffic completely halted. Estimated canal clearance backlog exceeds 21 days if no alternative routing is initiated.',
    financialSavings: 'Zero units cleared. Route isolated by AI optimizer to protect shipments from indefinite stall.',
  },
  {
    route_id: 'MUM-ROT-SUEZ',
    title: 'Mumbai to Rotterdam Suez Link',
    mode: 'sea',
    origin: 'Mumbai',
    destination: 'Rotterdam',
    status: 'DISRUPTED',
    transit_time_days: 30.0,
    cost_per_unit: 120.0,
    capacity: 10000,
    planned_quantity: 0,
    actionSummary: 'Red Sea entrance blocked. Indian Ocean shipments cannot traverse Bab-el-Mandeb to the Mediterranean.',
    operationalImpact: 'Cargo holding in western Indian coastal waters pending canal reopening.',
    financialSavings: 'Lane suspended from active allocation until maritime clearance.',
  },
];

function getModeIcon(mode: string): string {
  const m = mode.toLowerCase();
  if (m === 'sea') return 'directions_boat';
  if (m === 'air') return 'flight';
  if (m === 'rail') return 'train';
  return 'local_shipping';
}

function getStatusBadgeStyle(status: string) {
  switch (status) {
    case 'ACTIVE MITIGATION':
      return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30';
    case 'DISRUPTED':
      return 'bg-rose-500/10 text-rose-700 border-rose-500/30';
    case 'ALTERNATIVE':
      return 'bg-violet-500/10 text-violet-700 border-violet-500/30';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-300';
  }
}

export const HumanizedNarrativeBanner: React.FC<HumanizedNarrativeBannerProps> = ({
  onNavigate,
  routes,
  selectedRouteId,
  onSelectRoute,
}) => {
  const { isHumanized, toggleHumanized, openGuidedTour, openCopilot } = useHumanize();

  // Combine default detailed narratives with any dynamic live API route attributes
  const routeList = useMemo<MitigationRouteInfo[]>(() => {
    if (!routes || routes.length === 0) return DEFAULT_MITIGATION_ROUTES;

    return DEFAULT_MITIGATION_ROUTES.map((item) => {
      const match = routes.find((r) => r.route_id === item.route_id);
      if (!match) return item;
      return {
        ...item,
        status:
          (match.planned_quantity ?? 0) > 0
            ? 'ACTIVE MITIGATION'
            : match.status === 'DISRUPTED'
            ? 'DISRUPTED'
            : match.status === 'ALTERNATIVE'
            ? 'ALTERNATIVE'
            : item.status,
        transit_time_days: match.transit_time_days ?? item.transit_time_days,
        cost_per_unit: match.cost_per_unit ?? item.cost_per_unit,
        capacity: match.capacity ?? item.capacity,
        planned_quantity: match.planned_quantity ?? item.planned_quantity,
      };
    });
  }, [routes]);

  // Active single route state
  const [activeId, setActiveId] = useState<string>(() => {
    if (selectedRouteId && routeList.some((r) => r.route_id === selectedRouteId)) {
      return selectedRouteId;
    }
    return routeList[0]?.route_id ?? 'SHA-ROT-CAPE';
  });

  // Menu and search state
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [modeFilter, setModeFilter] = useState<'all' | 'sea' | 'air' | 'rail' | 'disrupted'>('all');

  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync when selectedRouteId prop changes from parent
  useEffect(() => {
    if (selectedRouteId && routeList.some((r) => r.route_id === selectedRouteId)) {
      setActiveId(selectedRouteId);
    }
  }, [selectedRouteId, routeList]);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  // Single active route
  const activeRoute = useMemo(() => {
    return routeList.find((r) => r.route_id === activeId) ?? routeList[0];
  }, [routeList, activeId]);

  const activeIndex = useMemo(() => {
    return routeList.findIndex((r) => r.route_id === activeRoute.route_id);
  }, [routeList, activeRoute]);

  // Filtered routes for the menu search
  const filteredRoutes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return routeList.filter((r) => {
      if (modeFilter !== 'all') {
        if (modeFilter === 'disrupted' && r.status !== 'DISRUPTED') return false;
        if (modeFilter !== 'disrupted' && r.mode !== modeFilter) return false;
      }
      if (!q) return true;
      return (
        r.route_id.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.origin.toLowerCase().includes(q) ||
        r.destination.toLowerCase().includes(q) ||
        r.mode.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q) ||
        r.actionSummary.toLowerCase().includes(q)
      );
    });
  }, [routeList, searchQuery, modeFilter]);

  const handleSelect = (route: MitigationRouteInfo) => {
    setActiveId(route.route_id);
    setMenuOpen(false);
    if (onSelectRoute && routes) {
      const match = routes.find((r) => r.route_id === route.route_id);
      if (match) onSelectRoute(match);
    }
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextIdx = (activeIndex - 1 + routeList.length) % routeList.length;
    handleSelect(routeList[nextIdx]);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextIdx = (activeIndex + 1) % routeList.length;
    handleSelect(routeList[nextIdx]);
  };

  return (
    <div className="rounded-2xl border border-line bg-gradient-to-r from-card via-inset to-card p-5 shadow-card space-y-4">
      {/* Top Bar: Headline & Humanize Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line/60 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-primary/10 text-primary material-symbols-outlined text-[20px]">
            psychology
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-headline font-bold text-sm text-ink">
                {isHumanized ? 'Executive Resilience Briefing (Plain English)' : 'Technical Operational Telemetry'}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-success-soft text-success">
                Active Simulation
              </span>
            </div>
            <p className="text-[11px] text-muted font-body">
              {isHumanized
                ? 'Multi-agent AI mitigations translated into clear business impacts. Showing single route mitigation.'
                : 'Raw mathematical solver outputs, mixed-integer programming constraints, and route status.'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={toggleHumanized}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              isHumanized ? 'bg-primary text-white shadow-sm' : 'bg-raised hover:bg-line text-ink-2'
            }`}
            title="Toggle between friendly plain-English and technical mode"
          >
            <span>{isHumanized ? '🧠 Plain English: ON' : '⚙️ Technical Mode'}</span>
          </button>

          <button
            onClick={openGuidedTour}
            className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 rounded-xl text-xs font-bold border border-blue-200 transition-all flex items-center gap-1"
            title="Start 60-second guided tour"
          >
            <span>✨ Guided Story</span>
          </button>
        </div>
      </div>

      {/* Main Narrative Card with SINGLE ROUTE DISPLAY and MENU */}
      {isHumanized ? (
        <div className="space-y-3.5">
          {/* Situation Headline */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-[12px] font-bold text-danger flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-danger animate-ping"></span>
              <span>CRITICAL SITUATION DETECTED · SUEZ CANAL BOTTLENECK</span>
            </div>
            <span className="text-[11px] font-mono text-muted">
              Displaying 1 Route Mitigation Corridor · Use menu to inspect alternatives
            </span>
          </div>

          <p className="text-[13px] text-ink leading-relaxed font-body">
            The <strong>Suez Canal is blocked</strong> with 95 container vessels stalled. If no action is taken,
            European fulfillment centers will <strong>run out of inventory in 14 days</strong>, causing 45,000 order cancellations.
          </p>

          {/* ROUTE MENU FORMAT BAR */}
          <div className="p-3 bg-surface rounded-xl border border-line flex flex-wrap items-center justify-between gap-3 relative z-20">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-ink flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-primary">route</span>
                Mitigation Corridor:
              </span>
              <span className="text-[10px] font-mono bg-primary-soft text-primary font-bold px-2 py-0.5 rounded-full">
                1 Route Displayed
              </span>
            </div>

            {/* Stepper + Searchable Menu Trigger */}
            <div className="flex items-center gap-2">
              {/* Stepper Prev / Next */}
              <div className="flex items-center bg-card border border-line rounded-xl p-0.5 text-ink text-[11px] font-mono shadow-xs">
                <button
                  onClick={handlePrev}
                  title="Previous route"
                  className="p-1 hover:bg-surface rounded-lg transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px] block">chevron_left</span>
                </button>
                <span className="px-2 font-bold text-[10px] text-muted">
                  {activeIndex + 1} / {routeList.length}
                </span>
                <button
                  onClick={handleNext}
                  title="Next route"
                  className="p-1 hover:bg-surface rounded-lg transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px] block">chevron_right</span>
                </button>
              </div>

              {/* Menu Trigger Dropdown */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-expanded={menuOpen}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono transition-all shadow-sm ${
                    menuOpen
                      ? 'bg-primary text-white border-primary shadow-glow'
                      : 'bg-card hover:bg-surface text-ink border-line'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {getModeIcon(activeRoute.mode)}
                  </span>
                  <span className="font-bold">{activeRoute.route_id}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                    menuOpen ? 'bg-white/20 text-white border-white/30' : getStatusBadgeStyle(activeRoute.status)
                  }`}>
                    {activeRoute.status}
                  </span>
                  <span className="material-symbols-outlined text-[16px]">
                    {menuOpen ? 'expand_less' : 'expand_more'}
                  </span>
                </button>

                {/* Searchable Dropdown Menu */}
                {menuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-[340px] sm:w-[420px] bg-white border border-line rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.25)] z-[9999] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    {/* Search Header */}
                    <div className="p-3 bg-slate-50 border-b border-line space-y-2">
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-2.5 text-muted text-[16px]">
                          search
                        </span>
                        <input
                          ref={searchInputRef}
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && filteredRoutes.length > 0) {
                              handleSelect(filteredRoutes[0]);
                            }
                          }}
                          placeholder="Search route (e.g. Cape, Air, Rail, Malaysia, Suez)..."
                          className="w-full bg-white border border-line rounded-xl pl-8 pr-8 py-1.5 text-xs font-mono text-ink placeholder:text-muted focus:outline-none focus:border-primary shadow-xs"
                        />
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2.5 top-2 text-muted hover:text-ink text-[12px]"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      {/* Filter Chips */}
                      <div className="flex items-center gap-1 overflow-x-auto text-[10px] font-mono scrollbar-none">
                        {(
                          [
                            ['all', `All (${routeList.length})`],
                            ['sea', '🚢 Sea'],
                            ['air', '✈️ Air'],
                            ['rail', '🚆 Rail'],
                            ['disrupted', '⚠️ Disrupted'],
                          ] as const
                        ).map(([val, label]) => (
                          <button
                            key={val}
                            onClick={() => setModeFilter(val)}
                            className={`px-2 py-0.5 rounded-lg whitespace-nowrap font-semibold transition-colors ${
                              modeFilter === val
                                ? 'bg-primary text-white shadow-xs'
                                : 'bg-white text-muted hover:text-ink border border-line'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Route List in Menu */}
                    <div className="max-h-[280px] overflow-y-auto divide-y divide-line p-1 bg-white">
                      {filteredRoutes.length === 0 ? (
                        <div className="p-6 text-center text-muted font-mono text-xs space-y-1">
                          <p>No routes match "{searchQuery}"</p>
                          <button
                            onClick={() => {
                              setSearchQuery('');
                              setModeFilter('all');
                            }}
                            className="text-primary hover:underline text-[11px] font-bold"
                          >
                            Reset filters
                          </button>
                        </div>
                      ) : (
                        filteredRoutes.map((r) => {
                          const isCurrent = r.route_id === activeRoute.route_id;
                          return (
                            <div
                              key={r.route_id}
                              onClick={() => handleSelect(r)}
                              className={`p-2.5 rounded-xl cursor-pointer transition-all ${
                                isCurrent
                                  ? 'bg-primary-soft/80 border border-primary/40 shadow-xs'
                                  : 'hover:bg-slate-50 border border-transparent'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-[16px] text-primary">
                                    {getModeIcon(r.mode)}
                                  </span>
                                  <span className="font-bold text-xs text-ink">{r.route_id}</span>
                                  <span className="text-[11px] text-muted truncate max-w-[150px]">
                                    · {r.title}
                                  </span>
                                </div>
                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${getStatusBadgeStyle(r.status)}`}>
                                  {r.status}
                                </span>
                              </div>
                              <div className="mt-1 flex items-center justify-between text-[10px] font-mono text-ink-2">
                                <span>{r.origin} → {r.destination}</span>
                                <span>{fmtDays(r.transit_time_days)} · ${fmtNumber(r.cost_per_unit, 2)}/unit</span>
                              </div>
                              {r.planned_quantity > 0 && (
                                <div className="mt-1 text-[10px] font-mono font-bold text-emerald-600 flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[12px]">check_circle</span>
                                  Allocated: {fmtNumber(r.planned_quantity)} units
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SINGLE ROUTE DETAIL CARD - STRICTLY SHOWS ONLY THIS ONE ROUTE */}
          <div className="p-4 bg-card rounded-xl border border-line shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-line/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[20px]">
                    {getModeIcon(activeRoute.mode)}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-headline font-bold text-sm text-ink">{activeRoute.title}</span>
                    <span className="text-xs font-mono font-bold text-muted">({activeRoute.route_id})</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getStatusBadgeStyle(activeRoute.status)}`}>
                      {activeRoute.status}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted font-mono">
                    Corridor: {activeRoute.origin} → {activeRoute.destination} · Mode: {activeRoute.mode.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onNavigate('simulator')}
                  className="px-3.5 py-1.5 bg-primary hover:bg-primary-strong text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95"
                >
                  Inspect Full Plan
                </button>
                <button
                  onClick={openCopilot}
                  className="px-3.5 py-1.5 bg-surface hover:bg-raised text-primary font-bold text-xs rounded-xl border border-line transition-all"
                >
                  Ask Copilot
                </button>
              </div>
            </div>

            {/* Narrative description for this single route */}
            <div className="space-y-1.5 text-xs text-ink-2 font-body leading-relaxed">
              <p>
                <strong className="text-ink">Operational Action:</strong> {activeRoute.actionSummary}
              </p>
              <p>
                <strong className="text-ink">Fulfillment Impact:</strong> {activeRoute.operationalImpact}
              </p>
              <p className="text-emerald-700 font-semibold">
                <strong>Financial & SLA Protection:</strong> {activeRoute.financialSavings}
              </p>
            </div>

            {/* Quick Metrics Strip for this single route */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-line/60 text-[11px] font-mono">
              <div className="bg-surface p-2 rounded-lg border border-line/60">
                <span className="text-muted block text-[10px]">Transit Duration</span>
                <span className="font-bold text-primary text-[13px]">{fmtDays(activeRoute.transit_time_days)}</span>
              </div>
              <div className="bg-surface p-2 rounded-lg border border-line/60">
                <span className="text-muted block text-[10px]">Allocated Volume</span>
                <span className={`font-bold text-[13px] ${activeRoute.planned_quantity > 0 ? 'text-emerald-600' : 'text-muted'}`}>
                  {activeRoute.planned_quantity > 0 ? `${fmtNumber(activeRoute.planned_quantity)} units` : '0 units'}
                </span>
              </div>
              <div className="bg-surface p-2 rounded-lg border border-line/60">
                <span className="text-muted block text-[10px]">Cost Per Unit</span>
                <span className="font-bold text-ink text-[13px]">${fmtNumber(activeRoute.cost_per_unit, 2)}</span>
              </div>
              <div className="bg-surface p-2 rounded-lg border border-line/60">
                <span className="text-muted block text-[10px]">Capacity Limit</span>
                <span className="font-bold text-ink text-[13px]">{fmtNumber(activeRoute.capacity)} units</span>
              </div>
            </div>
          </div>

          {/* Agent Personas Live Chatter Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-1">
            {Object.values(AGENT_PERSONAS).map((p) => (
              <div
                key={p.id}
                className="p-3 bg-card rounded-xl border border-line/70 hover:border-primary/40 transition-all space-y-1"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{p.avatar}</span>
                  <div>
                    <span className="font-bold text-[11px] text-ink block leading-tight">{p.name}</span>
                    <span className="text-[10px] text-muted font-mono">{p.plainRole.split(' ')[0]}</span>
                  </div>
                </div>
                <p className="text-[11px] text-ink-2 leading-tight line-clamp-2 italic pt-1">
                  "{p.greeting}"
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Technical Mode */
        <div className="p-3.5 bg-inset rounded-xl font-mono text-[11px] text-ink-2 space-y-1">
          <div className="text-ink font-bold">MIP Model Formulation: min ∑ (c_route · x + c_landed · s + c_inv · y)</div>
          <div>Active Disruption: Suez Canal Corridor (Severity: CRITICAL, Confidence: 1.0, Duration: 10.0d)</div>
          <div>Selected Corridor: {activeRoute.route_id} ({activeRoute.mode.toUpperCase()}) · Capacity: {activeRoute.capacity} · Planned: {activeRoute.planned_quantity}</div>
        </div>
      )}
    </div>
  );
};
