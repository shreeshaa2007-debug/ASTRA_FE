import React from 'react';
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
} from 'lucide-react';
import { useOilShield } from '../../context/OilShieldContext';
import { OilShieldView } from '../../types/oilshield';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
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
}) => {
  const {
    currentView,
    setCurrentView,
    selectedIncident,
    operationalShipments,
    selectedShipmentId,
    setSelectedShipmentId,
    dynamicRecoveryOptions,
  } = useOilShield();

  const pendingApprovalsCount = dynamicRecoveryOptions.filter(
    (o) => o.humanApprovalStatus === 'AWAITING_APPROVAL'
  ).length;

  const emergencyShipment =
    operationalShipments.find((s) => s.isEmergency) || operationalShipments[0];

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
        <div className="p-3.5 border-b border-slate-200 flex items-center justify-between">
          <div
            onClick={() => setCurrentView('overview')}
            className="flex items-center gap-2.5 cursor-pointer min-w-0"
            title="OilShield — AI Supply Chain Control Tower"
          >
            <div className="h-9 w-9 rounded-xl bg-[#154734] text-white flex items-center justify-center flex-shrink-0 shadow-sm ring-1 ring-emerald-800/30">
              <Droplet className="w-5 h-5 fill-white/20" />
            </div>

            {!isCollapsed && (
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-slate-900 text-base tracking-tight">
                    OilShield
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 bg-emerald-50 text-emerald-800 font-mono rounded border border-emerald-200/80 font-bold">
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

        {/* Active Emergency Shipment Capsule in Sidebar */}
        {!isCollapsed && emergencyShipment && (
          <div
            onClick={() => {
              setSelectedShipmentId(emergencyShipment.id);
              setCurrentView('overview');
            }}
            className="p-3 mx-3 my-2.5 bg-red-50/90 hover:bg-red-100/80 transition-colors rounded-xl border border-red-200 cursor-pointer shadow-xs"
            title="Click to inspect emergency shipment"
          >
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-red-700 mb-1">
              <span>Emergency Disruption</span>
              <span className="text-red-700 flex items-center gap-1 font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-red-600 radar-ping" />
                CRITICAL
              </span>
            </div>
            <div className="text-xs font-bold text-slate-900 truncate">
              {emergencyShipment.id}: {emergencyShipment.vesselName}
            </div>
            <div className="text-[11px] text-red-700 font-semibold truncate mt-0.5">
              {emergencyShipment.destination} • +{emergencyShipment.delayHours}h Delay
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
                    ? 'bg-[#154734] text-white font-bold shadow-sm shadow-emerald-950/20 ring-1 ring-[#154734]'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 font-medium'
                }`}
                title={item.label}
              >
                <Icon
                  className={`w-4 h-4 flex-shrink-0 ${
                    isActive ? 'text-white' : 'text-slate-400'
                  }`}
                />

                {!isCollapsed && (
                  <span className="truncate flex-1 text-xs">{item.label}</span>
                )}

                {!isCollapsed && item.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      isActive
                        ? 'bg-white/20 text-white border border-white/30'
                        : item.badgeTone === 'danger'
                        ? 'bg-red-100 text-red-700 border border-red-200'
                        : item.badgeTone === 'warning'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
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
              <span className="font-semibold text-emerald-700 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
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
