import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, GeoJSON, Polyline, Marker, Tooltip, ZoomControl } from 'react-leaflet';
import type { GeoJsonObject } from 'geojson';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ApiRoute } from '../../types/api';
import { CAPE_OF_GOOD_HOPE, PORT_COORDS, SUEZ } from '../../data/network';
import { fmtDays, fmtNumber } from '../../utils/format';

interface GlobalMapProps {
  routes: ApiRoute[];
  onSelectRoute?: (route: ApiRoute) => void;
  selectedRouteId?: string;
}

type LatLng = [number, number];
type Filter = 'all' | 'disrupted' | 'planned' | 'normal';

// A route id ends in its corridor (SHA-ROT-SUEZ, SIN-ROT-CAPE, SHA-ROT-RAIL...) — the
// same convention the Sensing Agent's catalog reads. Falls back to the transport mode.
function corridorOf(route: ApiRoute): string {
  const last = route.route_id.split('-').pop()?.toUpperCase() ?? '';
  if (['SUEZ', 'CAPE', 'RAIL', 'AIR'].includes(last)) return last;
  return route.transport_mode.toUpperCase();
}

interface RouteVisual {
  color: string;
  dash: string;
  via?: LatLng[];
  truncateAtVia?: boolean;
  weight: number;
}

// Colour says what the API says about the route: status first, then whether the
// optimizer's plan actually puts volume on it, then its corridor.
function visualFor(route: ApiRoute): RouteVisual {
  const corridor = corridorOf(route);
  const via = corridor === 'SUEZ' ? [SUEZ] : corridor === 'CAPE' ? [CAPE_OF_GOOD_HOPE] : undefined;
  const planned = (route.planned_quantity ?? 0) > 0;
  if (route.status === 'DISRUPTED') return { color: '#ffb4ab', dash: '7 6', via, truncateAtVia: corridor === 'SUEZ', weight: 3 };
  if (planned) return { color: '#4edea3', dash: '10 6', via, weight: 4 };
  if (route.status === 'DELAYED') return { color: '#ffb95f', dash: '6 4', via, weight: 2.5 };
  if (route.status === 'ALTERNATIVE') return { color: '#0ea5e9', dash: '6 4', via, weight: 2.5 };
  return { color: '#5b6b82', dash: '4 4', via, weight: 2 };
}

// Keeps a route's longitude delta under 180° so lines take the shorter path
// across the map instead of the "long way round".
function unwrapLng(fromLng: number, toLng: number): number {
  const delta = toLng - fromLng;
  if (delta > 180) return toLng - 360;
  if (delta < -180) return toLng + 360;
  return toLng;
}

// Bows a line between two points into a smooth arc — a stand-in for a
// great-circle curve at this zoom level.
function arcBetween(start: LatLng, end: LatLng, curvature: number, segments = 48): LatLng[] {
  const [lat1, lng1] = start;
  const lat2 = end[0];
  const lng2 = unwrapLng(lng1, end[1]);
  const midLat = (lat1 + lat2) / 2;
  const midLng = (lng1 + lng2) / 2;
  const dLat = lat2 - lat1;
  const dLng = lng2 - lng1;
  const controlLat = midLat - dLng * curvature;
  const controlLng = midLng + dLat * curvature;

  const points: LatLng[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    points.push([
      (1 - t) ** 2 * lat1 + 2 * (1 - t) * t * controlLat + t ** 2 * lat2,
      (1 - t) ** 2 * lng1 + 2 * (1 - t) * t * controlLng + t ** 2 * lng2,
    ]);
  }
  return points;
}

function routePath(origin: LatLng, destination: LatLng, visual: RouteVisual): LatLng[][] {
  const curvature = 0.18;
  if (!visual.via || visual.via.length === 0) return [arcBetween(origin, destination, curvature)];
  const waypoints = [origin, ...visual.via, destination];
  const segments: LatLng[][] = [];
  for (let i = 0; i < waypoints.length - 1; i++) segments.push(arcBetween(waypoints[i], waypoints[i + 1], curvature / (i + 1)));
  return segments;
}

