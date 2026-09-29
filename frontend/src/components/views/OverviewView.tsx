import React, { useState } from 'react';
import {
  AlertTriangle,
  Ship,
  Building2,
  Truck,
  Database,
  GitBranch,
  ShieldCheck,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  MapPin,
  Flame,
  Plus,
} from 'lucide-react';
import { useOilShield } from '../../context/OilShieldContext';
import { StatusBadge } from '../common/StatusBadge';
import { FormModal, Field, TextInput, TextArea, Select } from '../common/FormModal';
import { DisruptionSeverity } from '../../types/oilshield';

type AgentTabKey = 'disruption' | 'supplier' | 'logistics' | 'inventory' | 'scenario' | 'compliance';

export const OverviewView: React.FC = () => {
  const {
    operationalShipments,
    selectedShipment,
    selectedShipmentId,
    setSelectedShipmentId,
    selectedIncident,
    setCurrentView,
    dynamicRecoveryOptions,
    setSelectedRecoveryOptionId,
    emergencySpendLimit,
    addShipment,
    logDisruption,
  } = useOilShield();

  const [activeTab, setActiveTab] = useState<AgentTabKey>('disruption');

  // Add Shipment modal state
  const [isAddShipmentOpen, setIsAddShipmentOpen] = useState(false);
  const [shipVesselName, setShipVesselName] = useState('');
  const [shipCargo, setShipCargo] = useState('');
  const [shipQuantityBarrels, setShipQuantityBarrels] = useState(0);
  const [shipOrigin, setShipOrigin] = useState('');
  const [shipDestination, setShipDestination] = useState('');
  const [shipSupplier, setShipSupplier] = useState('');
  const [shipEta, setShipEta] = useState('');
  const [shipDelayHours, setShipDelayHours] = useState(0);

  const resetAddShipmentForm = () => {
    setShipVesselName('');
    setShipCargo('');
    setShipQuantityBarrels(0);
    setShipOrigin('');
    setShipDestination('');
    setShipSupplier('');
    setShipEta('');
    setShipDelayHours(0);
  };

  const handleAddShipmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addShipment({
      vesselName: shipVesselName,
      cargo: shipCargo,
      quantityBarrels: shipQuantityBarrels,
      origin: shipOrigin,
      destination: shipDestination,
      supplier: shipSupplier,
      eta: shipEta,
      delayHours: shipDelayHours,
    });
    resetAddShipmentForm();
    setIsAddShipmentOpen(false);
  };

  // Log Disruption modal state
  const [isLogDisruptionOpen, setIsLogDisruptionOpen] = useState(false);
  const [discTitle, setDiscTitle] = useState('');
  const [discType, setDiscType] = useState('');
  const [discLocation, setDiscLocation] = useState('');
  const [discLinkedShipmentId, setDiscLinkedShipmentId] = useState('');
  const [discVesselName, setDiscVesselName] = useState('');
  const [discProduct, setDiscProduct] = useState('');
  const [discQuantityBarrels, setDiscQuantityBarrels] = useState(0);
  const [discSeverity, setDiscSeverity] = useState<DisruptionSeverity>('MEDIUM');
  const [discEstimatedDelayHours, setDiscEstimatedDelayHours] = useState(0);
  const [discAffectedRefinery, setDiscAffectedRefinery] = useState('');
  const [discAffectedCustomer, setDiscAffectedCustomer] = useState('');
  const [discRootCause, setDiscRootCause] = useState('');

  const resetLogDisruptionForm = () => {
    setDiscTitle('');
    setDiscType('');
    setDiscLocation('');
    setDiscLinkedShipmentId('');
    setDiscVesselName('');
    setDiscProduct('');
    setDiscQuantityBarrels(0);
    setDiscSeverity('MEDIUM');
    setDiscEstimatedDelayHours(0);
    setDiscAffectedRefinery('');
    setDiscAffectedCustomer('');
    setDiscRootCause('');
  };

  const handleLogDisruptionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    logDisruption({
      title: discTitle,
      type: discType,
      location: discLocation,
      linkedShipmentId: discLinkedShipmentId || undefined,
      vesselName: discVesselName,
      product: discProduct,
      quantityBarrels: discQuantityBarrels,
      severity: discSeverity,
      estimatedDelayHours: discEstimatedDelayHours,
      affectedRefinery: discAffectedRefinery,
      affectedCustomer: discAffectedCustomer,
      rootCause: discRootCause,
    });
    resetLogDisruptionForm();
    setIsLogDisruptionOpen(false);
  };

  const emergencyShipment = operationalShipments.find((s) => s.isEmergency) || operationalShipments[0];

  const agentTabs: { key: AgentTabKey; label: string; icon: React.ComponentType<{ className?: string }>; badge?: string }[] = [
    { key: 'disruption', label: '1. Disruption & Impact', icon: AlertTriangle },
    { key: 'supplier', label: '2. Supplier', icon: Building2 },
    { key: 'logistics', label: '3. Logistics', icon: Truck },
    { key: 'inventory', label: '4. Inventory', icon: Database },
    { key: 'scenario', label: '5. Scenario Planning', icon: GitBranch },
    { key: 'compliance', label: '6. Compliance', icon: ShieldCheck },
  ];

  return (
    <div className="space-y-5">
      {/* 1. Header & Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Shipment Operations Overview
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor shipments, evaluate disruptions, and coordinate operational recovery.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddShipmentOpen(true)}
            className="px-3.5 py-2 bg-primary hover:bg-primary-strong text-ink rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Shipment</span>
          </button>
          <button
            onClick={() => setIsLogDisruptionOpen(true)}
            className="px-3.5 py-2 bg-primary hover:bg-primary-strong text-ink rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Disruption</span>
          </button>
          <button
            onClick={() => setCurrentView('decisions')}
            className="px-3.5 py-2 bg-primary hover:bg-primary-strong text-ink rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5"
          >
            <span>Approvals & Decisions</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Prominent Emergency Disruption Banner (Clearly marks the shipment in emergency) */}
      {emergencyShipment && (
        <div
          onClick={() => {
            setSelectedShipmentId(emergencyShipment.id);
          }}
          className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 ${
            selectedShipmentId === emergencyShipment.id
              ? 'bg-red-50/90 border-red-300 ring-2 ring-red-400/40'
              : 'bg-red-50/40 border-red-200 hover:bg-red-50/70'
          }`}
        >
          <div className="flex items-start gap-3">
            <span className="p-2 rounded-lg bg-red-600 text-white flex-shrink-0 mt-0.5 shadow-xs">
              <AlertTriangle className="w-5 h-5" />
            </span>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-red-600 text-white font-mono text-[10px] font-bold uppercase tracking-wider">
                  Emergency Disruption
                </span>
                <span className="font-extrabold text-slate-900 text-sm">
                  {emergencyShipment.id}: {emergencyShipment.vesselName}
                </span>
                <span className="text-xs font-semibold text-red-700">
                  • +{emergencyShipment.delayHours}h Berthage Delay
                </span>
              </div>
              <p className="text-xs text-slate-700 font-medium">
                {emergencyShipment.disruptionSummary || 'Port congestion and berthage lock at destination port.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedShipmentId(emergencyShipment.id);
                setCurrentView('scenarios');
              }}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1"
            >
              <span>Review Recovery</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 3. Shipment Selector & Concise Operational Status Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-4">
        {/* Shipment Selector Strip */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Select Active Shipment
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full">
            {operationalShipments.map((shp) => {
              const isSelected = shp.id === selectedShipmentId;
              const isDisrupted = shp.isEmergency || shp.status === 'EMERGENCY_DISRUPTED';
              return (
                <button
                  key={shp.id}
                  onClick={() => setSelectedShipmentId(shp.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-xs'
                      : isDisrupted
                      ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {isDisrupted && <span className="h-2 w-2 rounded-full bg-red-500 radar-ping" />}
                  <span>{shp.id}</span>
                  <span className="text-[10px] font-normal opacity-80 font-mono">
                    ({shp.delayHours > 0 ? `+${shp.delayHours}h` : 'OK'})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Shipment Summary Information */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 pt-1">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Shipment ID</span>
            <span className="font-extrabold text-sm text-slate-900 font-mono block mt-0.5 truncate">{selectedShipment.id}</span>
            <span className="text-[11px] text-slate-500 block truncate">{selectedShipment.vesselName}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Current Status</span>
            <div className="mt-1">
              <StatusBadge status={selectedShipment.status} size="sm" />
            </div>
            <span className="text-[10px] text-slate-500 block mt-1">
              {selectedShipment.delayHours > 0 ? `+${selectedShipment.delayHours}h delayed` : 'On schedule'}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Origin & Destination</span>
            <span className="font-bold text-xs text-slate-800 block mt-0.5 truncate" title={selectedShipment.origin}>
              {selectedShipment.origin.split(',')[0]}
            </span>
            <span className="text-[11px] text-slate-500 block truncate" title={selectedShipment.destination}>
              → {selectedShipment.destination.split('(')[0]}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Supplier</span>
            <span className="font-bold text-xs text-slate-800 block mt-0.5 truncate">{selectedShipment.supplier}</span>
            <span className="text-[11px] text-slate-500 block truncate">Framework partner</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cargo Volume</span>
            <span className="font-mono font-bold text-xs text-slate-900 block mt-0.5">
              {selectedShipment.quantityBarrels.toLocaleString()} bbl
            </span>
            <span className="text-[11px] text-slate-500 block truncate">{selectedShipment.cargo.split('(')[0]}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">ETA & Actions</span>
            <span className="font-mono font-bold text-xs text-slate-900 block mt-0.5 truncate">
              {selectedShipment.eta.split('(')[0]}
            </span>
            <button
              onClick={() => setCurrentView('scenarios')}
              className="text-[11px] text-accent hover:text-accent-strong font-bold flex items-center gap-0.5 mt-1"
            >
              <span>Recovery Options</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. SIX AGENT TABS (No Workflow Visualization) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Tab Headers */}
        <div className="border-b border-slate-200 bg-slate-50/60 px-3 pt-2 flex items-center gap-1 overflow-x-auto">
          {agentTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold rounded-t-lg transition-all border-b-2 whitespace-nowrap ${
                  isActive
                    ? 'border-accent text-accent bg-white shadow-xs'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-accent' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Body Contents */}
        <div className="p-5">
          {/* TAB 1: DISRUPTION & IMPACT */}
          {activeTab === 'disruption' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Disruption & Impact Evaluation
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Operational impact analysis for {selectedShipment.id} at {selectedShipment.destination}.
                  </p>
                </div>
                <StatusBadge status={selectedShipment.delayHours > 0 ? 'CRITICAL' : 'NORMAL'} size="sm" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                  <span className="font-bold text-slate-700 block">Root Cause & Bottleneck</span>
                  <p className="text-slate-600 leading-relaxed">
                    {selectedIncident.rootCause}
                  </p>
                  <div className="pt-2 border-t border-slate-200/60 text-[11px] text-slate-500">
                    Delay Trend: <strong>{selectedIncident.berthDelayTrend}</strong>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                  <span className="font-bold text-slate-700 block">Affected Facilities</span>
                  <div className="space-y-1 text-slate-600">
                    <div>Refinery: <strong>{selectedIncident.affectedRefinery}</strong></div>
                    <div>Offtake Customer: <strong>{selectedIncident.affectedCustomer}</strong></div>
                    <div>Supply Exposure: <strong>{selectedIncident.quantityBarrels.toLocaleString()} bbl (${(selectedIncident.estimatedExposureValueUsd / 1000).toFixed(0)}k)</strong></div>
                  </div>
                </div>

                <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 space-y-2">
                  <div className="font-bold flex items-center gap-1.5 text-amber-800">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>Consequence Alert</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Refinery Crude Distillation Unit (CDU-2) will face feedstock starvation in <strong>26.4 hours</strong> unless an alternative recovery route is approved.
                  </p>
                  <button
                    onClick={() => setCurrentView('scenarios')}
                    className="mt-2 text-xs font-bold text-amber-900 hover:text-black underline block"
                  >
                    View Viable Recovery Options →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SUPPLIER */}
          {activeTab === 'supplier' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Crude Supplier & Compatibility Evaluation
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Primary supplier status and qualified alternative crude suppliers for {selectedShipment.cargo}.
                  </p>
                </div>
                <button
                  onClick={() => setCurrentView('suppliers')}
                  className="text-xs text-accent hover:text-accent-strong font-bold flex items-center gap-1"
                >
                  <span>Supplier Intelligence</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800">Saudi Aramco</span>
                    <span className="px-2 py-0.5 bg-success-soft text-success text-[10px] font-bold rounded">
                      PRIMARY
                    </span>
                  </div>
                  <div className="text-slate-600 space-y-1 text-[11px]">
                    <div>Grade: Arab Light (32.8° API, 1.97% S)</div>
                    <div>Refinery Compatibility: <strong>100%</strong></div>
                    <div>Status: Framework Agreement Active</div>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800">ADNOC Global Trading</span>
                    <span className="px-2 py-0.5 bg-success-soft text-success border border-success/30 text-[10px] font-bold rounded">
                      BACKUP SPOT
                    </span>
                  </div>
                  <div className="text-slate-600 space-y-1 text-[11px]">
                    <div>Grade: Das Blend (39.2° API, 1.30% S)</div>
                    <div>Refinery Compatibility: <strong>96% (Approved)</strong></div>
                    <div>Lead Time: 8.0 hours • 30,000 bbl available</div>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800">NNPC Nigeria</span>
                    <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-bold rounded">
                      STANDBY
                    </span>
                  </div>
                  <div className="text-slate-600 space-y-1 text-[11px]">
                    <div>Grade: Bonny Light (35.2° API, 0.15% S)</div>
                    <div>Refinery Compatibility: <strong>88%</strong></div>
                    <div>Lead Time: 36.0 hours</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LOGISTICS */}
          {activeTab === 'logistics' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Logistics & Route Alternatives
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Alternative maritime diversion ports, pipeline links, and multi-modal transit corridors.
                  </p>
                </div>
                <button
                  onClick={() => setCurrentView('logistics')}
                  className="text-xs text-accent hover:text-accent-strong font-bold flex items-center gap-1"
                >
                  <span>Open Logistics Map</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
                <div className="p-3.5 bg-success-soft rounded-xl border border-success/30 text-success space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-success">Kamarajar Port (Ennore)</span>
                    <span className="px-2 py-0.5 bg-success text-white text-[10px] font-bold rounded">
                      RECOMMENDED
                    </span>
                  </div>
                  <div className="text-[11px] text-success space-y-1">
                    <div>Diversion Distance: 28 km North</div>
                    <div>Transit Delay: <strong>+6.5 hours</strong> (saves 11.5h)</div>
                    <div>Draft: 16.5m (vessel draft 15.2m - verified)</div>
                    <div>Pipeline Link to Refinery: Active</div>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800">Kochi-Chennai Pipeline</span>
                    <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-bold rounded">
                      PIPELINE
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 space-y-1">
                    <div>Pumping Transit: <strong>+14.0 hours</strong></div>
                    <div>Available Capacity: 74% utilized</div>
                    <div>Cost: $34,500 total spend</div>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800">NH-44 Road Convoy</span>
                    <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-bold rounded">
                      ROAD EXPRESS
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 space-y-1">
                    <div>Transit: <strong>+12.5 hours</strong></div>
                    <div>Capacity: 60 road tankers required</div>
                    <div>Permit: Night convoy clearance required</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: INVENTORY */}
          {activeTab === 'inventory' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Refinery Stock & Inventory Buffer Assessment
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Internal feedstock levels, safety stock thresholds, and donor buffer transfer capacity.
                  </p>
                </div>
                <span className="text-xs font-mono text-slate-500">
                  Backend Inventory Intelligence Active
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800">Chennai CPCL Manali (Destination)</span>
                    <span className="text-red-600 font-bold">2.1 Days Coverage</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div className="bg-red-500 h-full rounded-full" style={{ width: '27%' }} />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Current Stock: 12,000 bbl</span>
                    <span>Safety Floor: 8,000 bbl</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Daily burn rate is 3,800 bbl/day. Without intervention, stock breaches safety threshold within 26.4 hours.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800">Kochi Strategic Reserve (Donor Buffer)</span>
                    <span className="text-success font-bold">5.1 Days Coverage Post-Draw</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div className="bg-success h-full rounded-full" style={{ width: '68%' }} />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Available on Hand: 15,000 bbl</span>
                    <span>Transfer Eligible: 11,500 bbl</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Eligible for pipeline injection into Chennai system without jeopardizing local southern grid safety margins.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SCENARIO PLANNING */}
          {activeTab === 'scenario' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Dynamic Recovery Options Synthesis
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Options generated dynamically from current constraints for {selectedShipment.id}.
                  </p>
                </div>
                <button
                  onClick={() => setCurrentView('scenarios')}
                  className="px-3 py-1.5 bg-primary hover:bg-primary-strong text-ink rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1"
                >
                  <span>Compare All Options</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
                {dynamicRecoveryOptions.slice(0, 3).map((opt) => (
                  <div
                    key={opt.id}
                    onClick={() => {
                      setSelectedRecoveryOptionId(opt.id);
                      setCurrentView('scenarios');
                    }}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer hover:shadow-xs flex flex-col justify-between ${
                      opt.isRecommended
                        ? 'bg-primary-soft/60 border-accent/30 ring-1 ring-accent/30'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                          {opt.category}
                        </span>
                        {opt.isRecommended && (
                          <span className="px-1.5 py-0.2 bg-primary text-ink text-[10px] font-bold rounded">
                            RECOMMENDED
                          </span>
                        )}
                      </div>
                      <div className="font-bold text-xs text-slate-900 leading-snug">
                        {opt.title}
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2">
                        {opt.operationalSummary}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 grid grid-cols-3 gap-1 text-center font-mono text-[11px]">
                      <div>
                        <span className="text-[9px] text-slate-400 block font-sans">ETA</span>
                        <span className="font-bold text-slate-800">+{opt.etaDeltaHours}h</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block font-sans">COST</span>
                        <span className="font-bold text-slate-800">${(opt.costUsd / 1000).toFixed(0)}k</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block font-sans">FEASIBILITY</span>
                        <span className="font-bold text-success">{opt.feasibilityScore}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: COMPLIANCE */}
          {activeTab === 'compliance' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Automated Compliance & Pre-Clearance Status
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pre-clearance checks validated before presenting recovery options for human authorization.
                  </p>
                </div>
                <button
                  onClick={() => setCurrentView('decisions')}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                >
                  <span>Go to Decision Center</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-success-soft rounded-xl border border-success/30 space-y-1">
                  <div className="font-bold text-success flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    <span>Supplier Sanctions & AML</span>
                  </div>
                  <p className="text-[11px] text-success">
                    Primary and secondary suppliers verified against international sanctions and ESG rules.
                  </p>
                </div>

                <div className="p-3 bg-success-soft rounded-xl border border-success/30 space-y-1">
                  <div className="font-bold text-success flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    <span>Maritime Port Safety</span>
                  </div>
                  <p className="text-[11px] text-success">
                    Kamarajar Port Berth 1 has 16.5m draft clearance (exceeds 15.2m vessel draft requirement).
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    <span>Spend Delegation ($100k Cap)</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Ennore reroute ($48k) is pre-cleared. ADNOC spot tender ($142k) requires secondary executive sign-off.
                  </p>
                </div>

                <div className="p-3 bg-success-soft rounded-xl border border-success/30 space-y-1">
                  <div className="font-bold text-success flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    <span>Crude Compatibility</span>
                  </div>
                  <p className="text-[11px] text-success">
                    API gravity and sulfur limits match Chennai CPCL refinery technical specifications.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Shipment Modal */}
      {isAddShipmentOpen && (
        <FormModal
          title="Add Shipment"
          subtitle="Register a new operational shipment into the fleet."
          onClose={() => {
            resetAddShipmentForm();
            setIsAddShipmentOpen(false);
          }}
          onSubmit={handleAddShipmentSubmit}
          submitLabel="Add Shipment"
        >
          <Field label="Vessel Name" required>
            <TextInput
              value={shipVesselName}
              onChange={(e) => setShipVesselName(e.target.value)}
              placeholder="MT Ocean Vanguard"
              required
            />
          </Field>
          <Field label="Cargo" required>
            <TextInput
              value={shipCargo}
              onChange={(e) => setShipCargo(e.target.value)}
              placeholder="Crude Oil (Arab Light)"
              required
            />
          </Field>
          <Field label="Quantity (Barrels)" required>
            <TextInput
              type="number"
              value={shipQuantityBarrels}
              onChange={(e) => setShipQuantityBarrels(Number(e.target.value))}
              required
            />
          </Field>
          <Field label="Origin" required>
            <TextInput
              value={shipOrigin}
              onChange={(e) => setShipOrigin(e.target.value)}
              placeholder="Ras Tanura, Saudi Arabia"
              required
            />
          </Field>
          <Field label="Destination" required>
            <TextInput
              value={shipDestination}
              onChange={(e) => setShipDestination(e.target.value)}
              placeholder="Chennai Port"
              required
            />
          </Field>
          <Field label="Supplier" required>
            <TextInput
              value={shipSupplier}
              onChange={(e) => setShipSupplier(e.target.value)}
              placeholder="Saudi Aramco"
              required
            />
          </Field>
          <Field label="ETA" required>
            <TextInput
              value={shipEta}
              onChange={(e) => setShipEta(e.target.value)}
              placeholder="2026-10-02 14:00 UTC"
              required
            />
          </Field>
          <Field label="Delay (Hours)">
            <TextInput
              type="number"
              value={shipDelayHours}
              onChange={(e) => setShipDelayHours(Number(e.target.value))}
            />
          </Field>
        </FormModal>
      )}

      {/* Log Disruption Modal */}
      {isLogDisruptionOpen && (
        <FormModal
          title="Log Disruption"
          subtitle="Manually report a new disruption incident for agent analysis."
          onClose={() => {
            resetLogDisruptionForm();
            setIsLogDisruptionOpen(false);
          }}
          onSubmit={handleLogDisruptionSubmit}
          submitLabel="Log Disruption"
        >
          <Field label="Title" required>
            <TextInput
              value={discTitle}
              onChange={(e) => setDiscTitle(e.target.value)}
              placeholder="Port Congestion at Chennai"
              required
            />
          </Field>
          <Field label="Type" required>
            <TextInput
              value={discType}
              onChange={(e) => setDiscType(e.target.value)}
              placeholder="Port Congestion"
              required
            />
          </Field>
          <Field label="Location" required>
            <TextInput
              value={discLocation}
              onChange={(e) => setDiscLocation(e.target.value)}
              placeholder="Chennai Port"
              required
            />
          </Field>
          <Field label="Linked Shipment">
            <Select
              value={discLinkedShipmentId}
              onChange={(e) => setDiscLinkedShipmentId(e.target.value)}
            >
              <option value="">None</option>
              {operationalShipments.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id} — {s.vesselName}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Vessel Name" required>
            <TextInput
              value={discVesselName}
              onChange={(e) => setDiscVesselName(e.target.value)}
              required
            />
          </Field>
          <Field label="Product" required>
            <TextInput
              value={discProduct}
              onChange={(e) => setDiscProduct(e.target.value)}
              placeholder="Crude Oil (Arab Light)"
              required
            />
          </Field>
          <Field label="Quantity (Barrels)" required>
            <TextInput
              type="number"
              value={discQuantityBarrels}
              onChange={(e) => setDiscQuantityBarrels(Number(e.target.value))}
              required
            />
          </Field>
          <Field label="Severity" required>
            <Select
              value={discSeverity}
              onChange={(e) => setDiscSeverity(e.target.value as DisruptionSeverity)}
            >
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </Select>
          </Field>
          <Field label="Estimated Delay (Hours)" required>
            <TextInput
              type="number"
              value={discEstimatedDelayHours}
              onChange={(e) => setDiscEstimatedDelayHours(Number(e.target.value))}
              required
            />
          </Field>
          <Field label="Affected Refinery" required>
            <TextInput
              value={discAffectedRefinery}
              onChange={(e) => setDiscAffectedRefinery(e.target.value)}
              placeholder="Chennai Refinery (CPCL Manali)"
              required
            />
          </Field>
          <Field label="Affected Customer" required>
            <TextInput
              value={discAffectedCustomer}
              onChange={(e) => setDiscAffectedCustomer(e.target.value)}
              placeholder="Customer C104"
              required
            />
          </Field>
          <Field label="Root Cause" required>
            <TextArea
              value={discRootCause}
              onChange={(e) => setDiscRootCause(e.target.value)}
              rows={3}
              required
            />
          </Field>
        </FormModal>
      )}
    </div>
  );
};
