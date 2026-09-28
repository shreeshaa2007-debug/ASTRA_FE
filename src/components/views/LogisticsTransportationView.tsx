import React, { useState } from 'react';
import {
  Truck,
  Ship,
  Compass,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  ExternalLink,
  Plus,
} from 'lucide-react';
import { MapContainer, TileLayer, Polyline, Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useOilShield } from '../../context/OilShieldContext';
import { TransportMode, LogisticsOption } from '../../types/oilshield';
import { StatusBadge } from '../common/StatusBadge';
import { FormModal, Field, TextInput, TextArea, Select } from '../common/FormModal';

// Helper for divIcon
const createMapMarkerIcon = (color: string, label: string, isAlert = false) =>
  L.divIcon({
    className: '',
    html: `<div style="display:flex;align-items:center;gap:5px;background:#0f172a;color:#ffffff;padding:3px 8px;border-radius:8px;border:1.5px solid ${color};font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 4px 10px rgba(0,0,0,0.35);">
      <span style="display:inline-block;width:8px;height:8px;border-radius:9999px;background:${color};${isAlert ? 'box-shadow:0 0 8px #ef4444;' : ''}"></span>
      <span>${label}</span>
    </div>`,
    iconSize: [120, 26],
    iconAnchor: [60, 13],
  });

