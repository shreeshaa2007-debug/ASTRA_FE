import React, { useState } from 'react';
import {
  Database,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  MapPin,
  Flame,
  Shuffle,
  Info,
} from 'lucide-react';
import { useOilShield } from '../../context/OilShieldContext';
import { InventoryFacility } from '../../types/oilshield';
import { StatusBadge } from '../common/StatusBadge';

export const InventoryManagementView: React.FC = () => {
  const { inventory, setCurrentView, selectedIncident } = useOilShield();
  const [isTransferModalOpen, setIsTransferModalOpen] = useState<boolean>(false);

  // Proposed transfers calculated by Agent 4
  const proposedTransfers = [
    {
      id: 'TRF-01',
      sourceFacility: 'Kochi Strategic Reserve Depot',
      targetFacility: 'Chennai Refinery (CPCL Manali)',
      transferMode: 'Pipeline Corridor (KP-210) + Rail Siding',
      quantityBbl: 11500,
      donorRemainingBbl: 3500,
      donorMinThresholdBbl: 3500,
      transitHours: 14.0,
      tariffCostUsd: 29900,
      donorSafetyStatus: 'Borderline Safe (Leaves exact floor)',
      feasibility: 'FEASIBLE_REQUIRES_SIGNOFF',
    },
    {
      id: 'TRF-02',
      sourceFacility: 'Coimbatore Intermediate Terminal',
      targetFacility: 'Chennai Refinery (CPCL Manali)',
      transferMode: 'NH-44 Express Tanker Truck Fleet (60 units)',
      quantityBbl: 4500,
      donorRemainingBbl: 4000,
      donorMinThresholdBbl: 4000,
      transitHours: 6.0,
      tariffCostUsd: 30600,
      donorSafetyStatus: 'Compliant with buffer retained',
      feasibility: 'HIGHLY_FEASIBLE',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Terminal Inventory & Buffer Management
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-primary-soft text-accent-strong border border-primary-border text-xs font-bold font-mono">
              Agent 4 Stock Balancer
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time stock monitoring across refineries, inland strategic depots, and inter-terminal pipeline linepack.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsTransferModalOpen(true)}
            className="px-4 py-2 bg-primary hover:bg-primary-strong text-ink rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>View Proposed Transfers</span>
          </button>
        </div>
      </div>

      {/* Disruption Impact on Refinery Feedstock Callout */}
      <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-amber-600 text-white font-mono font-bold text-[10px] rounded uppercase">
              Refinery Buffer Alert
            </span>
            <span className="text-xs font-bold text-amber-950">
              Chennai Refinery: 12,000 Barrels Remaining (2.1 Days Coverage)
            </span>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            Without crude replenishment from SHP-1042 or an emergency buffer transfer, Crude Distillation Unit CDU-2 will breach safety threshold (8,000 bbl) in <strong>26.4 hours</strong>.
          </p>
        </div>

        <button
          onClick={() => setCurrentView('scenarios')}
          className="px-3.5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold flex-shrink-0 hover:bg-slate-800 transition-colors"
        >
          View Scenario C (Transfer) →
        </button>
      </div>

      {/* Visual Stock-Level Gauges Cards (Exact locations from Section 5) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {inventory.map((fac) => {
          const pct = Math.round((fac.currentInventoryBarrels / fac.maxCapacityBarrels) * 100);
          const isApproachingMin =
            fac.currentInventoryBarrels <= fac.minThresholdBarrels * 1.5;
          const isCritical = fac.stockoutRisk === 'HIGH' || fac.stockoutRisk === 'CRITICAL';

          return (
            <div
              key={fac.id}
              className={`bg-white rounded-2xl border p-4 shadow-sm space-y-3 transition-all ${
                isCritical
                  ? 'border-red-300 ring-1 ring-red-200'
                  : 'border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                    {fac.type}
                  </span>
                  <h4 className="font-bold text-slate-900 text-sm leading-snug">
                    {fac.name}
                  </h4>
                  <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span className="truncate">{fac.location}</span>
                  </div>
                </div>

                <StatusBadge status={fac.stockoutRisk} size="sm" />
              </div>

              {/* Progress gauge */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Current Stock</span>
                  <span className="font-mono font-extrabold text-slate-900">
                    {fac.currentInventoryBarrels.toLocaleString()} bbl
                  </span>
                </div>

                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isCritical
                        ? 'bg-red-500'
                        : isApproachingMin
                        ? 'bg-amber-500'
                        : 'bg-success'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="flex justify-between text-[10px] text-slate-400 pt-0.5">
                  <span>Min Floor: {fac.minThresholdBarrels.toLocaleString()} bbl</span>
                  <span className="font-mono">{pct}% capacity</span>
                </div>
              </div>

              {/* Buffer details */}
              <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">COVERAGE</span>
                  <span className={`font-mono font-bold ${fac.coverageDays < 3 ? 'text-red-600' : 'text-slate-800'}`}>
                    {fac.coverageDays} days
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">TRANSFERABLE</span>
                  <span className="font-mono font-bold text-success">
                    {fac.availableTransferBarrels > 0
                      ? `${fac.availableTransferBarrels.toLocaleString()} bbl`
                      : 'None'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Inventory Comparison Table (Exact columns requested in Section 5) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">
            Facility Inventory & Buffer Parameters
          </h3>
          <span className="text-xs text-slate-500">
            Safety thresholds and transfer feasibility certified by Agent 4
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Facility / Location</th>
                <th className="py-3 px-3">Facility Type</th>
                <th className="py-3 px-3">Current Stock</th>
                <th className="py-3 px-3">Min Threshold</th>
                <th className="py-3 px-3">Safety Stock</th>
                <th className="py-3 px-3">Available Transfer</th>
                <th className="py-3 px-3">Coverage Days</th>
                <th className="py-3 px-3">Stockout Risk</th>
                <th className="py-3 px-4 text-right">Transfer Feasibility</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {inventory.map((fac) => {
                const isUnderThreshold = fac.currentInventoryBarrels <= fac.minThresholdBarrels * 1.5;
                return (
                  <tr
                    key={fac.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isUnderThreshold ? 'bg-amber-50/30' : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 text-xs">
                        {fac.name}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {fac.location}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-slate-600 font-medium">
                      {fac.type}
                    </td>

                    <td className="py-3 px-3 font-mono font-bold text-slate-900">
                      {fac.currentInventoryBarrels.toLocaleString()} bbl
                    </td>

                    <td className="py-3 px-3 font-mono text-slate-600">
                      {fac.minThresholdBarrels.toLocaleString()} bbl
                    </td>

                    <td className="py-3 px-3 font-mono text-slate-600">
                      {fac.safetyStockBarrels.toLocaleString()} bbl
                    </td>

                    <td className="py-3 px-3 font-mono font-bold text-success">
                      {fac.availableTransferBarrels > 0
                        ? `${fac.availableTransferBarrels.toLocaleString()} bbl`
                        : '0 bbl'}
                    </td>

                    <td className="py-3 px-3 font-mono font-semibold">
                      <span className={fac.coverageDays < 3 ? 'text-red-600 font-bold' : 'text-slate-800'}>
                        {fac.coverageDays} days
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <StatusBadge status={fac.stockoutRisk} size="sm" />
                    </td>

                    <td className="py-3 px-4 text-right">
                      {fac.transferFeasibility ? (
                        <span className="inline-flex items-center gap-1 text-success font-bold bg-success-soft px-2 py-0.5 rounded border border-success/30">
                          <CheckCircle2 className="w-3 h-3 text-success" />
                          Feasible
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded">
                          <XCircle className="w-3 h-3 text-slate-400" />
                          Locked
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* PROPOSED TRANSFERS MODAL */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-pop border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-accent uppercase">
                  AGENT 4 RECOMMENDATION
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  Proposed Emergency Inter-Terminal Transfers
                </h3>
              </div>
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-700 font-bold px-2 py-1"
              >
                Close
              </button>
            </div>

            <div className="space-y-3">
              {proposedTransfers.map((trf) => (
                <div key={trf.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {trf.id}
                    </span>
                    <span className="text-xs font-bold text-success">
                      {trf.donorSafetyStatus}
                    </span>
                  </div>

                  <div className="text-xs text-slate-800">
                    <strong>Source:</strong> {trf.sourceFacility} → <strong>Target:</strong> {trf.targetFacility}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-400 block">Transfer Volume</span>
                      <span className="font-mono font-bold text-slate-900">{trf.quantityBbl.toLocaleString()} bbl</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-400 block">Transit Time</span>
                      <span className="font-mono font-bold text-slate-900">{trf.transitHours}h</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-400 block">Tariff Cost</span>
                      <span className="font-mono font-bold text-slate-900">${trf.tariffCostUsd.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setIsTransferModalOpen(false);
                  setCurrentView('scenarios');
                }}
                className="px-4 py-2 bg-primary hover:bg-primary-strong text-ink rounded-xl text-xs font-bold transition-colors shadow-xs"
              >
                Review in Scenario C
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
