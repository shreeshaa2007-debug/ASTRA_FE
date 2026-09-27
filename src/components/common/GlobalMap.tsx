import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, GeoJSON, Polyline, Marker, Tooltip, ZoomControl, useMap, useMapEvents } from 'react-leaflet';
import type { GeoJsonObject } from 'geojson';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ApiRoute } from '../../types/api';
import { PORT_COORDS } from '../../data/network';
import lanesDoc from '../../data/lanes.json';
import { fmtDays, fmtNumber } from '../../utils/format';

interface GlobalMapProps {
  routes: ApiRoute[];
  onSelectRoute?: (route: ApiRoute) => void;
  selectedRouteId?: string;
  /** What the facts strip says before anything is selected (the dashboard's click opens the Logistics page instead). */
  emptyHint?: string;
}

type LatLng = [number, number];
type ModeFilter = 'all' | 'sea' | 'air' | 'rail' | 'disrupted' | 'planned';

interface Lane {
  path: LatLng[];
  via: string[];
  blocked_at?: number; // index of the canal in `path`: when the canal is closed, everything after it is unreachable
}
interface Chokepoint {
  at: LatLng;
  kind: string;
}
const LANES = lanesDoc.lanes as unknown as Record<string, Lane>;
const CHOKEPOINTS = lanesDoc.chokepoints as unknown as Record<string, Chokepoint>;

interface Drawn {
  route: ApiRoute;
  path: LatLng[];
  lane: Lane | undefined;
  visual: RouteVisual;
}

const COLORS = {
  disrupted: '#e0434b',
  plan: '#0f9d6c',
  alternative: '#5b3df5',
  delayed: '#d9770a',
  normal: '#9aa0bf',
  chokepoint: '#d9770a',
} as const;

interface RouteVisual {
  color: string;
  dash: string;
  weight: number;
  planned: boolean;
}

function visualFor(route: ApiRoute, maxPlanned: number): RouteVisual {
  const quantity = route.planned_quantity ?? 0;
  const planned = quantity > 0;
  const mode = route.transport_mode.toLowerCase();
  const character = mode === 'air' ? '1 9' : mode === 'rail' ? '12 4 2 4' : null;
  if (route.status === 'DISRUPTED') return { color: COLORS.disrupted, dash: character ?? '7 6', weight: 4, planned: false };
  if (planned) return { color: COLORS.plan, dash: character ?? '10 6', weight: 4 + (maxPlanned > 0 ? 3 * (quantity / maxPlanned) : 0), planned: true };
  if (route.status === 'DELAYED') return { color: COLORS.delayed, dash: character ?? '6 4', weight: 3.5, planned: false };
  if (route.status === 'ALTERNATIVE') return { color: COLORS.alternative, dash: character ?? '6 4', weight: 3.5, planned: false };
  return { color: COLORS.normal, dash: character ?? '4 4', weight: 3, planned: false };
}

function pathFor(route: ApiRoute): LatLng[] | null {
  const lane = LANES[route.route_id];
  if (lane) return lane.path;
  const a = PORT_COORDS[route.origin];
  const b = PORT_COORDS[route.destination];
  return a && b ? [a, b] : null;
}

