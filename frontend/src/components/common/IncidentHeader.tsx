import React from 'react';
import {
  AlertTriangle,
  Clock,
  MapPin,
  Ship,
  Factory,
  Building,
  ArrowRight,
  ShieldAlert,
  Flame,
} from 'lucide-react';
import { DisruptionIncident } from '../../types/oilshield';
import { StatusBadge } from './StatusBadge';

interface IncidentHeaderProps {
  incident: DisruptionIncident;
  onViewIncident: (incident: DisruptionIncident) => void;
  onOpenRecoveryPlanner?: () => void;
}

export const IncidentHeader: React.FC<IncidentHeaderProps> = ({
  incident,
  onViewIncident,
  onOpenRecoveryPlanner,
}) => {
  const isCongestion = incident.type.toLowerCase().includes('port');

  return (
    <div className="bg-white rounded-2xl border-2 border-red-200 shadow-md p-5 sm:p-6 relative overflow-hidden">
      {/* Top emergency status stripe */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-amber-500 to-red-600" />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        {/* Left: Incident core details */}
        <div className="space-y-3 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-600 text-white font-mono text-xs font-bold tracking-wider uppercase">
              <ShieldAlert className="w-3.5 h-3.5" />
              Active Incident
            </span>
            <span className="font-mono font-bold text-slate-900 text-sm bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
              {incident.id}
            </span>
            <StatusBadge status={incident.severity} size="md" />
            <StatusBadge status={incident.status} size="md" />
            <span className="text-xs text-slate-500 flex items-center gap-1 ml-auto lg:ml-0">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Detected {incident.detectionTime}
            </span>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <span>{incident.type}</span>
              <span className="text-slate-400 font-normal">at</span>
              <span className="text-red-700 underline decoration-red-300 underline-offset-4">
                {incident.location}
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 line-clamp-2">
              <span className="font-semibold text-slate-800">Root Cause:</span> {incident.rootCause}
            </p>
          </div>

          {/* Quick metadata grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-xs">
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <span className="text-slate-500 flex items-center gap-1 text-[11px] font-medium">
                <Ship className="w-3.5 h-3.5 text-slate-400" /> Affected Shipment
              </span>
              <span className="font-semibold text-slate-800 block mt-0.5 truncate" title={incident.affectedShipment}>
                {incident.affectedShipment}
              </span>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <span className="text-slate-500 flex items-center gap-1 text-[11px] font-medium">
                <Flame className="w-3.5 h-3.5 text-amber-500" /> Product & Volume
              </span>
              <span className="font-semibold text-slate-800 block mt-0.5">
                {incident.quantityBarrels.toLocaleString()} bbl Crude
              </span>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <span className="text-slate-500 flex items-center gap-1 text-[11px] font-medium">
                <Factory className="w-3.5 h-3.5 text-slate-400" /> Affected Refinery
              </span>
              <span className="font-semibold text-slate-800 block mt-0.5 truncate" title={incident.affectedRefinery}>
                {incident.affectedRefinery}
              </span>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <span className="text-slate-500 flex items-center gap-1 text-[11px] font-medium">
                <Building className="w-3.5 h-3.5 text-slate-400" /> Key Customer
              </span>
              <span className="font-semibold text-slate-800 block mt-0.5 truncate" title={incident.affectedCustomer}>
                {incident.affectedCustomer}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Operational delay impact & Action buttons */}
        <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-3 lg:border-l lg:border-slate-100 lg:pl-6">
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-left lg:text-right w-full sm:w-auto">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-red-700">
              Estimated Delay
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-red-600 font-mono">
              +{incident.estimatedDelayHours} Hours
            </div>
            <span className="text-[11px] text-red-600/80 block mt-0.5">
              Refinery starvation in 26h without reroute
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => onViewIncident(incident)}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors shadow-sm flex items-center justify-center gap-1.5"
            >
              <span>View Incident Details</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            {onOpenRecoveryPlanner && (
              <button
                onClick={onOpenRecoveryPlanner}
                className="px-4 py-2.5 bg-[#154734] hover:bg-[#1b5941] text-white rounded-xl text-xs font-semibold transition-colors shadow-xs flex items-center justify-center gap-1.5"
              >
                <span>Recovery Plans</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
