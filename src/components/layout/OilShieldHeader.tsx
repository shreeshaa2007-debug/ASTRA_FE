import React, { useState, useEffect } from 'react';
import {
  Search,
  Bell,
  Clock,
  Activity,
  User,
  Shield,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Ship,
  Users,
  Building2,
  Truck,
  GitBranch,
} from 'lucide-react';
import { useOilShield } from '../../context/OilShieldContext';
import { OilShieldView } from '../../types/oilshield';

interface HeaderProps {
  onOpenNotifications: () => void;
}

interface SearchHit {
  label: string;
  hint: string;
  action: () => void;
}

interface SearchGroup {
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  hits: SearchHit[];
}

export const OilShieldHeader: React.FC<HeaderProps> = ({ onOpenNotifications }) => {
  const {
    currentView,
    setCurrentView,
    userProfile,
    unreadNotificationCount,
    searchQuery,
    setSearchQuery,
    incidents,
    setSelectedIncidentId,
    operationalShipments,
    setSelectedShipmentId,
    suppliers,
    networkNodes,
    logistics,
    dynamicRecoveryOptions,
    setSelectedRecoveryOptionId,
  } = useOilShield();

  const [utcTime, setUtcTime] = useState<string>('');
  const [utcDate, setUtcDate] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  useEffect(() => {
    const updateTimes = () => {
      const now = new Date();
      const hrs = String(now.getUTCHours()).padStart(2, '0');
      const mins = String(now.getUTCMinutes()).padStart(2, '0');
      const secs = String(now.getUTCSeconds()).padStart(2, '0');
      setUtcTime(`UTC ${hrs}:${mins}:${secs}`);

      const dateStr = now.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      });
      setUtcDate(dateStr);
    };

    updateTimes();
    const interval = setInterval(updateTimes, 1000);
    return () => clearInterval(interval);
  }, []);

  // Real-data search: shipments, incidents, network stakeholders, suppliers, routes, recovery options
  const q = searchQuery.trim().toLowerCase();
  const searchGroups: SearchGroup[] = [];

  if (q.length > 0) {
    const shipmentHits: SearchHit[] = operationalShipments
      .filter(
        (s) =>
          s.id.toLowerCase().includes(q) ||
          s.vesselName.toLowerCase().includes(q) ||
          s.supplier.toLowerCase().includes(q) ||
          s.origin.toLowerCase().includes(q) ||
          s.destination.toLowerCase().includes(q) ||
          s.cargo.toLowerCase().includes(q)
      )
      .slice(0, 4)
      .map((s) => ({
        label: `${s.id} — ${s.vesselName}`,
        hint: `${s.origin} → ${s.destination}${s.delayHours > 0 ? ` · +${s.delayHours}h` : ''}`,
        action: () => {
          setSelectedShipmentId(s.id);
          setCurrentView('overview');
        },
      }));
    if (shipmentHits.length) searchGroups.push({ category: 'Ships & Shipments', icon: Ship, hits: shipmentHits });

    const incidentHits: SearchHit[] = incidents
      .filter(
        (inc) =>
          inc.id.toLowerCase().includes(q) ||
          inc.title.toLowerCase().includes(q) ||
          inc.type.toLowerCase().includes(q) ||
          inc.location.toLowerCase().includes(q)
      )
      .slice(0, 4)
      .map((inc) => ({
        label: `${inc.id}: ${inc.type}`,
        hint: `${inc.location} · ${inc.severity}`,
        action: () => {
          setSelectedIncidentId(inc.id);
          setCurrentView('overview');
        },
      }));
    if (incidentHits.length) searchGroups.push({ category: 'Disruptions', icon: AlertTriangle, hits: incidentHits });

    const stakeholderHits: SearchHit[] = networkNodes
      .filter(
        (n) =>
          n.name.toLowerCase().includes(q) ||
          n.location.toLowerCase().includes(q) ||
          n.tier.toLowerCase().includes(q)
      )
      .slice(0, 4)
      .map((n) => ({
        label: n.name,
        hint: `${n.tier} · ${n.location}`,
        action: () => setCurrentView('network'),
      }));
    if (stakeholderHits.length) searchGroups.push({ category: 'Stakeholders', icon: Users, hits: stakeholderHits });

    const supplierHits: SearchHit[] = suppliers
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.crudeGrade.toLowerCase().includes(q) ||
          s.country.toLowerCase().includes(q) ||
          s.location.toLowerCase().includes(q)
      )
      .slice(0, 4)
      .map((s) => ({
        label: s.name,
        hint: `${s.crudeGrade} · ${s.country}`,
        action: () => setCurrentView('suppliers'),
      }));
    if (supplierHits.length) searchGroups.push({ category: 'Suppliers', icon: Building2, hits: supplierHits });

    const routeHits: SearchHit[] = logistics
      .filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.origin.toLowerCase().includes(q) ||
          r.destination.toLowerCase().includes(q)
      )
      .slice(0, 4)
      .map((r) => ({
        label: r.name,
        hint: `${r.origin} → ${r.destination} · ${r.transportMode}`,
        action: () => setCurrentView('logistics'),
      }));
    if (routeHits.length) searchGroups.push({ category: 'Routes', icon: Truck, hits: routeHits });

    const recoveryHits: SearchHit[] = dynamicRecoveryOptions
      .filter(
        (o) =>
          o.title.toLowerCase().includes(q) ||
          o.supplier.toLowerCase().includes(q) ||
          o.route.toLowerCase().includes(q)
      )
      .slice(0, 4)
      .map((o) => ({
        label: o.title,
        hint: `${o.category} · +${o.etaDeltaHours}h`,
        action: () => {
          setSelectedRecoveryOptionId(o.id);
          setCurrentView('decisions');
        },
      }));
    if (recoveryHits.length) searchGroups.push({ category: 'Recovery Options', icon: GitBranch, hits: recoveryHits });
  }

  const flatSearchResults = searchGroups.flatMap((g) => g.hits);

  const handleSelectSearchResult = (action: () => void) => {
    action();
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  return (
    <header className="h-16 px-4 sm:px-6 bg-white border-b border-slate-200 flex items-center justify-between gap-4 z-40 flex-shrink-0 select-none shadow-xs">
      {/* Search Bar */}
      <div className="flex-1 max-w-xl relative">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search shipments, stakeholders, suppliers, routes, or incidents (OIL-1042)..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => setIsSearchOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && flatSearchResults[0]) {
                handleSelectSearchResult(flatSearchResults[0].action);
              }
              if (e.key === 'Escape') {
                setIsSearchOpen(false);
              }
            }}
            className="w-full h-10 pl-10 pr-4 bg-slate-50 border border-slate-200 text-xs rounded-xl focus:bg-white focus:border-accent focus:ring-2 focus:ring-accent/15 focus:outline-hidden transition-all text-slate-900 placeholder:text-slate-400"
          />
        </div>

        {/* Predictive Search Popup */}
        {isSearchOpen && q.length > 0 && (
          <div className="absolute top-12 left-0 right-0 z-50 bg-white rounded-xl shadow-pop border border-slate-200 p-1.5 space-y-2 max-h-[26rem] overflow-y-auto">
            {searchGroups.length === 0 && (
              <div className="px-3 py-4 text-xs text-slate-400 text-center">
                No matches for "{searchQuery}"
              </div>
            )}
            {searchGroups.map((group) => (
              <div key={group.category}>
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <group.icon className="w-3 h-3" />
                  <span>{group.category}</span>
                </div>
                {group.hits.map((item, idx) => (
                  <button
                    key={idx}
                    onMouseDown={() => handleSelectSearchResult(item.action)}
                    className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-slate-50 flex items-center justify-between transition-colors"
                  >
                    <span className="font-semibold text-slate-800">{item.label}</span>
                    <span className="text-[11px] text-slate-500 flex items-center gap-1 flex-shrink-0 ml-3">
                      {item.hint}
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3 ml-auto">
        {/* System Health Indicator */}
        <div className="hidden xl:flex items-center gap-2 h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700">
          <span className="relative flex h-2 w-2">
            <span className="radar-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
          </span>
          <span className="text-slate-800 font-bold">Agents: 6/6 Active</span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-500">SAP S/4HANA (Mock)</span>
        </div>

        {/* Date and Live Clock */}
        <div className="hidden md:flex items-center gap-2 h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 font-mono">
          <Clock className="w-3.5 h-3.5 text-accent" />
          <span>{utcDate}</span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-900 font-bold">{utcTime || 'UTC 14:32:10'}</span>
        </div>

        {/* Notifications button */}
        <button
          onClick={onOpenNotifications}
          className="h-9 w-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-700 transition-colors relative"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadNotificationCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-red-600 text-[10px] font-bold text-white flex items-center justify-center ring-2 ring-white">
              {unreadNotificationCount}
            </span>
          )}
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
          <div className="h-9 w-9 rounded-xl bg-primary text-ink flex items-center justify-center font-bold text-xs ring-1 ring-accent/30">
            {userProfile.avatarInitials}
          </div>
          <div className="hidden lg:block text-left">
            <div className="text-xs font-bold text-slate-900 leading-tight">
              {userProfile.name}
            </div>
            <div className="text-[10px] text-slate-500 leading-tight">
              {userProfile.role}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