function dotIcon(color: string, size: number): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<span style="position:relative;display:block;width:${size}px;height:${size}px;background:${color};border-radius:9999px;box-shadow:0 0 6px ${color};"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function chokepointIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<span style="position:relative;display:flex;align-items:center;justify-content:center;width:20px;height:20px;background:#93000a;border-radius:9999px;box-shadow:0 0 10px #ef4444;" class="animate-pulse">
      <span style="position:absolute;inset:-8px;border:2px solid #ef4444;border-radius:9999px;opacity:0.5;"></span>
      <span style="color:white;font-size:11px;font-weight:bold;line-height:1;">&times;</span>
    </span>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

// The basemap is land polygons bundled with the app (public/land110m.json, Natural Earth 110m, public
// domain) rather than a tile service: no API key, no rate limit, and it works with no network at all —
// which is what a demo on conference wifi needs. Routes are drawn over it exactly as before.
const LAND_STYLE = { color: '#2c3d5c', weight: 0.8, fillColor: '#16223a', fillOpacity: 1 } as const;

export const GlobalMap: React.FC<GlobalMapProps> = ({ routes, onSelectRoute, selectedRouteId }) => {
  const [filter, setFilter] = useState<Filter>('all');
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [land, setLand] = useState<GeoJsonObject | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/land110m.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setLand(data as GeoJsonObject);
      })
      .catch(() => undefined); // no land layer is a plainer map, not a broken one
    return () => {
      cancelled = true;
    };
  }, []);

  const counts = useMemo(
    () => ({
      disrupted: routes.filter((r) => r.status === 'DISRUPTED').length,
      planned: routes.filter((r) => (r.planned_quantity ?? 0) > 0).length,
      normal: routes.filter((r) => r.status === 'NORMAL' || r.status === 'ALTERNATIVE' || r.status === 'DELAYED').length,
    }),
    [routes]
  );

  const filteredRoutes = routes.filter((r) => {
    if (filter === 'disrupted') return r.status === 'DISRUPTED';
    if (filter === 'planned') return (r.planned_quantity ?? 0) > 0;
    if (filter === 'normal') return r.status !== 'DISRUPTED';
    return true;
  });

  const nodes = useMemo(() => {
    const map = new Map<string, LatLng>();
    for (const r of filteredRoutes) {
      if (PORT_COORDS[r.origin]) map.set(r.origin, PORT_COORDS[r.origin]);
      if (PORT_COORDS[r.destination]) map.set(r.destination, PORT_COORDS[r.destination]);
    }
    return Array.from(map.entries());
  }, [filteredRoutes]);

  const disruptedRoutes = routes.filter((r) => r.status === 'DISRUPTED');
  const suezBlocked = filteredRoutes.some((r) => r.status === 'DISRUPTED' && corridorOf(r) === 'SUEZ');
  const capeShown = filteredRoutes.some((r) => corridorOf(r) === 'CAPE');
  const selected = routes.find((r) => r.route_id === selectedRouteId) ?? null;

  const filterButton = (id: Filter, label: string, activeStyle: string) => (
    <button
      onClick={() => setFilter(id)}
      className={`px-2.5 py-1 rounded transition-colors ${filter === id ? activeStyle : 'text-[#bec8d2] hover:text-white'}`}
    >
      {label}
    </button>
  );

  return (
    <div className="relative w-full bg-[#060e20] border border-[#3e4850] rounded-lg overflow-hidden select-none">
      {/* Map Control Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#131b2e] border-b border-[#3e4850]">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#89ceff] text-[18px]">public</span>
          <span className="font-headline text-[14px] font-bold tracking-wide text-[#dae2fd]">MULTI-MODAL LOGISTICS NETWORK</span>
          <span className="hidden sm:inline-block text-[11px] font-mono text-[#88929b] border-l border-[#3e4850] pl-2">
            {routes.length} ROUTES · SYNTHETIC LANES BETWEEN REAL WPI PORTS
          </span>
        </div>

        <div className="flex items-center gap-1 bg-[#060e20] p-1 rounded border border-[#3e4850] text-[11px] font-mono">
          {filterButton('all', `All (${routes.length})`, 'bg-[#222a3d] text-[#89ceff] font-bold')}
          {filterButton('disrupted', `Disrupted (${counts.disrupted})`, 'bg-[#93000a] text-[#ffb4ab] font-bold')}
          {filterButton('planned', `Carrying plan (${counts.planned})`, 'bg-[#00a572] text-[#dae2fd] font-bold')}
        </div>
      </div>

      {/* Live Map Canvas */}
      <div className="relative h-[340px] sm:h-[420px] w-full overflow-hidden">
        {disruptedRoutes.length > 0 && (
          <div className="absolute top-4 left-4 z-[1000] max-w-[280px] bg-[#171f33]/95 backdrop-blur border border-[#93000a] p-3 rounded-lg shadow-2xl pointer-events-none">
            <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-[#3e4850]">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#ffb4ab] font-bold flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#ffb4ab] animate-ping"></span>
                {disruptedRoutes.length} ROUTE{disruptedRoutes.length === 1 ? '' : 'S'} DISRUPTED
              </span>
            </div>
            <div className="mt-2 space-y-0.5 text-[11px] font-mono text-[#bec8d2]">
              {disruptedRoutes.map((r) => (
                <div key={r.route_id}>
                  {r.route_id} <span className="text-[#88929b]">({r.origin} → {r.destination})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="absolute bottom-3 left-4 z-[1000] hidden md:flex items-center gap-4 bg-[#131b2e]/90 backdrop-blur border border-[#3e4850] px-3 py-1.5 rounded text-[10px] font-mono pointer-events-none">
          {[
            ['#ffb4ab', 'Disrupted'],
            ['#4edea3', 'Carries plan volume'],
            ['#0ea5e9', 'Alternative'],
            ['#5b6b82', 'Normal'],
          ].map(([color, label]) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }}></span>
              <span className="text-[#bec8d2]">{label}</span>
            </div>
          ))}
        </div>

        {hoveredNode && (
          <div className="absolute top-4 right-4 z-[1000] bg-[#171f33]/90 border border-[#3e4850] px-3 py-1.5 rounded text-[11px] font-mono text-[#dae2fd] pointer-events-none">
            Hovering: <span className="text-[#89ceff] font-bold">{hoveredNode}</span>
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
          style={{ background: '#060e20' }}
        >
          <ZoomControl position="topright" />
          {land && <GeoJSON data={land} style={() => LAND_STYLE} interactive={false} />}

          {filteredRoutes.map((route) => {
            const origin = PORT_COORDS[route.origin];
            const destination = PORT_COORDS[route.destination];
            if (!origin || !destination) return null;

            const visual = visualFor(route);
            const segments = routePath(origin, destination, visual);
            const isSelected = route.route_id === selectedRouteId;

            return (
              <React.Fragment key={route.route_id}>
                {segments.map((segment, i) => {
                  const dimmed = visual.truncateAtVia && i === segments.length - 1;
                  return (
                    <Polyline
                      key={`${route.route_id}-${i}`}
                      positions={segment}
                      pathOptions={{
                        color: visual.color,
                        weight: visual.weight + (isSelected ? 1.5 : 0),
                        opacity: dimmed ? 0.3 : isSelected ? 1 : 0.85,
                        dashArray: visual.dash,
                      }}
                      eventHandlers={{ click: () => onSelectRoute?.(route) }}
                    >
                      <Tooltip sticky className="!bg-[#171f33] !border-[#3e4850] !text-[#dae2fd] !font-mono !text-[11px]">
                        {route.route_id} · {route.status}
                        {(route.planned_quantity ?? 0) > 0 ? ` · plan: ${fmtNumber(route.planned_quantity)} units` : ''}
                      </Tooltip>
                    </Polyline>
                  );
                })}
              </React.Fragment>
            );
          })}

          {suezBlocked && (
            <Marker position={SUEZ} icon={chokepointIcon()} eventHandlers={{ mouseover: () => setHoveredNode('Suez Canal') }}>
              <Tooltip direction="bottom" offset={[0, 12]} className="!bg-[#171f33] !border-[#93000a] !text-[#ffb4ab] !font-mono !text-[11px]">
                SUEZ CANAL — LANES DISRUPTED
              </Tooltip>
            </Marker>
          )}

          {capeShown && (
            <Marker position={CAPE_OF_GOOD_HOPE} icon={dotIcon('#0ea5e9', 10)} eventHandlers={{ mouseover: () => setHoveredNode('Cape of Good Hope') }}>
              <Tooltip direction="top" offset={[0, -6]} className="!bg-[#171f33] !border-[#3e4850] !text-[#89ceff] !font-mono !text-[11px]">
                Cape of Good Hope waypoint
              </Tooltip>
            </Marker>
          )}

          {nodes.map(([name, position]) => (
            <Marker key={name} position={position} icon={dotIcon('#89ceff', name === 'Rotterdam' ? 12 : 9)} eventHandlers={{ mouseover: () => setHoveredNode(name) }}>
              <Tooltip direction="right" offset={[8, 0]} className="!bg-[#171f33] !border-[#3e4850] !text-[#dae2fd] !font-mono !text-[11px]">
                <div className="font-bold">{name}</div>
              </Tooltip>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Selected-route facts, straight from the API */}
      <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[#3e4850] bg-[#131b2e] border-t border-[#3e4850] text-[12px] font-mono">
        {selected ? (
          <>
            <div className="p-3">
              <span className="text-[#88929b] block text-[10px] uppercase">Route</span>
              <span className="text-white font-bold text-[14px]">{selected.route_id}</span>
              <span className="text-[#bec8d2] text-[11px] block mt-0.5">{selected.origin} → {selected.destination} · {selected.transport_mode}</span>
            </div>
            <div className="p-3">
              <span className="text-[#88929b] block text-[10px] uppercase">Transit time</span>
              <span className="text-[#89ceff] font-bold text-[14px]">{fmtDays(selected.transit_time_days)}</span>
              <span className="text-[#bec8d2] text-[11px] block mt-0.5">{fmtNumber(selected.distance_km)} km</span>
            </div>
            <div className="p-3">
              <span className="text-[#88929b] block text-[10px] uppercase">Cost per unit</span>
              <span className="text-white font-bold text-[14px]">{fmtNumber(selected.cost_per_unit, 2)}</span>
              <span className="text-[#bec8d2] text-[11px] block mt-0.5">capacity {fmtNumber(selected.capacity)} units</span>
            </div>
            <div className="p-3">
              <span className="text-[#88929b] block text-[10px] uppercase">Planned volume</span>
              <span className={`font-bold text-[14px] ${(selected.planned_quantity ?? 0) > 0 ? 'text-[#4edea3]' : 'text-[#88929b]'}`}>
                {selected.planned_quantity === null ? 'no plan yet' : `${fmtNumber(selected.planned_quantity)} units`}
              </span>
              <span className="text-[#bec8d2] text-[11px] block mt-0.5">status {selected.status}</span>
            </div>
          </>
        ) : (
          <div className="p-3 col-span-2 md:col-span-4 text-[11px] text-[#88929b]">Click a route on the map to see its transit time, cost, capacity and planned volume.</div>
        )}
      </div>
    </div>
  );
};
