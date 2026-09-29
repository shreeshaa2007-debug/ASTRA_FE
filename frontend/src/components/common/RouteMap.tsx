import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LogisticsOption } from '../../types/oilshield';
import { getRouteGeometry, MODE_STYLE, RoutePoint } from '../../data/routeGeometry';

const ROLE_COLOR: Record<RoutePoint['role'], string> = {
  origin: '#2563eb',
  via: '#64748b',
  destination: '#15803d',
};

// The label is centred on its point with CSS, so its width never has to be guessed.
const pointIcon = (label: string, color: string, alert: boolean, above: boolean) =>
  L.divIcon({
    className: '',
    iconSize: [0, 0],
    html: `<div style="position:absolute;left:0;top:0;transform:translate(-50%,${above ? '-135%' : '35%'});display:flex;align-items:center;gap:5px;background:#0f172a;color:#fff;padding:3px 8px;border-radius:8px;border:1.5px solid ${color};font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 4px 10px rgba(0,0,0,.35);">
      <span style="width:8px;height:8px;border-radius:9999px;background:${color};${alert ? 'box-shadow:0 0 8px #ef4444;' : ''}"></span>${label}</div>
      <div style="position:absolute;left:-4px;top:-4px;width:8px;height:8px;border-radius:9999px;background:${color};border:2px solid #fff;"></div>`,
  });

const FitTo: React.FC<{ path: [number, number][] }> = ({ path }) => {
  const map = useMap();
  useEffect(() => {
    if (path.length > 1) map.fitBounds(L.latLngBounds(path), { padding: [50, 50], maxZoom: 8 });
  }, [map, path]);
  return null;
};

interface Props {
  routes: LogisticsOption[];
  selectedId: string;
}

export const RouteMap: React.FC<Props> = ({ routes, selectedId }) => {
  const drawn = useMemo(
    () => routes.map((r) => ({ route: r, geo: getRouteGeometry(r) })).filter((d) => d.geo),
    [routes]
  );
  const selected = drawn.find((d) => d.route.id === selectedId);

  return (
    <MapContainer
      center={[16, 72]}
      zoom={4}
      style={{ height: '100%', width: '100%', backgroundColor: '#f1f5f9' }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {selected && <FitTo key={selectedId} path={selected.geo!.path} />}

      {/* other routes, faint, in their own mode's style; the selected one is drawn last, on top */}
      {[...drawn].sort((a, b) => Number(a.route.id === selectedId) - Number(b.route.id === selectedId)).map(({ route, geo }) => {
        const style = MODE_STYLE[route.transportMode];
        const on = route.id === selectedId;
        const disrupted = route.status === 'DISRUPTED' || route.status === 'CONGESTED';
        const color = on && disrupted ? '#dc2626' : style.color;
        return (
          <React.Fragment key={route.id}>
            <Polyline
              positions={geo!.path}
              pathOptions={{
                color,
                weight: on ? style.weight + 1.5 : Math.max(style.weight - 1, 2),
                opacity: on ? 0.95 : 0.35,
                dashArray: style.dashArray,
              }}
            >
              <Tooltip sticky>
                {route.name} · {route.transportMode}
              </Tooltip>
            </Polyline>
            {style.track && (
              <Polyline
                positions={geo!.path}
                interactive={false}
                pathOptions={{ color: '#fff', weight: 2, dashArray: '8, 8', opacity: on ? 0.95 : 0.35 }}
              />
            )}
          </React.Fragment>
        );
      })}

      {selected &&
        selected.geo!.points.map((p, i) => (
          <Marker
            key={`${selectedId}-${p.name}`}
            position={p.coords}
            icon={pointIcon(
              p.name,
              ROLE_COLOR[p.role],
              p.role === 'destination' && (selected.route.status === 'DISRUPTED' || selected.route.status === 'CONGESTED'),
              i % 2 === 0
            )}
          >
            <Tooltip>
              {p.role === 'origin' ? 'Start' : p.role === 'destination' ? 'Destination' : 'Passes through'}: {p.name}
            </Tooltip>
          </Marker>
        ))}
    </MapContainer>
  );
};
