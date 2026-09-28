import React, { useState } from 'react';
import {
  LayoutDashboard,
  AlertOctagon,
  Bot,
  Network,
  Building2,
  Truck,
  Database,
  GitBranch,
  ShieldCheck,
  UserCheck,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Droplet,
  X,
  Zap,
} from 'lucide-react';
import { useOilShield } from '../../context/OilShieldContext';
import { OilShieldView } from '../../types/oilshield';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isEmergencyModalOpen: boolean;
  onEmergencyModalOpenChange: (open: boolean) => void;
}

interface NavItem {
  id: OilShieldView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeTone?: 'danger' | 'warning' | 'info';
}

export const OilShieldSidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  isEmergencyModalOpen,
  onEmergencyModalOpenChange,
}) => {
  const {
    currentView,
    setCurrentView,
    selectedIncident,
    operationalShipments,
    selectedShipmentId,
    setSelectedShipmentId,
    dynamicRecoveryOptions,
    triggerAutomation,
  } = useOilShield();

  const [processingShipmentId, setProcessingShipmentId] = useState<string | null>(null);

  const pendingApprovalsCount = dynamicRecoveryOptions.filter(
    (o) => o.humanApprovalStatus === 'AWAITING_APPROVAL'
  ).length;

  const emergencyShipments = operationalShipments.filter(
    (s) => s.isEmergency || s.status === 'EMERGENCY_DISRUPTED'
  );

  const handleTriggerAutomation = (shipmentId: string) => {
    setProcessingShipmentId(shipmentId);
    setTimeout(() => {
      triggerAutomation(shipmentId);
      setProcessingShipmentId(null);
      onEmergencyModalOpenChange(false);
    }, 1300);
  };

  const navItems: NavItem[] = [
    { id: 'overview', label: 'Overview & Shipments', icon: LayoutDashboard },
    { id: 'network', label: 'Supply Network', icon: Network },
    { id: 'suppliers', label: 'Supplier Intelligence', icon: Building2 },
    { id: 'logistics', label: 'Logistics & Transport', icon: Truck },
    { id: 'scenarios', label: 'Recovery Options', icon: GitBranch },
    {
      id: 'decisions',
      label: 'Approvals & Decisions',
      icon: UserCheck,
      badge: pendingApprovalsCount > 0 ? `${pendingApprovalsCount} Action` : undefined,
      badgeTone: 'danger',
    },
    { id: 'audit', label: 'Audit Trail', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      className={`bg-white text-slate-700 flex flex-col justify-between flex-shrink-0 z-30 select-none border-r border-slate-200 transition-all duration-200 shadow-xs ${
        isCollapsed ? 'w-[70px]' : 'w-64'
      }`}
    >
      {/* Top Header & Brand */}
      <div className="flex flex-col min-h-0">
        <div
          className={`px-3.5 border-b border-slate-200 flex items-center ${
            isCollapsed ? 'min-h-16 py-2.5 flex-col gap-2' : 'h-16 justify-between'
          }`}
        >
          <div
            onClick={() => setCurrentView('overview')}
            className="flex items-center gap-2.5 cursor-pointer min-w-0"
            title="ASTRA — AI Supply Chain Control Tower"
          >
            <div className="h-9 w-9 rounded-xl bg-primary text-ink flex items-center justify-center flex-shrink-0 shadow-sm ring-1 ring-accent/30">
              <Droplet className="w-5 h-5 fill-ink/20" />
            </div>

            {!isCollapsed && (
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-slate-900 text-base tracking-tight">
                    ASTRA
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 bg-primary-soft text-accent-strong font-mono rounded border border-primary-border font-bold">
                    SAP
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 font-medium truncate">
                  AI Supply Chain Control Tower
                </div>
              </div>
            )}
          </div>

          <button
            onClick={onToggleCollapse}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors flex-shrink-0"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Emergency Disruptions button — opens a list of ALL current emergencies, not just one */}
        {!isCollapsed && emergencyShipments.length > 0 && (
          <button
            onClick={() => onEmergencyModalOpenChange(true)}
            className="p-3 mx-3 my-2.5 bg-red-50/90 hover:bg-red-100/80 transition-colors rounded-xl border border-red-200 text-left shadow-xs"
            title="View all emergency disruptions"
          >
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-red-700 mb-1">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-red-600 radar-ping" />
                Emergency Disruption{emergencyShipments.length === 1 ? '' : 's'}
              </span>
              <span className="font-mono">{emergencyShipments.length}</span>
            </div>
            {emergencyShipments.length === 1 ? (
              <>
                <div className="text-xs font-bold text-slate-900 truncate">
                  {emergencyShipments[0].id}: {emergencyShipments[0].vesselName}
                </div>
                <div className="text-[11px] text-red-700 font-semibold truncate mt-0.5">
                  {emergencyShipments[0].destination} • +{emergencyShipments[0].delayHours}h Delay
                </div>
              </>
            ) : (
              <div className="text-xs font-bold text-slate-900">
                {emergencyShipments.length} shipments need recovery action
              </div>
            )}
            <div className="text-[11px] text-red-700 font-semibold mt-1 flex items-center gap-1">
              View &amp; trigger automation
              <ChevronRight className="w-3 h-3" />
            </div>
          </button>
        )}

        {/* Emergency Disruptions Modal — lists every emergency, each with its own Trigger Automation action */}
        {isEmergencyModalOpen && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <div className="w-full max-w-lg max-h-[80vh] bg-white rounded-2xl shadow-pop border border-slate-200 flex flex-col overflow-hidden">
              <div className="p-5 border-b border-red-200 bg-red-50 flex items-start justify-between gap-3 flex-shrink-0">
                <div className="flex items-start gap-2.5">
                  <span className="p-1.5 bg-red-600 text-white rounded-lg flex-shrink-0 mt-0.5">
                    <ShieldAlert className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="font-bold text-sm text-red-900">Emergency Disruptions</h3>
                    <p className="text-[11px] text-red-700 mt-0.5">
                      {emergencyShipments.length} shipment{emergencyShipments.length === 1 ? '' : 's'} require immediate recovery action.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onEmergencyModalOpenChange(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 flex-shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 space-y-2 overflow-y-auto">
                {emergencyShipments.map((s) => {
                  const isProcessing = processingShipmentId === s.id;
                  return (
                    <div key={s.id} className="p-3 bg-red-50/60 border border-red-200 rounded-xl">
                      <div className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider text-red-700">
                        <span>{s.id}</span>
                        <span className="flex items-center gap-1 font-mono">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-600 radar-ping" />
                          {s.delayHours > 0 ? `+${s.delayHours}h` : 'CRITICAL'}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-900 mt-0.5">{s.vesselName}</div>
                      <div className="text-[11px] text-red-700 mt-0.5">
                        → {s.destination}
                        {s.disruptionSummary ? ` · ${s.disruptionSummary}` : ''}
                      </div>

                      <div className="flex items-center gap-2 mt-2.5">
                        <button
                          onClick={() => {
                            setSelectedShipmentId(s.id);
                            setCurrentView('overview');
                            onEmergencyModalOpenChange(false);
                          }}
                          className="flex-1 py-1.5 bg-white border border-red-200 text-red-700 hover:bg-red-50 rounded-lg text-[11px] font-bold transition-colors"
                        >
                          View Details
                        </button>
                        <button
                          disabled={isProcessing}
                          onClick={() => handleTriggerAutomation(s.id)}
                          className="flex-1 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-lg text-[11px] font-bold transition-colors flex items-center justify-center gap-1.5"
                        >
                          {isProcessing ? (
                            <>
                              <span className="h-3 w-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                              <span>AI Analyzing…</span>
                            </>
                          ) : (
                            <>
                              <Zap className="w-3.5 h-3.5" />
                              <span>Trigger Automation</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Navigation list */}
        <nav className="p-2.5 space-y-1 overflow-y-auto max-h-[calc(100vh-220px)]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`w-full flex items-center gap-3 rounded-xl text-left transition-all duration-150 relative ${
                  isCollapsed ? 'h-10 justify-center px-0' : 'px-3 py-2.5'
                } ${
                  isActive
                    ? 'bg-primary text-ink font-bold shadow-sm shadow-ink/20 ring-1 ring-primary-strong'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 font-medium'
                }`}
                title={item.label}
              >
                <Icon
                  className={`w-4 h-4 flex-shrink-0 ${
                    isActive ? 'text-ink' : 'text-slate-400'
                  }`}
                />

                {!isCollapsed && (
                  <span className="truncate flex-1 text-xs">{item.label}</span>
                )}

                {!isCollapsed && item.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      isActive
                        ? 'bg-ink/10 text-ink border border-ink/20'
                        : item.badgeTone === 'danger'
                        ? 'bg-red-100 text-red-700 border border-red-200'
                        : item.badgeTone === 'warning'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-primary-soft text-accent-strong border border-primary-border'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}

                {isCollapsed && item.badge && (
                  <span
                    className={`absolute top-2 right-2 h-2 w-2 rounded-full ring-2 ring-white ${
                      item.badgeTone === 'danger' ? 'bg-red-600' : 'bg-amber-500'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Footer Telemetry */}
      {!isCollapsed && (
        <div className="p-3 border-t border-slate-200 bg-slate-50/70">
          <div className="space-y-1.5 text-[11px] text-slate-500">
            <div className="flex justify-between items-center">
              <span>Agent Network</span>
              <span className="font-semibold text-success flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                6/6 Active
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>SAP Connector</span>
              <span className="font-semibold text-slate-800">BTP / S4 (Sim)</span>
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 border-t border-slate-200">
              <span>Version</span>
              <span className="font-mono text-slate-600">v2.4-enterprise</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
