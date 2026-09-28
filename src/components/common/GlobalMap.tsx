import React, { useEffect, useMemo, useState } from 'react';
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
type Filter = 'all' | 'disrupted' | 'planned';

// Lane geometry is generated (scripts/build_lanes.py): waypoints through the real straits, smoothed, and checked against the
// land polygons this map draws (backend/tests/test_map_lanes.py). Schematic lanes for reading the map, not vessel tracks.
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

// a route with its line, its generated lane (if any) and how it is styled
interface Drawn {
  route: ApiRoute;
  path: LatLng[];
  lane: Lane | undefined;
  visual: RouteVisual;
}

// the theme's status colours (index.css), as literals: Leaflet writes them into SVG attributes, where a CSS variable does not resolve
const COLORS = { disrupted: '#dc2626', plan: '#15803d', alternative: '#154734', delayed: '#d97706', normal: '#94a3b8', chokepoint: '#d97706' } as const;

interface RouteVisual {
  color: string;
  dash: string;
  weight: number;
  planned: boolean;
}

// Colour says what the API says about the route: status first, then whether the optimizer's plan puts volume on it. Air and rail
// keep their own line character so a mode is recognisable without reading the legend.
function visualFor(route: ApiRoute, maxPlanned: number): RouteVisual {
  const quantity = route.planned_quantity ?? 0;
  const planned = quantity > 0;
  const mode = route.transport_mode.toLowerCase();
  const character = mode === 'air' ? '1 9' : mode === 'rail' ? '12 4 2 4' : null;
  if (route.status === 'DISRUPTED') return { color: COLORS.disrupted, dash: character ?? '7 6', weight: 3, planned: false };
  if (planned) return { color: COLORS.plan, dash: character ?? '10 6', weight: 3 + (maxPlanned > 0 ? 3 * (quantity / maxPlanned) : 0), planned: true }; // wider = more of the plan
  if (route.status === 'DELAYED') return { color: COLORS.delayed, dash: character ?? '6 4', weight: 2.5, planned: false };
  if (route.status === 'ALTERNATIVE') return { color: COLORS.alternative, dash: character ?? '6 4', weight: 2.5, planned: false };
  return { color: COLORS.normal, dash: character ?? '4 4', weight: 2, planned: false };
}

// Lanes share stretches of sea (four routes leave the Gulf of Aden together): the last one drawn is the one you see.
const stackOrder = (d: { route: ApiRoute; visual: RouteVisual }) =>
  d.visual.planned ? 4 : d.route.status === 'DISRUPTED' ? 3 : d.route.status === 'DELAYED' ? 2 : d.route.status === 'ALTERNATIVE' ? 1 : 0;

function pathFor(route: ApiRoute): LatLng[] | null {
  const lane = LANES[route.route_id];
  if (lane) return lane.path;
  const a = PORT_COORDS[route.origin];
  const b = PORT_COORDS[route.destination];
  return a && b ? [a, b] : null; // a route the generator has not drawn yet: the plain line, never nothing
}