export const LogisticsTransportationView: React.FC = () => {
  const {
    logistics,
    setCurrentView,
    selectedShipment,
    operationalShipments,
    selectedShipmentId,
    setSelectedShipmentId,
    addLogisticsOption,
  } = useOilShield();

  const [selectedRouteId, setSelectedRouteId] = useState<string>('LOG-02');
  const [modeFilter, setModeFilter] = useState<string>('ALL');

  // Add Route modal state
  const [isAddRouteOpen, setIsAddRouteOpen] = useState(false);
  const [routeName, setRouteName] = useState('');
  const [routeOrigin, setRouteOrigin] = useState('');
  const [routeDestination, setRouteDestination] = useState('');
  const [routeCurrentRoute, setRouteCurrentRoute] = useState('');
  const [routeAlternativeRoute, setRouteAlternativeRoute] = useState('');
  const [routeTransportMode, setRouteTransportMode] = useState<TransportMode>('SEA');
  const [routeEstimatedTravelHours, setRouteEstimatedTravelHours] = useState(0);
  const [routeTransportCostPerBbl, setRouteTransportCostPerBbl] = useState(0);
  const [routeAvailableCapacityBarrels, setRouteAvailableCapacityBarrels] = useState(0);
  const [routeRisk, setRouteRisk] = useState<LogisticsOption['routeRisk']>('LOW');
  const [routeInfrastructureNotes, setRouteInfrastructureNotes] = useState('');

  const resetAddRouteForm = () => {
    setRouteName('');
    setRouteOrigin('');
    setRouteDestination('');
    setRouteCurrentRoute('');
    setRouteAlternativeRoute('');
    setRouteTransportMode('SEA');
    setRouteEstimatedTravelHours(0);
    setRouteTransportCostPerBbl(0);
    setRouteAvailableCapacityBarrels(0);
    setRouteRisk('LOW');
    setRouteInfrastructureNotes('');
  };

  const handleAddRouteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addLogisticsOption({
      name: routeName,
      origin: routeOrigin,
      destination: routeDestination,
      currentRoute: routeCurrentRoute,
      alternativeRoute: routeAlternativeRoute,
      transportMode: routeTransportMode,
      estimatedTravelHours: routeEstimatedTravelHours,
      transportCostPerBbl: routeTransportCostPerBbl,
      availableCapacityBarrels: routeAvailableCapacityBarrels,
      routeRisk,
      infrastructureNotes: routeInfrastructureNotes,
    });
    resetAddRouteForm();
    setIsAddRouteOpen(false);
  };

  const selectedRoute = logistics.find((r) => r.id === selectedRouteId) || logistics[0];

  const filteredRoutes = logistics.filter(
    (r) => modeFilter === 'ALL' || r.transportMode === modeFilter
  );

  const getModeIcon = (mode: TransportMode) => {
    switch (mode) {
      case 'SEA':
        return Ship;
      case 'PIPELINE':
        return Compass;
      case 'ROAD':
      case 'RAIL':
        return Truck;
      default:
        return Compass;
    }
  };

  // Coordinates for the selected shipment routes
  // Ras Tanura, Saudi Arabia
  const rasTanuraCoords: [number, number] = [26.64, 50.16];
  // Chennai Port (Disrupted)
  const chennaiPortCoords: [number, number] = [13.0827, 80.2707];
  // Kamarajar Port (Ennore)
  const ennorePortCoords: [number, number] = [13.2464, 80.334];
  // Kochi Terminal
  const kochiCoords: [number, number] = [9.9312, 76.2673];

  // Route paths (approximated navigation lanes)
  const disruptedRoutePath: [number, number][] = [
    rasTanuraCoords,
    [25.0, 56.5],
    [22.5, 60.0],
    [15.5, 68.0],
    [10.0, 75.5],
    [8.0, 77.5],
    chennaiPortCoords,
  ];

  const ennoreAlternativePath: [number, number][] = [
    rasTanuraCoords,
    [25.0, 56.5],
    [22.5, 60.0],
    [15.5, 68.0],
    [10.0, 75.5],
    [8.0, 77.5],
    [12.8, 80.4],
    ennorePortCoords,
  ];

  const kochiPipelinePath: [number, number][] = [
    kochiCoords,
    [11.0, 76.9],
    [11.6, 78.1],
    [12.5, 79.5],
    chennaiPortCoords,
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Logistics & Transport
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational route evaluation, maritime diversions, and transit alternatives.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Shipment Switcher */}
          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
            Shipment:
          </span>
          <select
            value={selectedShipmentId}
            onChange={(e) => setSelectedShipmentId(e.target.value)}
            className="bg-white border border-slate-300 text-xs font-bold rounded-lg px-2.5 py-1.5 text-slate-900 focus:outline-hidden focus:border-accent focus:ring-2 focus:ring-accent/15 shadow-xs"
          >
            {operationalShipments.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id} — {s.vesselName}
              </option>
            ))}
          </select>

          <button
            onClick={() => setIsAddRouteOpen(true)}
            className="px-3 py-1.5 bg-primary hover:bg-primary-strong text-ink rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 ml-2"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Route</span>
          </button>

          <button
            onClick={() => setCurrentView('scenarios')}
            className="px-3 py-1.5 bg-primary hover:bg-primary-strong text-ink rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1 ml-2"
          >
            <span>Recovery Options</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Selected Shipment Operational Callout */}
      <div className="p-3.5 bg-white border border-slate-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary-soft text-accent border border-primary-border flex items-center justify-center flex-shrink-0">
            <Ship className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 text-xs">
                {selectedShipment.id}: {selectedShipment.vesselName}
              </span>
              <StatusBadge status={selectedShipment.status} size="sm" />
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Route: <strong>{selectedShipment.origin}</strong> → <strong>{selectedShipment.destination}</strong> • Cargo: <strong>{selectedShipment.cargo}</strong>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-md border border-red-200">
            {selectedShipment.delayHours > 0 ? `+${selectedShipment.delayHours}h Delay at Destination` : 'On Schedule'}
          </span>
        </div>
      </div>

      {/* MAP-FOCUSED LAYOUT (Section 9 Requirement) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Map Header with Honest Provider Status */}
        <div className="p-3 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">Shipment Route Map</span>
            <span className="text-slate-300">•</span>
            <span className="text-[11px] text-slate-500 font-mono">
              Origin to Destination Transit & Feasible Diversions
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-slate-600 text-[11px]">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Disrupted Passage
            </span>
            <span className="flex items-center gap-1.5 text-slate-600 text-[11px]">
              <span className="w-2.5 h-2.5 rounded-full bg-success" /> Recommended Diversion (Ennore)
            </span>
            <span className="flex items-center gap-1.5 text-slate-600 text-[11px]">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Pipeline Corridor (Kochi)
            </span>

            {/* Honest Provider Badge */}
            <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-mono rounded font-medium">
              Map Provider: OpenStreetMap / Leaflet (Google Maps key unconfigured)
            </span>
          </div>
        </div>

        {/* Leaflet Map Canvas — isolate so its internal panes/controls (z-index up to 1000) never stack above page overlays like modals */}
        <div className="w-full relative isolate" style={{ height: '360px' }}>
          <MapContainer
            center={[16.0, 68.0]}
            zoom={4}
            style={{ height: '100%', width: '100%', backgroundColor: '#f1f5f9' }}
            scrollWheelZoom={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Markers */}
            <Marker
              position={rasTanuraCoords}
              icon={createMapMarkerIcon('#3b82f6', 'Origin: Ras Tanura')}
            >
              <Tooltip>Origin Terminal: Ras Tanura, Saudi Arabia</Tooltip>
            </Marker>

            <Marker
              position={chennaiPortCoords}
              icon={createMapMarkerIcon('#ef4444', 'Chennai Port (Disrupted)', true)}
            >
              <Tooltip>Destination: Chennai Port Crude Berth 3 (+18h Delay)</Tooltip>
            </Marker>

            <Marker
              position={ennorePortCoords}
              icon={createMapMarkerIcon('#10b981', 'Ennore Port (+6.5h)')}
            >
              <Tooltip>Recommended Diversion: Kamarajar Port (Ennore) - 16.5m draft clear</Tooltip>
            </Marker>

            <Marker
              position={kochiCoords}
              icon={createMapMarkerIcon('#2563eb', 'Kochi Terminal')}
            >
              <Tooltip>Internal Reserve: Kochi BPCL Terminal</Tooltip>
            </Marker>

            {/* Disrupted Route Line (Red, Dashed) */}
            <Polyline
              positions={disruptedRoutePath}
              pathOptions={{
                color: '#ef4444',
                weight: selectedRouteId === 'LOG-01' ? 4 : 2.5,
                dashArray: '8, 6',
                opacity: 0.85,
              }}
            />

            {/* Recommended Ennore Diversion (Green, Solid) */}
            <Polyline
              positions={ennoreAlternativePath}
              pathOptions={{
                color: '#10b981',
                weight: selectedRouteId === 'LOG-02' ? 4 : 2.5,
                opacity: 0.9,
              }}
            />

            {/* Kochi Pipeline Corridor (Blue) */}
            <Polyline
              positions={kochiPipelinePath}
              pathOptions={{
                color: '#2563eb',
                weight: selectedRouteId === 'LOG-04' ? 4 : 2,
                dashArray: '6, 6',
                opacity: 0.8,
              }}
            />
          </MapContainer>
        </div>
      </div>

      {/* Filter and Mode Bar */}
      <div className="flex items-center justify-between gap-3 text-xs bg-white p-2.5 rounded-xl border border-slate-200">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-slate-700">Filter Mode:</span>
          {['ALL', 'SEA', 'PIPELINE', 'RAIL', 'ROAD'].map((m) => (
            <button
              key={m}
              onClick={() => setModeFilter(m)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                modeFilter === m
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {m === 'ALL' ? 'All Modes' : m}
            </button>
          ))}
        </div>

        <span className="text-[11px] text-slate-400">
          Showing {filteredRoutes.length} route options
        </span>
      </div>

      {/* Simple Route Comparison Table (Section 9 Requirement: Essential details, readable, uncluttered) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Route Option</th>
                <th className="py-2.5 px-3">Origin → Destination</th>
                <th className="py-2.5 px-3">Transport Mode</th>
                <th className="py-2.5 px-3">ETA Delay</th>
                <th className="py-2.5 px-3">Cost ($/bbl)</th>
                <th className="py-2.5 px-3">Total Spend</th>
                <th className="py-2.5 px-3">Capacity</th>
                <th className="py-2.5 px-3">Risk & Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRoutes.map((route) => {
                const Icon = getModeIcon(route.transportMode);
                const isSelected = route.id === selectedRouteId;
                const isDisrupted = route.status === 'CONGESTED' || route.status === 'DISRUPTED';
                const isAlternative = route.alternativePort === 'Kamarajar Port (Ennore)';

                return (
                  <tr
                    key={route.id}
                    onClick={() => setSelectedRouteId(route.id)}
                    className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                      isSelected ? 'bg-primary-soft/50 ring-1 ring-accent ring-inset' : ''
                    } ${isDisrupted ? 'bg-red-50/30' : ''}`}
                  >
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        {isAlternative && (
                          <span className="px-1.5 py-0.2 rounded bg-success text-white font-mono text-[9px] font-bold">
                            REC
                          </span>
                        )}
                        <span>{route.name}</span>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-slate-700">
                      {route.origin} → {route.alternativePort || route.destination}
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <Icon className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold text-slate-700">{route.transportMode}</span>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 font-mono font-bold">
                      <span className={isDisrupted ? 'text-red-600' : 'text-success'}>
                        +{route.estimatedTravelHours}h
                      </span>
                    </td>

                    <td className="py-2.5 px-3 font-mono text-slate-800 font-semibold">
                      ${route.transportCostPerBbl.toFixed(2)}/bbl
                    </td>

                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                      ${(route.totalCostUsd / 1000).toFixed(0)}k
                    </td>

                    <td className="py-2.5 px-3 font-mono text-slate-600">
                      {route.availableCapacityBarrels.toLocaleString()} bbl
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={route.routeRisk} size="sm" />
                        <span className="text-[10px] text-slate-400 font-medium">({route.status})</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Route Modal */}
      {isAddRouteOpen && (
        <FormModal
          title="Add Route"
          subtitle="Register a new logistics/transport route option."
          onClose={() => {
            resetAddRouteForm();
            setIsAddRouteOpen(false);
          }}
          onSubmit={handleAddRouteSubmit}
          submitLabel="Add Route"
        >
          <Field label="Name" required>
            <TextInput value={routeName} onChange={(e) => setRouteName(e.target.value)} placeholder="Kamarajar Port Diversion" required />
          </Field>
          <Field label="Origin" required>
            <TextInput value={routeOrigin} onChange={(e) => setRouteOrigin(e.target.value)} required />
          </Field>
          <Field label="Destination" required>
            <TextInput value={routeDestination} onChange={(e) => setRouteDestination(e.target.value)} required />
          </Field>
          <Field label="Current Route" required>
            <TextInput value={routeCurrentRoute} onChange={(e) => setRouteCurrentRoute(e.target.value)} required />
          </Field>
          <Field label="Alternative Route" required>
            <TextInput value={routeAlternativeRoute} onChange={(e) => setRouteAlternativeRoute(e.target.value)} required />
          </Field>
          <Field label="Transport Mode" required>
            <Select
              value={routeTransportMode}
              onChange={(e) => setRouteTransportMode(e.target.value as TransportMode)}
            >
              <option value="SEA">SEA</option>
              <option value="PIPELINE">PIPELINE</option>
              <option value="RAIL">RAIL</option>
              <option value="ROAD">ROAD</option>
              <option value="AIR">AIR</option>
            </Select>
          </Field>
          <Field label="Estimated Travel Hours" required>
            <TextInput
              type="number"
              value={routeEstimatedTravelHours}
              onChange={(e) => setRouteEstimatedTravelHours(Number(e.target.value))}
              required
            />
          </Field>
          <Field label="Transport Cost ($/bbl)" required>
            <TextInput
              type="number"
              value={routeTransportCostPerBbl}
              onChange={(e) => setRouteTransportCostPerBbl(Number(e.target.value))}
              required
            />
          </Field>
          <Field label="Available Capacity (Barrels)" required>
            <TextInput
              type="number"
              value={routeAvailableCapacityBarrels}
              onChange={(e) => setRouteAvailableCapacityBarrels(Number(e.target.value))}
              required
            />
          </Field>
          <Field label="Route Risk" required>
            <Select
              value={routeRisk}
              onChange={(e) => setRouteRisk(e.target.value as LogisticsOption['routeRisk'])}
            >
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
            </Select>
          </Field>
          <Field label="Infrastructure Notes" required>
            <TextArea
              value={routeInfrastructureNotes}
              onChange={(e) => setRouteInfrastructureNotes(e.target.value)}
              rows={3}
              required
            />
          </Field>
        </FormModal>
      )}
    </div>
  );
};
