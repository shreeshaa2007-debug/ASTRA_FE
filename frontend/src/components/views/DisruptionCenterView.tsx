import React from 'react';
import {
  AlertTriangle,
  Clock,
  MapPin,
  Ship,
  Factory,
  Building,
  ArrowRight,
  TrendingUp,
  Activity,
  Waves,
  Wrench,
  Layers,
  CheckCircle,
  AlertOctagon,
  Eye,
} from 'lucide-react';
import { useOilShield } from '../../context/OilShieldContext';
import { StatusBadge } from '../common/StatusBadge';
import { DisruptionIncident } from '../../types/oilshield';

export const DisruptionCenterView: React.FC = () => {
  const {
    incidents,
    selectedIncident,
    setSelectedIncidentId,
    setCurrentView,
  } = useOilShield();

  const affectedShipments = [
    {
      id: 'SHP-1042',
      vessel: 'MT Ocean Vanguard',
      cargo: 'Arab Light Crude (32.8° API)',
      quantityBbl: 20000,
      destination: 'Chennai Port Crude Berth 3',
      currentStatus: 'Anchored at Outer Basin (No Berth Assigned)',
      delayHours: 18,
      severity: 'CRITICAL',
      refinery: 'Chennai Refinery (CPCL)',
      customer: 'Customer C104',
    },
    {
      id: 'SHP-1048',
      vessel: 'MT Southern Falcon',
      cargo: 'Bonny Light Crude (35.2° API)',
      quantityBbl: 14000,
      destination: 'Chennai Port Crude Berth 2',
      currentStatus: 'Holding Speed at 8.2 knots (ETA Pushed)',
      delayHours: 12,
      severity: 'HIGH',
      refinery: 'Chennai Refinery (CPCL)',
      customer: 'Customer C108',
    },
    {
      id: 'SHP-1051',
      vessel: 'MT Coastal Pioneer',
      cargo: 'Basrah Heavy Crude (24.0° API)',
      quantityBbl: 12000,
      destination: 'Chennai Offshore SPM',
      currentStatus: 'Anchored 14 NM Offshore',
      delayHours: 9,
      severity: 'MEDIUM',
      refinery: 'Chennai Refinery (CPCL)',
      customer: 'Internal Reserve',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Disruption Center
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 text-xs font-bold font-mono">
              3 Incidents Logged
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time multi-source disruption sensing across port terminals, maritime chokepoints, and pipeline corridors.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentView('agents')}
            className="px-4 py-2 bg-[#154734] hover:bg-[#1b5941] text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5"
          >
            <span>Trigger Agent Impact Analysis</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Incident Switcher Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {incidents.map((inc) => {
          const isSelected = inc.id === selectedIncident.id;
          return (
            <div
              key={inc.id}
              onClick={() => setSelectedIncidentId(inc.id)}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-white border-[#154734] shadow-md ring-2 ring-[#154734]/20'
                  : 'bg-white/80 border-slate-200 hover:bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  {inc.id}
                </span>
                <StatusBadge status={inc.severity} size="sm" />
              </div>

              <div className="mt-2.5">
                <h4 className="font-bold text-sm text-slate-900 leading-snug">
                  {inc.type}
                </h4>
                <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{inc.location}</span>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-mono">+{inc.estimatedDelayHours}h Delay</span>
                <span className="font-semibold text-slate-700 font-mono">
                  {inc.quantityBarrels.toLocaleString()} bbl
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Incident Detailed Dossier */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-red-600 text-white rounded text-xs font-mono font-bold">
                PRIMARY FOCUS
              </span>
              <span className="text-lg font-bold font-mono text-slate-900">
                {selectedIncident.id}
              </span>
              <StatusBadge status={selectedIncident.status} size="md" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900">
              {selectedIncident.title} — {selectedIncident.location}
            </h2>
            <p className="text-xs text-slate-500">
              Detection Timestamp: {selectedIncident.detectionTime} • AIS Feed Stream Verified
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentView('scenarios')}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center gap-2"
            >
              <span>View Generated Recovery Plans</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Telemetry Sensor Panels */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Wrench className="w-4 h-4 text-red-500" />
              <span>Port Infrastructure Failure</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Crude Berth 3 hydraulic gantry manifold valve #HV-04 suffered actuator pressure seal rupture. Port Authority engineering team estimating 22 hours for replacement part fabrication and testing.
            </p>
            <div className="pt-2 text-[11px] font-mono text-red-600 font-semibold">
              Current Berth Status: UNAVAILABLE
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Waves className="w-4 h-4 text-amber-500" />
              <span>Marine Meteorological Warning</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Southwest monsoon swell peaking at 2.8 meters with 14-second wave period. Tugboat pilot boarding operations suspended for vessels exceeding 14.0m draft at Chennai outer anchorage.
            </p>
            <div className="pt-2 text-[11px] font-mono text-amber-700 font-semibold">
              Pilotage Operations: SUSPENDED (High Risk)
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Activity className="w-4 h-4 text-emerald-600" />
              <span>Supply Exposure Impact</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              18,000 barrels total crude delayed. Downstream Chennai CPCL Refinery will hit minimum operating threshold in 26.4 hours, triggering an un-scheduled CDU shutdown costing ~$420,000.
            </p>
            <div className="pt-2 text-[11px] font-mono text-[#154734] font-semibold">
              Refinery Throttle Countdown: 26.4 hrs
            </div>
          </div>
        </div>

        {/* Affected Shipments Table */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Ship className="w-4 h-4 text-[#154734]" />
              <span>Affected Shipments in Chennai Maritime Cluster</span>
            </h3>
            <span className="text-xs text-slate-500">3 Vessels Directly Impacted</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Shipment ID</th>
                  <th className="py-2.5 px-3">Vessel</th>
                  <th className="py-2.5 px-3">Crude Cargo</th>
                  <th className="py-2.5 px-3">Quantity</th>
                  <th className="py-2.5 px-3">Current Location / Status</th>
                  <th className="py-2.5 px-3">Est. Delay</th>
                  <th className="py-2.5 px-3">Affected Refinery</th>
                  <th className="py-2.5 px-3">Severity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {affectedShipments.map((shp) => (
                  <tr key={shp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                      {shp.id}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      {shp.vessel}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {shp.cargo}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-900 font-bold">
                      {shp.quantityBbl.toLocaleString()} bbl
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {shp.currentStatus}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-red-600">
                      +{shp.delayHours}h
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      {shp.refinery}
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={shp.severity} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
