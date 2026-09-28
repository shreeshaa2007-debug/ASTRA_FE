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
} from 'lucide-react';
import { useOilShield } from '../../context/OilShieldContext';
import { OilShieldView } from '../../types/oilshield';

interface HeaderProps {
  onOpenNotifications: () => void;
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
  } = useOilShield();

  const [utcTime, setUtcTime] = useState<string>('');
  const [localDate, setLocalDate] = useState<string>('');
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
      });
      setLocalDate(dateStr);
    };

    updateTimes();
    const interval = setInterval(updateTimes, 1000);
    return () => clearInterval(interval);
  }, []);

  // Search shortcuts
  const q = searchQuery.trim().toLowerCase();
  const searchResults: { label: string; hint: string; action: () => void }[] = [];

  if (q) {
    if ('overview'.includes(q))
      searchResults.push({ label: 'Overview Dashboard', hint: 'Go to Overview', action: () => setCurrentView('overview') });
    if ('disruptions'.includes(q) || 'incident'.includes(q))
      searchResults.push({ label: 'Disruption Center', hint: 'Active Incidents', action: () => setCurrentView('disruptions') });
    if ('agents'.includes(q) || 'ai'.includes(q))
      searchResults.push({ label: 'Agent Intelligence', hint: '6 Specialized Agents', action: () => setCurrentView('agents') });
    if ('network'.includes(q) || 'topology'.includes(q))
      searchResults.push({ label: 'Supply Network', hint: 'Control Tower Graph', action: () => setCurrentView('network') });
    if ('supplier'.includes(q) || 'aramco'.includes(q) || 'adnoc'.includes(q))
      searchResults.push({ label: 'Supplier Intelligence', hint: 'Crude Sources & Grades', action: () => setCurrentView('suppliers') });
    if ('logistics'.includes(q) || 'route'.includes(q) || 'ennore'.includes(q) || 'port'.includes(q))
      searchResults.push({ label: 'Logistics & Transportation', hint: 'Multi-Modal Routes', action: () => setCurrentView('logistics') });
    if ('inventory'.includes(q) || 'stock'.includes(q) || 'refinery'.includes(q) || 'kochi'.includes(q))
      searchResults.push({ label: 'Inventory Management', hint: 'Tank Farms & Buffers', action: () => setCurrentView('inventory') });
    if ('scenarios'.includes(q) || 'recovery'.includes(q))
      searchResults.push({ label: 'Recovery Scenarios', hint: 'Trade-off Analysis', action: () => setCurrentView('scenarios') });
    if ('compliance'.includes(q) || 'policy'.includes(q))
      searchResults.push({ label: 'Compliance Center', hint: 'Regulatory Guardrails', action: () => setCurrentView('compliance') });
    if ('decision'.includes(q) || 'approve'.includes(q) || 'human'.includes(q))
      searchResults.push({ label: 'Human Decision Center', hint: 'Executive Authorization', action: () => setCurrentView('decisions') });
    if ('audit'.includes(q) || 'log'.includes(q))
      searchResults.push({ label: 'Audit Trail', hint: 'Provenance & Hashes', action: () => setCurrentView('audit') });

    // Also match incident IDs
    incidents.forEach((inc) => {
      if (inc.id.toLowerCase().includes(q) || inc.location.toLowerCase().includes(q)) {
        searchResults.push({
          label: `${inc.id}: ${inc.type}`,
          hint: `${inc.location} (${inc.severity})`,
          action: () => {
            setSelectedIncidentId(inc.id);
            setCurrentView('disruptions');
          },
        });
      }
    });
  }

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
            placeholder="Search incidents (OIL-1042), agents, crude grades, suppliers, or routes..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => setIsSearchOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchResults[0]) {
                handleSelectSearchResult(searchResults[0].action);
              }
              if (e.key === 'Escape') {
                setIsSearchOpen(false);
              }
            }}
            className="w-full h-10 pl-10 pr-4 bg-slate-50 border border-slate-200 text-xs rounded-xl focus:bg-white focus:border-[#154734] focus:ring-2 focus:ring-[#154734]/15 focus:outline-hidden transition-all text-slate-900 placeholder:text-slate-400"
          />
        </div>

        {/* Predictive Search Popup */}
        {isSearchOpen && searchResults.length > 0 && (
          <div className="absolute top-12 left-0 right-0 z-50 bg-white rounded-xl shadow-pop border border-slate-200 p-1.5 space-y-1">
            <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Quick Jumps
            </div>
            {searchResults.slice(0, 5).map((item, idx) => (
              <button
                key={idx}
                onMouseDown={() => handleSelectSearchResult(item.action)}
                className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-slate-50 flex items-center justify-between transition-colors"
              >
                <span className="font-semibold text-slate-800">{item.label}</span>
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  {item.hint}
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3 ml-auto">
        {/* System Health Indicator */}
        <div className="hidden xl:flex items-center gap-2 h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700">
          <span className="relative flex h-2 w-2">
            <span className="radar-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
          </span>
          <span className="text-slate-800 font-bold">Agents: 6/6 Active</span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-500">SAP S/4HANA (Mock)</span>
        </div>

        {/* Date and Live Clock */}
        <div className="hidden md:flex items-center gap-2 h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 font-mono">
          <Clock className="w-3.5 h-3.5 text-[#154734]" />
          <span>{localDate}</span>
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
          <div className="h-9 w-9 rounded-xl bg-[#154734] text-white flex items-center justify-center font-bold text-xs ring-1 ring-emerald-800/30">
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
