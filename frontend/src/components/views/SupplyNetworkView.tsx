import React, { useState } from 'react';
import {
  Network,
  Building2,
  Ship,
  Factory,
  Database,
  Truck,
  Building,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { useOilShield } from '../../context/OilShieldContext';
import { SupplyChainNode } from '../../types/oilshield';

export const SupplyNetworkView: React.FC = () => {
  const {
    networkNodes,
    selectedIncident,
    operationalShipments,
    selectedShipmentId,
    setSelectedShipmentId,
    setCurrentView,
  } = useOilShield();

  const [selectedNodeId, setSelectedNodeId] = useState<string>('node-port-1');
  const [tierFilter, setTierFilter] = useState<string>('ALL');

  const tiers: ('Supplier' | 'Port' | 'Refinery' | 'Storage' | 'Transportation' | 'Customer')[] = [
    'Supplier',
    'Port',
    'Refinery',
    'Storage',
    'Transportation',
    'Customer',
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Supply Network
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            End-to-end petroleum topology flow for active supply chain operations.
          </p>
        </div>

        {/* Shipment Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
            Selected Shipment:
          </span>
          <select
            value={selectedShipmentId}
            onChange={(e) => setSelectedShipmentId(e.target.value)}
            className="bg-white border border-slate-300 text-xs font-bold rounded-lg px-2.5 py-1.5 text-slate-900 focus:outline-hidden focus:border-[#154734] focus:ring-2 focus:ring-[#154734]/15 shadow-xs"
          >
            {operationalShipments.map((shp) => (
              <option key={shp.id} value={shp.id}>
                {shp.id} — {shp.vesselName} ({shp.delayHours > 0 ? `+${shp.delayHours}h` : 'Normal'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Legend & Tier Filters */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex items-center gap-4">
          <span className="font-bold text-slate-700">Status:</span>
          <span className="flex items-center gap-1.5 text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            Normal
          </span>
          <span className="flex items-center gap-1.5 text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            At Risk
          </span>
          <span className="flex items-center gap-1.5 text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500 radar-ping" />
            Disrupted (OIL-1042)
          </span>
          <span className="flex items-center gap-1.5 text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-500" />
            Under Analysis
          </span>
        </div>

        {/* Tier filter buttons */}
        <div className="flex items-center gap-1">
          <span className="text-slate-400 mr-1 text-[11px] font-medium">Filter:</span>
          {['ALL', ...tiers].map((t) => (
            <button
              key={t}
              onClick={() => setTierFilter(t)}
              className={`px-2 py-1 rounded-md text-xs font-semibold transition-colors ${
                tierFilter === t
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Multi-Tier Flow Visualization (Retained left-side portion as requested in Section 7) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Network className="w-4 h-4 text-[#154734]" />
            <span>Multi-Tier Flow: Suppliers → Ports → Refineries → Storage → Transportation → Customer</span>
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            Flow: Left to Right
          </span>
        </div>

        {/* Staged Columns (6 Tiers) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          {/* TIER 1: SUPPLIER */}
          {(tierFilter === 'ALL' || tierFilter === 'Supplier') && (
            <div className="space-y-2">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center pb-1.5 border-b border-slate-200 flex items-center justify-center gap-1">
                <span>1. Suppliers</span>
                <span className="text-slate-400">→</span>
              </div>
              {networkNodes
                .filter((n) => n.tier === 'Supplier')
                .map((node) => {
                  const isSelected = node.id === selectedNodeId;
                  return (
                    <div
                      key={node.id}
                      onClick={() => setSelectedNodeId(node.id)}
                      className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[#154734] bg-emerald-50/50 shadow-xs ring-1 ring-[#154734]/30'
                          : 'border-slate-200 bg-slate-50 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[9px] font-bold text-slate-400">SUPPLIER</span>
                        <span className={`h-2 w-2 rounded-full ${node.status === 'NORMAL' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      </div>
                      <div className="font-bold text-xs text-slate-900 leading-snug">
                        {node.name}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                        {node.location}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* TIER 2: PORT */}
          {(tierFilter === 'ALL' || tierFilter === 'Port') && (
            <div className="space-y-2">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center pb-1.5 border-b border-slate-200 flex items-center justify-center gap-1">
                <span>2. Ports</span>
                <span className="text-slate-400">→</span>
              </div>
              {networkNodes
                .filter((n) => n.tier === 'Port')
                .map((node) => {
                  const isSelected = node.id === selectedNodeId;
                  const isDisrupted = node.status === 'DISRUPTED';
                  return (
                    <div
                      key={node.id}
                      onClick={() => setSelectedNodeId(node.id)}
                      className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[#154734] bg-emerald-50/50 shadow-xs ring-1 ring-[#154734]/30'
                          : isDisrupted
                          ? 'border-red-300 bg-red-50/80 ring-1 ring-red-300'
                          : 'border-slate-200 bg-slate-50 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[9px] font-bold text-slate-400">PORT</span>
                        <span
                          className={`h-2 w-2 rounded-full ${
                            isDisrupted
                              ? 'bg-red-500 radar-ping'
                              : node.status === 'UNDER_ANALYSIS'
                              ? 'bg-slate-500'
                              : 'bg-emerald-500'
                          }`}
                        />
                      </div>
                      <div className={`font-bold text-xs leading-snug ${isDisrupted ? 'text-red-950 font-extrabold' : 'text-slate-900'}`}>
                        {node.name}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                        {node.location}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* TIER 3: REFINERY */}
          {(tierFilter === 'ALL' || tierFilter === 'Refinery') && (
            <div className="space-y-2">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center pb-1.5 border-b border-slate-200 flex items-center justify-center gap-1">
                <span>3. Refineries</span>
                <span className="text-slate-400">→</span>
              </div>
              {networkNodes
                .filter((n) => n.tier === 'Refinery')
                .map((node) => {
                  const isSelected = node.id === selectedNodeId;
                  const isAtRisk = node.status === 'AT_RISK';
                  return (
                    <div
                      key={node.id}
                      onClick={() => setSelectedNodeId(node.id)}
                      className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[#154734] bg-emerald-50/50 shadow-xs ring-1 ring-[#154734]/30'
                          : isAtRisk
                          ? 'border-amber-300 bg-amber-50/80 ring-1 ring-amber-300'
                          : 'border-slate-200 bg-slate-50 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[9px] font-bold text-slate-400">REFINERY</span>
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                      </div>
                      <div className="font-bold text-xs text-slate-900 leading-snug">
                        {node.name}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                        {node.location}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* TIER 4: STORAGE */}
          {(tierFilter === 'ALL' || tierFilter === 'Storage') && (
            <div className="space-y-2">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center pb-1.5 border-b border-slate-200 flex items-center justify-center gap-1">
                <span>4. Storage</span>
                <span className="text-slate-400">→</span>
              </div>
              {networkNodes
                .filter((n) => n.tier === 'Storage')
                .map((node) => {
                  const isSelected = node.id === selectedNodeId;
                  return (
                    <div
                      key={node.id}
                      onClick={() => setSelectedNodeId(node.id)}
                      className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[#154734] bg-emerald-50/50 shadow-xs ring-1 ring-[#154734]/30'
                          : 'border-slate-200 bg-slate-50 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[9px] font-bold text-slate-400">STORAGE</span>
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      </div>
                      <div className="font-bold text-xs text-slate-900 leading-snug">
                        {node.name}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                        {node.location}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* TIER 5: TRANSPORTATION */}
          {(tierFilter === 'ALL' || tierFilter === 'Transportation') && (
            <div className="space-y-2">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center pb-1.5 border-b border-slate-200 flex items-center justify-center gap-1">
                <span>5. Transport</span>
                <span className="text-slate-400">→</span>
              </div>
              {networkNodes
                .filter((n) => n.tier === 'Transportation')
                .map((node) => {
                  const isSelected = node.id === selectedNodeId;
                  return (
                    <div
                      key={node.id}
                      onClick={() => setSelectedNodeId(node.id)}
                      className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[#154734] bg-emerald-50/50 shadow-xs ring-1 ring-[#154734]/30'
                          : 'border-slate-200 bg-slate-50 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[9px] font-bold text-[#154734]">TRANS</span>
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      </div>
                      <div className="font-bold text-xs text-slate-900 leading-snug">
                        {node.name}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                        {node.location}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* TIER 6: CUSTOMER */}
          {(tierFilter === 'ALL' || tierFilter === 'Customer') && (
            <div className="space-y-2">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center pb-1.5 border-b border-slate-200">
                <span>6. Customer</span>
              </div>
              {networkNodes
                .filter((n) => n.tier === 'Customer')
                .map((node) => {
                  const isSelected = node.id === selectedNodeId;
                  const isAtRisk = node.status === 'AT_RISK';
                  return (
                    <div
                      key={node.id}
                      onClick={() => setSelectedNodeId(node.id)}
                      className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[#154734] bg-emerald-50/50 shadow-xs ring-1 ring-[#154734]/30'
                          : isAtRisk
                          ? 'border-purple-300 bg-purple-50/80 ring-1 ring-purple-300'
                          : 'border-slate-200 bg-slate-50 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[9px] font-bold text-slate-400">OFFTAKE</span>
                        <span className={`h-2 w-2 rounded-full ${isAtRisk ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                      </div>
                      <div className="font-bold text-xs text-slate-900 leading-snug">
                        {node.name}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                        {node.location}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Clean Topology Analysis Banner */}
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span>
            <strong>Topology Note:</strong> Disruption at Chennai Port directly creates a bottleneck for Chennai CPCL Refinery and Customer C104. Rerouting via Kamarajar Port (Ennore) bypasses the disrupted node.
          </span>
          <button
            onClick={() => setCurrentView('scenarios')}
            className="text-xs font-bold text-[#154734] hover:text-[#0e3325] whitespace-nowrap self-start sm:self-auto"
          >
            Review Reroute Options →
          </button>
        </div>
      </div>
    </div>
  );
};
