import React, { useState } from 'react';
import {
  GitBranch,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Eye,
  Sliders,
  DollarSign,
  Clock,
  Boxes,
  ShieldCheck,
} from 'lucide-react';
import { useOilShield } from '../../context/OilShieldContext';
import { DynamicRecoveryOption } from '../../types/oilshield';
import { StatusBadge } from '../common/StatusBadge';

export const RecoveryScenariosView: React.FC = () => {
  const {
    operationalShipments,
    selectedShipment,
    selectedShipmentId,
    setSelectedShipmentId,
    dynamicRecoveryOptions,
    selectedRecoveryOptionId,
    setSelectedRecoveryOptionId,
    setCurrentView,
    emergencySpendLimit,
  } = useOilShield();

  // Track expanded details for each option
  const [expandedOptionIds, setExpandedOptionIds] = useState<Record<string, boolean>>({
    'REC-OPT-01': true, // Expand first by default
  });

  const toggleExpand = (id: string) => {
    setExpandedOptionIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleSelectAndSubmit = (option: DynamicRecoveryOption) => {
    setSelectedRecoveryOptionId(option.id);
    setCurrentView('decisions');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Shipment Recovery Options
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Dynamically evaluated recovery options based on real-time operational constraints.
          </p>
        </div>

        {/* Shipment Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
            Shipment:
          </span>
          <select
            value={selectedShipmentId}
            onChange={(e) => setSelectedShipmentId(e.target.value)}
            className="bg-white border border-slate-300 text-xs font-bold rounded-lg px-2.5 py-1.5 text-slate-900 focus:outline-hidden focus:border-[#154734] focus:ring-2 focus:ring-[#154734]/15 shadow-xs"
          >
            {operationalShipments.map((shp) => (
              <option key={shp.id} value={shp.id}>
                {shp.id} — {shp.vesselName} ({shp.delayHours > 0 ? `+${shp.delayHours}h` : 'OK'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Shipment Disruption & Operational Constraints Summary */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-[#154734] flex items-center justify-center font-bold text-xs border border-emerald-200/80">
              {selectedShipment.id.split('-')[1] || 'SHP'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 text-xs">
                  {selectedShipment.id}: {selectedShipment.vesselName}
                </span>
                <StatusBadge status={selectedShipment.status} size="sm" />
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {selectedShipment.origin} → {selectedShipment.destination} • Cargo: {selectedShipment.cargo}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-600">
              Emergency Cap: <span className="font-mono font-bold text-slate-900">${(emergencySpendLimit / 1000).toFixed(0)}k</span>
            </div>
            <div className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-600">
              Current Delay: <span className="font-mono font-bold text-red-600">+{selectedShipment.delayHours}h</span>
            </div>
          </div>
        </div>

        {/* Dynamic constraint tags */}
        <div className="pt-2.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
          <span className="font-bold text-slate-700">Evaluated Conditions:</span>
          <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700">
            Destination Berthage: {selectedShipment.delayHours > 0 ? 'Congested (+18h)' : 'Normal'}
          </span>
          <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700">
            Refinery Feedstock Window: 26.4h remaining
          </span>
          <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700">
            Diversion Ports Verified: Kamarajar Port (Ennore)
          </span>
          <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700">
            Pipeline Capacity: 74% available
          </span>
        </div>
      </div>

      {/* DYNAMICALLY POPULATED RECOVERY OPTIONS LIST (Section 11 Requirement) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
          <span>{dynamicRecoveryOptions.length} Viable Options Generated by Scenario Agent</span>
          <span>Select an option to review and submit for human approval</span>
        </div>

        {dynamicRecoveryOptions.map((opt) => {
          const isSelected = opt.id === selectedRecoveryOptionId;
          const isExpanded = !!expandedOptionIds[opt.id];
          const isApproved = opt.humanApprovalStatus === 'APPROVED' || opt.humanApprovalStatus === 'MODIFIED_APPROVED';

          return (
            <div
              key={opt.id}
              className={`rounded-xl border transition-all duration-150 overflow-hidden shadow-xs ${
                isSelected
                  ? 'bg-emerald-50/20 border-[#154734] ring-2 ring-[#154734]/20'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Option Main Summary Bar */}
              <div className="p-4 sm:p-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                        {opt.category}
                      </span>
                      {opt.isRecommended && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#154734] text-white">
                          AI RECOMMENDED
                        </span>
                      )}
                      <StatusBadge status={opt.complianceStatus} size="sm" />
                      {isApproved && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                          APPROVED BY OPERATOR
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {opt.title}
                    </h3>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {opt.operationalSummary}
                    </p>
                  </div>

                  {/* Key Metrics Columns */}
                  <div className="flex items-center gap-4 sm:gap-6 flex-shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    <div className="text-center min-w-[70px]">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">ETA DELTA</span>
                      <span className="font-mono font-bold text-sm text-slate-900 block mt-0.5">
                        +{opt.etaDeltaHours}h
                      </span>
                      <span className="text-[10px] text-emerald-700 font-semibold block">
                        {selectedShipment.delayHours > opt.etaDeltaHours
                          ? `-${selectedShipment.delayHours - opt.etaDeltaHours}h saved`
                          : 'Baseline'}
                      </span>
                    </div>

                    <div className="text-center min-w-[80px]">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">COST SPEND</span>
                      <span className="font-mono font-bold text-sm text-slate-900 block mt-0.5">
                        ${(opt.costUsd / 1000).toFixed(0)}k
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono block">
                        ${opt.costPerBbl.toFixed(2)}/bbl
                      </span>
                    </div>

                    <div className="text-center min-w-[75px]">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">FEASIBILITY</span>
                      <span className="font-mono font-bold text-sm text-emerald-600 block mt-0.5">
                        {opt.feasibilityScore}%
                      </span>
                      <span className="text-[10px] text-slate-500 block">Verified</span>
                    </div>

                    {/* Action button: Submit for Human Approval */}
                    <div className="flex flex-col gap-1.5 pl-2">
                      <button
                        onClick={() => handleSelectAndSubmit(opt)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 whitespace-nowrap ${
                          isSelected
                            ? 'bg-[#154734] hover:bg-[#1b5941] text-white'
                            : 'bg-slate-900 hover:bg-slate-800 text-white'
                        }`}
                      >
                        <span>Submit for Approval</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => toggleExpand(opt.id)}
                        className="text-[11px] text-slate-500 hover:text-slate-800 font-semibold flex items-center justify-center gap-1 transition-colors"
                      >
                        <span>{isExpanded ? 'Hide details' : 'View details'}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expandable Details Section (Section 11 Requirement: reasoning & constraints in details view) */}
              {isExpanded && (
                <div className="px-4 sm:px-5 pb-4 pt-3 bg-slate-50/70 border-t border-slate-200/80 space-y-3 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Operational Reasoning */}
                    <div className="space-y-1.5">
                      <span className="font-bold text-slate-800 block">Operational Rationale</span>
                      <ul className="space-y-1 text-slate-600 list-disc list-inside text-[11px]">
                        {opt.reasoning.map((r, idx) => (
                          <li key={idx} className="leading-relaxed">{r}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Constraints Checked */}
                    <div className="space-y-1.5">
                      <span className="font-bold text-slate-800 block">Operational Constraints Checked</span>
                      <div className="space-y-1 text-[11px]">
                        {opt.constraintsChecked.map((c, idx) => (
                          <div key={idx} className="flex justify-between items-center py-0.5 border-b border-slate-200/50">
                            <span className="text-slate-600">{c.label}:</span>
                            <span
                              className={`font-semibold font-mono ${
                                c.status === 'OK'
                                  ? 'text-emerald-700'
                                  : c.status === 'WARNING'
                                  ? 'text-amber-700'
                                  : 'text-red-700'
                              }`}
                            >
                              {c.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Compliance & Impact Summary */}
                    <div className="space-y-1.5">
                      <span className="font-bold text-slate-800 block">Impact & Governance</span>
                      <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1 text-[11px]">
                        <div>
                          <span className="text-slate-500">Inventory: </span>
                          <span className="text-slate-800 font-medium">{opt.inventoryImpact}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Customer: </span>
                          <span className="text-slate-800 font-medium">{opt.customerImpact}</span>
                        </div>
                        <div className="pt-1 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-slate-500">Compliance:</span>
                          <StatusBadge status={opt.complianceStatus} size="sm" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