const portIcon = (size: number, hub: boolean) =>
  L.divIcon({
    className: '',
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:9999px;background:${hub ? '#5b3df5' : '#ffffff'};border:2.5px solid #5b3df5;box-shadow:0 2px 10px rgba(91,61,245,0.45);"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });

const chokepointIcon = (blocked: boolean) =>
  blocked
    ? L.divIcon({
        className: '',
        html: `<span class="animate-pulse" style="position:relative;display:flex;align-items:center;justify-content:center;width:22px;height:22px;background:#e0434b;border-radius:9999px;box-shadow:0 0 16px rgba(224,67,75,0.7);">
      <span style="position:absolute;inset:-8px;border:2px solid #e0434b;border-radius:9999px;opacity:0.45;"></span>
      <span style="color:white;font-size:13px;font-weight:bold;line-height:1;">&times;</span></span>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      })
    : L.divIcon({
        className: '',
        html: `<span style="display:block;width:10px;height:10px;background:#ffffff;border:2px solid ${COLORS.chokepoint};transform:rotate(45deg);"></span>`,
        iconSize: [10, 10],
        iconAnchor: [5, 5],
      });

const oceanLabel = (text: string) =>
  L.divIcon({ className: '', html: `<span class="ocean-label">${text}</span>`, iconSize: [160, 16], iconAnchor: [80, 8] });

const OCEANS: { name: string; at: LatLng; minZoom: number }[] = [
  { name: 'Atlantic Ocean', at: [16, -33], minZoom: 0 },
  { name: 'Indian Ocean', at: [-14, 82], minZoom: 0 },
  { name: 'Pacific Ocean', at: [22, 150], minZoom: 0 },
  { name: 'Southern Ocean', at: [-52, 55], minZoom: 0 },
  { name: 'Arabian Sea', at: [17, 63], minZoom: 3.5 },
  { name: 'Bay of Bengal', at: [14, 88], minZoom: 3.5 },
  { name: 'South China Sea', at: [11, 114.5], minZoom: 3.5 },
];

function OceanLabels() {
  const map = useMap();
  const [, refresh] = useState(0);
  useMapEvents({ moveend: () => refresh((n) => n + 1) });
  const visible = map.getBounds().pad(-0.1);
  const zoom = map.getZoom();
  return (
    <>
      {OCEANS.filter((o) => zoom >= o.minZoom && visible.contains(o.at)).map((o) => (
        <Marker key={o.name} position={o.at} icon={oceanLabel(o.name)} interactive={false} keyboard={false} />
      ))}
    </>
  );
}

const GRATICULE: GeoJsonObject = {
  type: 'MultiLineString',
  coordinates: [
    ...[-60, -30, 0, 30, 60].map((lat) => [[-180, lat], [180, lat]]),
    ...Array.from({ length: 13 }, (_, i) => -180 + i * 30).map((lng) => [[lng, -85], [lng, 85]]),
  ],
} as GeoJsonObject;

const LAND_STYLE = { color: '#ccd2e8', weight: 0.9, fillColor: '#ffffff', fillOpacity: 1 } as const;
const BORDER_STYLE = { color: '#e3e6f2', weight: 0.6, opacity: 1 } as const;
const GRATICULE_STYLE = { color: '#cfd6ec', weight: 0.6, opacity: 0.8, dashArray: '2 7' } as const;

const PORT_LABEL_SIDE: Record<string, L.Direction> = { Shanghai: 'right', Singapore: 'bottom', Mumbai: 'left', Chennai: 'right', Rotterdam: 'top', Delhi: 'right', Penang: 'left', Frankfurt: 'top' };
const CHOKE_LABEL_SIDE: Record<string, L.Direction> = { 'Strait of Malacca': 'left', 'Bab-el-Mandeb': 'left', 'Suez Canal': 'right', 'Strait of Gibraltar': 'left', 'Cape of Good Hope': 'right' };
const shortName = (name: string) => name.replace('Strait of ', '');

function getModeIcon(mode: string): string {
  const m = mode.toLowerCase();
  if (m === 'sea' || m === 'ocean' || m === 'maritime') return 'directions_boat';
  if (m === 'air' || m === 'flight') return 'flight';
  if (m === 'rail' || m === 'train') return 'train';
  return 'local_shipping';
}

function getStatusBadgeStyle(status: string) {
  switch (status) {
    case 'DISRUPTED':
      return 'bg-danger-soft text-danger border-danger/30';
    case 'ALTERNATIVE':
      return 'bg-primary-soft text-primary border-primary/30';
    case 'DELAYED':
      return 'bg-amber-100 text-amber-800 border-amber-300';
    default:
      return 'bg-surface text-ink-2 border-line';
  }
}

// Fit bounds specifically to the single active route being shown
function FitToLanes({ points, signature }: { points: LatLng[]; signature: string }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    map.fitBounds(L.latLngBounds(points), { paddingTopLeft: [45, 50], paddingBottomRight: [45, 80], maxZoom: 4.8, animate: true, duration: 0.6 });
  }, [signature, map, points]);
  return null;
}

export const GlobalMap: React.FC<GlobalMapProps> = ({ routes, onSelectRoute, selectedRouteId, emptyHint }) => {
  // Active route state - strictly ONE route shown on the map at any time!
  const [activeRouteId, setActiveRouteId] = useState<string>(() => {
    if (selectedRouteId && routes.some((r) => r.route_id === selectedRouteId)) {
      return selectedRouteId;
    }
    // Default to Cape detour (primary alternative) or first disrupted route or first route
    const cape = routes.find((r) => r.route_id.includes('CAPE'));
    if (cape) return cape.route_id;
    const disrupted = routes.find((r) => r.status === 'DISRUPTED');
    if (disrupted) return disrupted.route_id;
    return routes[0]?.route_id ?? '';
  });

  // Menu and Search states
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [modeFilter, setModeFilter] = useState<ModeFilter>('all');
  const [land, setLand] = useState<GeoJsonObject | null>(null);
  const [borders, setBorders] = useState<GeoJsonObject | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync when selectedRouteId prop changes from parent (e.g. table selection in LogisticsView)
  useEffect(() => {
    if (selectedRouteId && routes.some((r) => r.route_id === selectedRouteId)) {
      setActiveRouteId(selectedRouteId);
    }
  }, [selectedRouteId, routes]);

  // Close dropdown on outside click or escape
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
      // Auto focus search input when menu opens
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  // Load geojson base layers
  useEffect(() => {
    let cancelled = false;
    const load = (url: string, set: (g: GeoJsonObject) => void) =>
      fetch(url)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!cancelled && data) set(data as GeoJsonObject);
        })
        .catch(() => undefined);
    load('/land110m.json', setLand);
    load('/borders110m.json', setBorders);
    return () => {
      cancelled = true;
    };
  }, []);

  // Determine current active route object
  const activeRoute = useMemo<ApiRoute | null>(() => {
    if (!routes || routes.length === 0) return null;
    return routes.find((r) => r.route_id === activeRouteId) ?? routes[0];
  }, [routes, activeRouteId]);

  const activeIndex = useMemo(() => {
    if (!activeRoute) return -1;
    return routes.findIndex((r) => r.route_id === activeRoute.route_id);
  }, [routes, activeRoute]);

  const maxPlanned = useMemo(() => Math.max(0, ...routes.map((r) => r.planned_quantity ?? 0)), [routes]);

  // STRICT REQUIREMENT: Only ONE route is drawn on the map at any time!
  const drawn = useMemo<Drawn[]>(() => {
    if (!activeRoute) return [];
    const path = pathFor(activeRoute);
    if (!path) return [];
    return [
      {
        route: activeRoute,
        path,
        lane: LANES[activeRoute.route_id] as Lane | undefined,
        visual: visualFor(activeRoute, maxPlanned),
      },
    ];
  }, [activeRoute, maxPlanned]);

  // Only the ports belonging to the single active route are displayed
  const ports = useMemo(() => {
    const seen = new Map<string, LatLng>();
    for (const { route } of drawn) {
      if (PORT_COORDS[route.origin]) seen.set(route.origin, PORT_COORDS[route.origin]);
      if (PORT_COORDS[route.destination]) seen.set(route.destination, PORT_COORDS[route.destination]);
    }
    return Array.from(seen.entries());
  }, [drawn]);

  // Only chokepoints along this single route are displayed
  const chokepoints = useMemo(() => {
    const seen = new Map<string, { at: LatLng; blocked: boolean }>();
    for (const { route, lane } of drawn) {
      for (const name of lane?.via ?? []) {
        if (CHOKEPOINTS[name]) {
          const entry = seen.get(name) ?? { at: CHOKEPOINTS[name].at, blocked: false };
          entry.blocked ||= name === 'Suez Canal' && route.status === 'DISRUPTED';
          seen.set(name, entry);
        }
      }
    }
    return Array.from(seen.entries());
  }, [drawn]);

  const fitPoints = useMemo(() => drawn.flatMap(({ path }) => path.filter((_, i) => i % 5 === 0 || i === path.length - 1)), [drawn]);

  // Filtered route list for the searchable menu format
  const filteredRoutes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return routes.filter((r) => {
      // Category / mode filter
      if (modeFilter === 'sea' && r.transport_mode.toLowerCase() !== 'sea') return false;
      if (modeFilter === 'air' && r.transport_mode.toLowerCase() !== 'air') return false;
      if (modeFilter === 'rail' && r.transport_mode.toLowerCase() !== 'rail') return false;
      if (modeFilter === 'disrupted' && r.status !== 'DISRUPTED') return false;
      if (modeFilter === 'planned' && (r.planned_quantity ?? 0) <= 0) return false;

      // Text search matching
      if (!q) return true;
      const lane = LANES[r.route_id];
      const viaText = lane?.via ? lane.via.join(' ').toLowerCase() : '';
      return (
        r.route_id.toLowerCase().includes(q) ||
        r.origin.toLowerCase().includes(q) ||
        r.destination.toLowerCase().includes(q) ||
        r.transport_mode.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q) ||
        viaText.includes(q)
      );
    });
  }, [routes, searchQuery, modeFilter]);

  const handleSelectRoute = (r: ApiRoute) => {
    setActiveRouteId(r.route_id);
    onSelectRoute?.(r);
    setMenuOpen(false);
  };

  const handlePrevRoute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (routes.length === 0) return;
    const nextIdx = (activeIndex - 1 + routes.length) % routes.length;
    const target = routes[nextIdx];
    setActiveRouteId(target.route_id);
    onSelectRoute?.(target);
  };

  const handleNextRoute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (routes.length === 0) return;
    const nextIdx = (activeIndex + 1) % routes.length;
    const target = routes[nextIdx];
    setActiveRouteId(target.route_id);
    onSelectRoute?.(target);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && filteredRoutes.length > 0) {
      handleSelectRoute(filteredRoutes[0]);
    }
  };

  const disruptedCount = routes.filter((r) => r.status === 'DISRUPTED').length;
  const plannedCount = routes.filter((r) => (r.planned_quantity ?? 0) > 0).length;

  return (
    <div className="relative w-full bg-card shadow-card rounded-2xl overflow-visible select-none border border-line">
      {/* Map Control Header with Route Menu & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-card border-b border-line rounded-t-2xl relative z-30">
        {/* Title & Active Route Status */}
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-primary-soft flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[18px]">
              {activeRoute ? getModeIcon(activeRoute.transport_mode) : 'route'}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-headline text-[14px] font-bold text-ink">
                Single Route Inspector
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-primary-soft text-primary border border-primary/20">
                1 Active Route Displayed
              </span>
            </div>
            <p className="text-[11px] text-muted">
              Displaying single corridor · Browse or search routes from the menu
            </p>
          </div>
        </div>

        {/* Route Selector Menu & Stepper Controls */}
        <div className="flex items-center gap-2">
          {/* Quick Prev / Next Stepper */}
          <div className="flex items-center bg-surface border border-line rounded-xl p-0.5 text-ink-2 text-[11px] font-mono">
            <button
              onClick={handlePrevRoute}
              title="Previous route"
              className="p-1.5 hover:text-ink hover:bg-card rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-[16px] block">chevron_left</span>
            </button>
            <span className="px-2 font-bold text-[10px] text-muted">
              {activeIndex >= 0 ? `${activeIndex + 1} / ${routes.length}` : '-'}
            </span>
            <button
              onClick={handleNextRoute}
              title="Next route"
              className="p-1.5 hover:text-ink hover:bg-card rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-[16px] block">chevron_right</span>
            </button>
          </div>

          {/* Route Menu Dropdown Trigger */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-xs font-mono transition-all shadow-sm ${
                menuOpen
                  ? 'bg-primary text-white border-primary shadow-glow'
                  : 'bg-card hover:bg-surface text-ink border-line'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">menu_open</span>
              <span className="font-bold">
                {activeRoute ? activeRoute.route_id : 'Select Route'}
              </span>
              {activeRoute && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                  menuOpen ? 'bg-white/20 text-white border-white/30' : getStatusBadgeStyle(activeRoute.status)
                }`}>
                  {activeRoute.status}
                </span>
              )}
              <span className="material-symbols-outlined text-[16px]">
                {menuOpen ? 'expand_less' : 'expand_more'}
              </span>
            </button>

            {/* Dropdown Menu Panel (Searchable Route Menu Format) */}
            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-[340px] sm:w-[420px] bg-white border border-line-strong rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.25)] z-[9999] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                {/* Search Header */}
                <div className="p-3 bg-slate-50 border-b border-line space-y-2.5">
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-2.5 text-muted text-[17px]">
                      search
                    </span>
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={handleSearchKeyDown}
                      placeholder="Search route (e.g. Cape, Air, Suez, Rotterdam)..."
                      className="w-full bg-white border border-line rounded-xl pl-9 pr-8 py-2 text-xs font-mono text-ink placeholder:text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-2.5 text-muted hover:text-ink text-[14px]"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Mode & Category Filter Chips */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-[10px] font-mono scrollbar-none">
                    {(
                      [
                        ['all', `All (${routes.length})`],
                        ['sea', '🚢 Sea'],
                        ['air', '✈️ Air'],
                        ['rail', '🚆 Rail'],
                        ['disrupted', `⚠️ Disrupted (${disruptedCount})`],
                        ['planned', `🌱 Plan (${plannedCount})`],
                      ] as [ModeFilter, string][]
                    ).map(([val, label]) => (
                      <button
                        key={val}
                        onClick={() => setModeFilter(val)}
                        className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition-colors font-semibold ${
                          modeFilter === val
                            ? 'bg-primary text-white shadow-sm'
                            : 'bg-white text-muted hover:text-ink border border-line'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Route List in Menu Format */}
                <div className="max-h-[320px] overflow-y-auto divide-y divide-line p-1 bg-white">
                  {filteredRoutes.length === 0 ? (
                    <div className="p-6 text-center text-muted font-mono text-xs space-y-1">
                      <span className="material-symbols-outlined text-[28px] text-muted/60 block">search_off</span>
                      <p>No routes match "{searchQuery}"</p>
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setModeFilter('all');
                        }}
                        className="text-primary hover:underline text-[11px] font-bold"
                      >
                        Clear filters to see all routes
                      </button>
                    </div>
                  ) : (
                    filteredRoutes.map((r) => {
                      const isCurrent = r.route_id === activeRoute?.route_id;
                      const lane = LANES[r.route_id];
                      return (
                        <div
                          key={r.route_id}
                          onClick={() => handleSelectRoute(r)}
                          className={`p-3 rounded-xl cursor-pointer transition-all ${
                            isCurrent
                              ? 'bg-primary-soft/80 border border-primary/40 shadow-sm'
                              : 'hover:bg-surface border border-transparent'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-[17px] text-primary">
                                {getModeIcon(r.transport_mode)}
                              </span>
                              <span className="font-headline text-xs font-bold text-ink">
                                {r.route_id}
                              </span>
                              {isCurrent && (
                                <span className="text-[10px] font-bold text-primary bg-card px-1.5 py-0.2 rounded border border-primary/30 flex items-center gap-0.5">
                                  <span className="material-symbols-outlined text-[11px]">check</span> Active
                                </span>
                              )}
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getStatusBadgeStyle(r.status)}`}>
                              {r.status}
                            </span>
                          </div>

                          <div className="mt-1 flex items-center justify-between text-[11px] font-mono text-ink-2">
                            <span>
                              {r.origin} → {r.destination} · <span className="uppercase text-[10px] text-muted">{r.transport_mode}</span>
                            </span>
                            <span className="font-bold text-ink">{fmtDays(r.transit_time_days)}</span>
                          </div>

                          {lane?.via && lane.via.length > 0 && (
                            <div className="mt-1 text-[10px] text-muted font-mono flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px]">alt_route</span>
                              Via {lane.via.map((v) => shortName(v)).join(' → ')}
                            </div>
                          )}

                          <div className="mt-1.5 flex items-center justify-between text-[10px] font-mono pt-1.5 border-t border-line/60">
                            <span className="text-muted">
                              Cost: <strong className="text-ink">${fmtNumber(r.cost_per_unit, 2)}</strong>/unit
                            </span>
                            {(r.planned_quantity ?? 0) > 0 ? (
                              <span className="text-success font-bold bg-success-soft px-1.5 py-0.5 rounded">
                                +{fmtNumber(r.planned_quantity)} units plan
                              </span>
                            ) : (
                              <span className="text-muted">Cap: {fmtNumber(r.capacity)} units</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Menu Footer */}
                <div className="p-2.5 bg-surface border-t border-line flex items-center justify-between text-[10px] font-mono text-muted">
                  <span>Press [Enter] to choose top match</span>
                  <span>{filteredRoutes.length} of {routes.length} routes</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Live Map Canvas - STRICTLY DRAWS ONLY THE 1 ACTIVE ROUTE */}
      <div
        className="relative h-[380px] sm:h-[480px] w-full overflow-hidden"
        style={{ background: 'radial-gradient(ellipse at 50% 40%, #f3f5fc 0%, #e3e8f6 75%)' }}
      >
        {/* Floating Active Route HUD Card on Map */}
        {activeRoute && (
          <div className="absolute top-3 left-3 z-[1000] bg-card/95 backdrop-blur-md border border-line p-3 rounded-2xl shadow-pop max-w-[280px] sm:max-w-[320px]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono text-muted uppercase tracking-wider">Active Route Display</span>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${getStatusBadgeStyle(activeRoute.status)}`}>
                {activeRoute.status}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-[18px]">
                {getModeIcon(activeRoute.transport_mode)}
              </span>
              <span className="font-headline text-sm font-bold text-ink">{activeRoute.route_id}</span>
            </div>
            <p className="text-xs font-mono text-ink-2 mt-0.5">
              {activeRoute.origin} → {activeRoute.destination} ({activeRoute.transport_mode.toUpperCase()})
            </p>
            <div className="mt-2 pt-2 border-t border-line/60 grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div>
                <span className="text-muted block text-[10px]">Transit</span>
                <span className="font-bold text-primary">{fmtDays(activeRoute.transit_time_days)}</span>
              </div>
              <div>
                <span className="text-muted block text-[10px]">Cost / Unit</span>
                <span className="font-bold text-ink">${fmtNumber(activeRoute.cost_per_unit, 2)}</span>
              </div>
            </div>
            {(activeRoute.planned_quantity ?? 0) > 0 && (
              <div className="mt-2 p-1.5 rounded-lg bg-success-soft text-success text-[10px] font-mono font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">check_circle</span>
                Mitigation volume: {fmtNumber(activeRoute.planned_quantity)} units allocated
              </div>
            )}
          </div>
        )}

        {/* Legend strip on map canvas */}
        <div className="absolute bottom-3 left-3 z-[1000] hidden md:block bg-card/90 backdrop-blur border border-line px-3 py-2 rounded-xl text-[10px] font-mono pointer-events-none">
          <div className="flex items-center gap-4">
            {[
              [COLORS.disrupted, 'Disrupted Corridor'],
              [COLORS.plan, 'Active Reroute Plan'],
              [COLORS.alternative, 'Alternative Corridor'],
              [COLORS.normal, 'Standard Lane'],
            ].map(([color, label]) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className="block w-4 border-t-[3px] border-dashed" style={{ borderColor: color }}></span>
                <span className="text-ink-2">{label}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <span className="block h-2 w-2 rotate-45 border-2" style={{ borderColor: COLORS.chokepoint }}></span>
              <span className="text-ink-2">Waypoint Chokepoint</span>
            </div>
          </div>
          <div className="mt-1 text-muted">Only the selected route is visualized on the map to prevent visual overlap</div>
        </div>

        {drawn.length === 0 && (
          <div className="absolute inset-0 z-[900] flex items-center justify-center pointer-events-none">
            <span className="bg-card/90 border border-line px-3 py-1.5 rounded-lg text-[11px] font-mono text-muted">
              No route selected. Use the route menu above to select a route.
            </span>
          </div>
        )}

        <MapContainer
          center={[22, 45]}
          zoom={2}
          minZoom={2}
          maxZoom={7}
          zoomSnap={0.5}
          worldCopyJump
          zoomControl={false}
          scrollWheelZoom={false}
          className="w-full h-full"
          style={{ background: 'transparent' }}
        >
          <ZoomControl position="topright" />
          <FitToLanes points={fitPoints} signature={activeRoute?.route_id ?? 'empty'} />

          <GeoJSON data={GRATICULE} style={() => GRATICULE_STYLE} interactive={false} />
          {land && <GeoJSON data={land} style={() => LAND_STYLE} interactive={false} />}
          {borders && <GeoJSON data={borders} style={() => BORDER_STYLE} interactive={false} />}

          <OceanLabels />

          {/* Render ONLY the single active route */}
          {drawn.map(({ route, path, lane, visual }) => {
            const cut = route.status === 'DISRUPTED' && lane?.blocked_at !== undefined ? lane.blocked_at : null;
            const pieces: [LatLng[], number][] =
              cut === null ? [[path, 1.0]] : [[path.slice(0, cut + 1), 1.0], [path.slice(cut), 0.35]];

            return (
              <React.Fragment key={route.route_id}>
                {/* Glow backing for the active route */}
                <Polyline
                  positions={path}
                  interactive={false}
                  pathOptions={{
                    color: visual.planned ? '#0f9d6c' : visual.color,
                    weight: visual.weight + 8,
                    opacity: 0.22,
                    lineCap: 'round',
                  }}
                />

                {/* The main drawn path */}
                {pieces.map(([positions, opacity], i) => (
                  <Polyline
                    key={i}
                    positions={positions}
                    interactive={false}
                    pathOptions={{
                      color: visual.color,
                      weight: visual.weight + 1,
                      opacity,
                      dashArray: visual.dash,
                      lineCap: 'round',
                      className: visual.planned ? 'route-flow' : undefined,
                    }}
                  />
                ))}

                {/* Invisible wide polyline for easy hover / tooltip */}
                <Polyline
                  positions={path}
                  pathOptions={{ color: '#000', weight: 22, opacity: 0 }}
                  eventHandlers={{ click: () => onSelectRoute?.(route) }}
                >
                  <Tooltip sticky className="map-tip">
                    <div className="font-bold">{route.route_id} · {route.status}</div>
                    <div>
                      {route.transport_mode} · {fmtDays(route.transit_time_days)} · {fmtNumber(route.distance_km)} km
                    </div>
                    <div>Cost: ${fmtNumber(route.cost_per_unit, 2)} / unit · Capacity: {fmtNumber(route.capacity)}</div>
                    {(route.planned_quantity ?? 0) > 0 && (
                      <div className="text-success font-bold">Planned volume: {fmtNumber(route.planned_quantity)} units</div>
                    )}
                  </Tooltip>
                </Polyline>
              </React.Fragment>
            );
          })}

          {/* Render only chokepoints along this route */}
          {chokepoints.map(([name, { at, blocked }]) => (
            <Marker key={name} position={at} icon={chokepointIcon(blocked)} keyboard={false}>
              <Tooltip
                permanent
                direction={CHOKE_LABEL_SIDE[name] ?? 'right'}
                offset={[blocked ? 12 : 8, 0]}
                className={`map-label ${blocked ? 'map-label-blocked' : 'map-label-choke'}`}
              >
                {shortName(name)}
                {blocked ? ' · BLOCKED' : ''}
              </Tooltip>
            </Marker>
          ))}

          {/* Render only origin and destination ports for this route */}
          {ports.map(([name, position]) => (
            <Marker key={name} position={position} icon={portIcon(name === 'Rotterdam' ? 14 : 11, name === 'Rotterdam')} keyboard={false}>
              <Tooltip
                permanent
                direction={PORT_LABEL_SIDE[name] ?? 'right'}
                offset={[name === 'Rotterdam' ? 0 : 7, name === 'Rotterdam' ? -8 : 0]}
                className="map-label map-label-port"
              >
                {name}
              </Tooltip>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Selected single-route facts straight from the API */}
      <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-line bg-card border-t border-line text-[12px] font-mono rounded-b-2xl">
        {activeRoute ? (
          <>
            <div className="p-3.5">
              <span className="text-muted block text-[10px] uppercase font-semibold">Active Route Corridor</span>
              <span className="text-ink font-bold text-[14px] flex items-center gap-1.5 mt-0.5">
                <span className="material-symbols-outlined text-[16px] text-primary">
                  {getModeIcon(activeRoute.transport_mode)}
                </span>
                {activeRoute.route_id}
              </span>
              <span className="text-ink-2 text-[11px] block mt-0.5">
                {activeRoute.origin} → {activeRoute.destination} · {activeRoute.transport_mode.toUpperCase()}
              </span>
            </div>
            <div className="p-3.5">
              <span className="text-muted block text-[10px] uppercase font-semibold">Transit Time & Distance</span>
              <span className="text-primary font-bold text-[14px] block mt-0.5">
                {fmtDays(activeRoute.transit_time_days)}
              </span>
              <span className="text-ink-2 text-[11px] block mt-0.5">
                {fmtNumber(activeRoute.distance_km)} km total track
              </span>
            </div>
            <div className="p-3.5">
              <span className="text-muted block text-[10px] uppercase font-semibold">Cost & Capacity</span>
              <span className="text-ink font-bold text-[14px] block mt-0.5">
                ${fmtNumber(activeRoute.cost_per_unit, 2)} <span className="text-[11px] text-muted font-normal">/ unit</span>
              </span>
              <span className="text-ink-2 text-[11px] block mt-0.5">
                Max capacity {fmtNumber(activeRoute.capacity)} units
              </span>
            </div>
            <div className="p-3.5">
              <span className="text-muted block text-[10px] uppercase font-semibold">Mitigation Status</span>
              <span
                className={`font-bold text-[14px] block mt-0.5 ${
                  (activeRoute.planned_quantity ?? 0) > 0 ? 'text-success' : 'text-muted'
                }`}
              >
                {(activeRoute.planned_quantity ?? 0) > 0
                  ? `${fmtNumber(activeRoute.planned_quantity)} units allocated`
                  : 'No volume allocated'}
              </span>
              <span className="text-ink-2 text-[11px] block mt-0.5">
                Status: <strong className={activeRoute.status === 'DISRUPTED' ? 'text-danger' : 'text-ink'}>{activeRoute.status}</strong>
              </span>
            </div>
          </>
        ) : (
          <div className="p-3 col-span-2 md:col-span-4 text-[11px] text-muted">
            {emptyHint ?? 'Select a route from the menu to inspect its corridor on the map.'}
          </div>
        )}
      </div>
    </div>
  );
};