const portIcon = (size: number, hub: boolean) =>
  L.divIcon({
    className: '',
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:9999px;background:${hub ? '#5b3df5' : '#ffffff'};border:2px solid #5b3df5;box-shadow:0 2px 8px rgba(91,61,245,0.4);"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });

const chokepointIcon = (blocked: boolean) =>
  blocked
    ? L.divIcon({
        className: '',
        html: `<span class="animate-pulse" style="position:relative;display:flex;align-items:center;justify-content:center;width:20px;height:20px;background:#e0434b;border-radius:9999px;box-shadow:0 0 14px rgba(224,67,75,0.6);">
      <span style="position:absolute;inset:-8px;border:2px solid #e0434b;border-radius:9999px;opacity:0.45;"></span>
      <span style="color:white;font-size:12px;font-weight:bold;line-height:1;">&times;</span></span>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      })
    : L.divIcon({
        className: '',
        html: `<span style="display:block;width:9px;height:9px;background:#ffffff;border:2px solid ${COLORS.chokepoint};transform:rotate(45deg);"></span>`,
        iconSize: [9, 9],
        iconAnchor: [4.5, 4.5],
      });

const oceanLabel = (text: string) =>
  L.divIcon({ className: '', html: `<span class="ocean-label">${text}</span>`, iconSize: [160, 16], iconAnchor: [80, 8] });

// Big oceans always; the smaller seas only once zoomed in far enough to have room for them. Either way a label is drawn only when
// its position is inside the visible map, so nothing is cut off at an edge or piled on another.
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

// A faint 30-degree grid: reads as a chart, and makes the scale of the oceans obvious.
const GRATICULE: GeoJsonObject = {
  type: 'MultiLineString',
  coordinates: [
    ...[-60, -30, 0, 30, 60].map((lat) => [[-180, lat], [180, lat]]),
    ...Array.from({ length: 13 }, (_, i) => -180 + i * 30).map((lng) => [[lng, -85], [lng, 85]]),
  ],
} as GeoJsonObject;

// The basemap is bundled with the app (Natural Earth 110m, public domain: public/land110m.json and public/borders110m.json) rather
// than fetched from a tile service: no API key, no rate limit, and it works with no network at all — which is what a demo on
// conference wifi needs.
const LAND_STYLE = { color: '#ccd2e8', weight: 0.9, fillColor: '#ffffff', fillOpacity: 1 } as const;
const BORDER_STYLE = { color: '#e3e6f2', weight: 0.6, opacity: 1 } as const;
const GRATICULE_STYLE = { color: '#cfd6ec', weight: 0.6, opacity: 0.8, dashArray: '2 7' } as const;

const PORT_LABEL_SIDE: Record<string, L.Direction> = { Shanghai: 'right', Singapore: 'bottom', Mumbai: 'left', Chennai: 'right', Rotterdam: 'top', Delhi: 'right' };
const CHOKE_LABEL_SIDE: Record<string, L.Direction> = { 'Strait of Malacca': 'left', 'Bab-el-Mandeb': 'left', 'Suez Canal': 'right', 'Strait of Gibraltar': 'left', 'Cape of Good Hope': 'right' };
const shortName = (name: string) => name.replace('Strait of ', '');

// Frames whatever is drawn, so choosing "Carrying plan" zooms to that lane instead of leaving it a thread on a world map.
function FitToLanes({ points, signature }: { points: LatLng[]; signature: string }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    map.fitBounds(L.latLngBounds(points), { paddingTopLeft: [36, 44], paddingBottomRight: [36, 84], maxZoom: 4.5, animate: true, duration: 0.5 });
    // `signature` (which routes, in which filter) is the trigger; the points are derived from it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, map]);
  return null;
}

export const GlobalMap: React.FC<GlobalMapProps> = ({ routes, onSelectRoute, selectedRouteId, emptyHint }) => {
  const [filter, setFilter] = useState<Filter>('all');
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [land, setLand] = useState<GeoJsonObject | null>(null);
  const [borders, setBorders] = useState<GeoJsonObject | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = (url: string, set: (g: GeoJsonObject) => void) =>
      fetch(url)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!cancelled && data) set(data as GeoJsonObject);
        })
        .catch(() => undefined); // a missing layer is a plainer map, not a broken one
    load('/land110m.json', setLand);
    load('/borders110m.json', setBorders);
    return () => {
      cancelled = true;
    };
  }, []);

  const counts = useMemo(
    () => ({ disrupted: routes.filter((r) => r.status === 'DISRUPTED').length, planned: routes.filter((r) => (r.planned_quantity ?? 0) > 0).length }),
    [routes]
  );

  const shown = routes.filter((r) => {
    if (filter === 'disrupted') return r.status === 'DISRUPTED';
    if (filter === 'planned') return (r.planned_quantity ?? 0) > 0;
    return true;
  });
  const maxPlanned = Math.max(0, ...routes.map((r) => r.planned_quantity ?? 0));

  const drawn = useMemo<Drawn[]>(
    () =>
      shown
        .flatMap((route) => {
          const path = pathFor(route);
          return path ? [{ route, path, lane: LANES[route.route_id] as Lane | undefined, visual: visualFor(route, maxPlanned) }] : [];
        })
        .sort((a, b) => stackOrder(a) - stackOrder(b)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shown.map((r) => `${r.route_id}:${r.status}:${r.planned_quantity}`).join('|'), maxPlanned]
  );

  const ports = useMemo(() => {
    const seen = new Map<string, LatLng>();
    for (const { route } of drawn) {
      if (PORT_COORDS[route.origin]) seen.set(route.origin, PORT_COORDS[route.origin]);
      if (PORT_COORDS[route.destination]) seen.set(route.destination, PORT_COORDS[route.destination]);
    }
    return Array.from(seen.entries());
  }, [drawn]);

  // chokepoints on the lanes being shown; the canal is "blocked" when a disrupted lane passes it
  const chokepoints = useMemo(() => {
    const seen = new Map<string, { at: LatLng; blocked: boolean }>();
    for (const { route, lane } of drawn) {
      for (const name of lane?.via ?? []) {
        const entry = seen.get(name) ?? { at: CHOKEPOINTS[name].at, blocked: false };
        entry.blocked ||= name === 'Suez Canal' && route.status === 'DISRUPTED';
        seen.set(name, entry);
      }
    }
    return Array.from(seen.entries());
  }, [drawn]);

  const fitPoints = useMemo(() => drawn.flatMap(({ path }) => path.filter((_, i) => i % 6 === 0 || i === path.length - 1)), [drawn]);
  const disruptedRoutes = routes.filter((r) => r.status === 'DISRUPTED');
  const selected = routes.find((r) => r.route_id === selectedRouteId) ?? null;

  const filterButton = (id: Filter, label: string, activeStyle: string) => (
    <button
      onClick={() => setFilter(id)}
      aria-pressed={filter === id}
      className={`px-3 py-1.5 rounded-lg transition-colors ${filter === id ? activeStyle : 'text-ink-2 hover:text-ink'}`}
    >
      {label}
    </button>
  );

  return (
    <div className="relative w-full bg-card shadow-card rounded-2xl overflow-hidden select-none">
      {/* Map Control Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-card border-b border-line">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[18px]">public</span>
          <span className="font-headline text-[15px] font-bold text-ink">Multi-modal logistics network</span>
          <span className="hidden sm:inline-block text-[11px] text-muted border-l border-line pl-2">
            {routes.length} ROUTES · SYNTHETIC LANES BETWEEN REAL WPI PORTS
          </span>
        </div>

        <div className="flex items-center gap-1 bg-inset p-1 rounded-xl text-[11px] font-semibold">
          {filterButton('all', `All (${routes.length})`, 'bg-card text-primary font-bold shadow-card')}
          {filterButton('disrupted', `Disrupted (${counts.disrupted})`, 'bg-danger-soft text-danger font-bold')}
          {filterButton('planned', `Carrying plan (${counts.planned})`, 'bg-success-soft text-success font-bold')}
        </div>
      </div>

      {/* Live Map Canvas */}
      <div className="relative h-[360px] sm:h-[460px] w-full overflow-hidden" style={{ background: 'radial-gradient(ellipse at 50% 40%, #f3f5fc 0%, #e3e8f6 75%)' }}>
        {/* Disrupted lanes: a compact badge that opens the list, so the list never sits on top of the Mediterranean */}
        {disruptedRoutes.length > 0 && (
          <div className="absolute top-3 left-3 z-[1000]">
            <button
              onClick={() => setListOpen((v) => !v)}
              aria-expanded={listOpen}
              className="flex items-center gap-2 bg-card/95 backdrop-blur border border-danger/40 hover:border-danger px-2.5 py-1.5 rounded-2xl text-[10px] font-mono uppercase tracking-wider text-danger font-bold transition-colors"
            >
              <span className="h-2 w-2 rounded-full bg-danger animate-pulse"></span>
              {disruptedRoutes.length} disrupted
              <span className="material-symbols-outlined text-[14px]">{listOpen ? 'expand_less' : 'expand_more'}</span>
            </button>
            {listOpen && (
              <div className="mt-1.5 max-w-[280px] bg-card/95 backdrop-blur border border-danger/40 p-2.5 rounded-2xl shadow-pop space-y-0.5 text-[11px] font-mono text-ink-2">
                {disruptedRoutes.map((r) => (
                  <button key={r.route_id} onClick={() => onSelectRoute?.(r)} className="block w-full text-left hover:text-ink">
                    {r.route_id} <span className="text-muted">({r.origin} → {r.destination})</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="absolute bottom-3 left-3 z-[1000] hidden md:block bg-card/90 backdrop-blur border border-line px-3 py-2 rounded-lg text-[10px] font-mono pointer-events-none">
          <div className="flex items-center gap-4">
            {[
              [COLORS.disrupted, 'Disrupted'],
              [COLORS.plan, 'Carries plan volume'],
              [COLORS.alternative, 'Alternative'],
              [COLORS.normal, 'Normal'],
            ].map(([color, label]) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className="block w-4 border-t-[3px] border-dashed" style={{ borderColor: color }}></span>
                <span className="text-ink-2">{label}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <span className="block h-2 w-2 rotate-45 border-2" style={{ borderColor: COLORS.chokepoint }}></span>
              <span className="text-ink-2">Chokepoint</span>
            </div>
          </div>
          <div className="mt-1 text-muted">Width = share of the plan · Air dotted · Rail dash-dot · Paths are schematic</div>
        </div>

        {drawn.length === 0 && (
          <div className="absolute inset-0 z-[900] flex items-center justify-center pointer-events-none">
            <span className="bg-card/90 border border-line px-3 py-1.5 rounded-lg text-[11px] font-mono text-muted">
              {filter === 'planned' ? 'No route carries plan volume yet — run a simulation.' : 'No routes to show.'}
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
          <FitToLanes points={fitPoints} signature={`${filter}|${drawn.map((d) => d.route.route_id).join(',')}`} />

          <GeoJSON data={GRATICULE} style={() => GRATICULE_STYLE} interactive={false} />
          {land && <GeoJSON data={land} style={() => LAND_STYLE} interactive={false} />}
          {borders && <GeoJSON data={borders} style={() => BORDER_STYLE} interactive={false} />}

          <OceanLabels />

          {drawn.map(({ route, path, lane, visual }) => {
            const isSelected = route.route_id === selectedRouteId;
            const dimmedByHover = hoverId !== null && hoverId !== route.route_id;
            const base = dimmedByHover ? 0.3 : 0.9;
            const weight = visual.weight + (isSelected || hoverId === route.route_id ? 1.5 : 0);
            // a disrupted lane past the closed canal is unreachable: drawn faint, so what the closure cuts off is visible
            const cut = route.status === 'DISRUPTED' && lane?.blocked_at !== undefined ? lane.blocked_at : null;
            const pieces: [LatLng[], number][] = cut === null ? [[path, base]] : [[path.slice(0, cut + 1), base], [path.slice(cut), base * 0.35]];
            return (
              <React.Fragment key={route.route_id}>
                {(visual.planned || isSelected) && (
                  <Polyline positions={path} interactive={false} pathOptions={{ color: isSelected ? '#1b2a45' : visual.color, weight: weight + 7, opacity: isSelected ? 0.22 : 0.16, lineCap: 'round' }} />
                )}
                {pieces.map(([positions, opacity], i) => (
                  <Polyline
                    key={i}
                    positions={positions}
                    interactive={false}
                    pathOptions={{ color: visual.color, weight, opacity, dashArray: visual.dash, lineCap: 'round', className: visual.planned ? 'route-flow' : undefined }}
                  />
                ))}
                {/* a wide invisible copy of the line: the thing you hover and click, so a 3 px dashed line is easy to hit */}
                <Polyline
                  positions={path}
                  pathOptions={{ color: '#000', weight: 16, opacity: 0 }}
                  eventHandlers={{ click: () => onSelectRoute?.(route), mouseover: () => setHoverId(route.route_id), mouseout: () => setHoverId(null) }}
                >
                  <Tooltip sticky className="map-tip">
                    <div className="font-bold">{route.route_id} · {route.status}</div>
                    <div>{route.transport_mode} · {fmtDays(route.transit_time_days)} · {fmtNumber(route.distance_km)} km</div>
                    {(route.planned_quantity ?? 0) > 0 && <div className="text-success">plan: {fmtNumber(route.planned_quantity)} units</div>}
                  </Tooltip>
                </Polyline>
              </React.Fragment>
            );
          })}

          {chokepoints.map(([name, { at, blocked }]) => (
            <Marker key={name} position={at} icon={chokepointIcon(blocked)} keyboard={false}>
              <Tooltip permanent direction={CHOKE_LABEL_SIDE[name] ?? 'right'} offset={[blocked ? 12 : 8, 0]} className={`map-label ${blocked ? 'map-label-blocked' : 'map-label-choke'}`}>
                {shortName(name)}
                {blocked ? ' · CLOSED' : ''}
              </Tooltip>
            </Marker>
          ))}

          {ports.map(([name, position]) => (
            <Marker key={name} position={position} icon={portIcon(name === 'Rotterdam' ? 14 : 11, name === 'Rotterdam')} keyboard={false}>
              <Tooltip permanent direction={PORT_LABEL_SIDE[name] ?? 'right'} offset={[name === 'Rotterdam' ? 0 : 7, name === 'Rotterdam' ? -8 : 0]} className="map-label map-label-port">
                {name}
              </Tooltip>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Selected-route facts, straight from the API */}
      <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-line bg-card border-t border-line text-[12px] font-mono">
        {selected ? (
          <>
            <div className="p-3">
              <span className="text-muted block text-[10px] uppercase">Route</span>
              <span className="text-ink font-bold text-[14px]">{selected.route_id}</span>
              <span className="text-ink-2 text-[11px] block mt-0.5">{selected.origin} → {selected.destination} · {selected.transport_mode}</span>
            </div>
            <div className="p-3">
              <span className="text-muted block text-[10px] uppercase">Transit time</span>
              <span className="text-primary font-bold text-[14px]">{fmtDays(selected.transit_time_days)}</span>
              <span className="text-ink-2 text-[11px] block mt-0.5">{fmtNumber(selected.distance_km)} km</span>
            </div>
            <div className="p-3">
              <span className="text-muted block text-[10px] uppercase">Cost per unit</span>
              <span className="text-ink font-bold text-[14px]">{fmtNumber(selected.cost_per_unit, 2)}</span>
              <span className="text-ink-2 text-[11px] block mt-0.5">capacity {fmtNumber(selected.capacity)} units</span>
            </div>
            <div className="p-3">
              <span className="text-muted block text-[10px] uppercase">Planned volume</span>
              <span className={`font-bold text-[14px] ${(selected.planned_quantity ?? 0) > 0 ? 'text-success' : 'text-muted'}`}>
                {selected.planned_quantity === null ? 'no plan yet' : `${fmtNumber(selected.planned_quantity)} units`}
              </span>
              <span className="text-ink-2 text-[11px] block mt-0.5">status {selected.status}</span>
            </div>
          </>
        ) : (
          <div className="p-3 col-span-2 md:col-span-4 text-[11px] text-muted">
            {emptyHint ?? 'Click a route on the map to see its transit time, cost, capacity and planned volume.'}
          </div>
        )}
      </div>
    </div>
  );
};
