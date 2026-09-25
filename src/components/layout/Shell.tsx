import React, { useState, useEffect } from 'react';
import { ViewMode } from '../../types';
import { NotificationDrawer, useAlerts } from '../common/NotificationDrawer';
import { useSimulation } from '../../context/SimulationContext';
import { useFetch } from '../../hooks/useFetch';
import { getHealth, getReady, listSimulations } from '../../services/api';

interface ShellProps {
  currentView: ViewMode;
  onNavigate: (view: ViewMode) => void;
  children: React.ReactNode;
}

export const Shell: React.FC<ShellProps> = ({ currentView, onNavigate, children }) => {
  const [utcTime, setUtcTime] = useState<string>('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const { status, simulationId, switchTo } = useSimulation();
  // every simulation the backend knows, newest first, so an earlier run (the seeded one, say) can be looked at again
  const simulations = useFetch(() => listSimulations(undefined, 30), [], true, [status?.version, status?.status, status?.simulation_id]);
  const alerts = useAlerts();

  // The header and sidebar report what the backend actually says, not a fixed "connected".
  const health = useFetch(getHealth, []);
  const readiness = useFetch(getReady, []);
  const reloadHealth = health.reload;
  const reloadReady = readiness.reload;
  const recheck = () => {
    reloadHealth();
    reloadReady();
  };
  useEffect(() => {
    const id = setInterval(recheck, 20000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadHealth, reloadReady]);
  const apiUp = !!health.data;
  // alive is not the same as ready: a missing dataset or an unreachable database leaves the process up but unable to do its job
  const notReady = apiUp && readiness.data !== null && !readiness.data.ready;
  const notReadyWhy = readiness.data?.checks.filter((c) => c.required && !c.ok).map((c) => `${c.name}: ${c.detail}`).join('; ') ?? '';
  const llmOk = health.data?.llm_configured ?? false;

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hrs = String(now.getUTCHours()).padStart(2, '0');
      const mins = String(now.getUTCMinutes()).padStart(2, '0');
      const secs = String(now.getUTCSeconds()).padStart(2, '0');
      setUtcTime(`UTC ${hrs}:${mins}:${secs}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const navItems: { id: ViewMode; label: string; icon: string; badge?: string }[] = [
    { id: 'overview', label: 'Overview', icon: 'dashboard' },
    { id: 'disruptions', label: 'Disruptions', icon: 'crisis_alert' },
    { id: 'simulator', label: 'Disruption Simulator', icon: 'bolt' },
    { id: 'orchestration', label: 'Agent Orchestration', icon: 'smart_toy' },
    { id: 'decisions', label: 'AI Decisions', icon: 'psychology' },
    { id: 'inventory', label: 'Inventory', icon: 'inventory_2' },
    { id: 'sourcing', label: 'Sourcing', icon: 'factory' },
    { id: 'logistics', label: 'Logistics', icon: 'hub' },
    { id: 'compliance', label: 'Compliance & Approvals', icon: 'verified_user', badge: status?.awaiting_approval ? 'Action' : undefined },
    { id: 'scenarios', label: 'Scenarios', icon: 'compare_arrows' },
    { id: 'monitor', label: 'Agent Monitor', icon: 'monitor_heart' },
  ];

  // "Jump to": screens by name, and what an id points at. Nothing is searched in the data; an id goes to the screen that shows that kind of thing.
  interface Jump { label: string; hint: string; run: () => void }
  const q = searchQuery.trim();
  const jumps: Jump[] = [];
  if (q) {
    for (const item of navItems.filter((n) => n.label.toLowerCase().includes(q.toLowerCase())).slice(0, 4)) {
      jumps.push({ label: item.label, hint: 'screen', run: () => onNavigate(item.id) });
    }
    if (/^\d{4,5}[A-Za-z]?$/.test(q)) jumps.push({ label: `Product ${q.toUpperCase()}`, hint: 'Inventory (pick it in the product selector)', run: () => onNavigate('inventory') });
    if (/^S\d{3}$/i.test(q)) jumps.push({ label: `Supplier ${q.toUpperCase()}`, hint: 'Sourcing', run: () => onNavigate('sourcing') });
    if (/^[A-Za-z]{3}-[A-Za-z]{3}-[A-Za-z]+$/.test(q)) jumps.push({ label: `Route ${q.toUpperCase()}`, hint: 'Logistics', run: () => onNavigate('logistics') });
    if (/^sim-[a-z0-9]+$/i.test(q)) jumps.push({ label: `Simulation ${q}`, hint: 'switch to it and open the Agent Monitor', run: () => { switchTo(q); onNavigate('monitor'); } });
  }
  const go = (j: Jump) => {
    j.run();
    setSearchQuery('');
  };

  return (
    <div className="min-h-screen bg-[#0b1326] text-[#dae2fd] flex flex-col overflow-hidden font-body selection:bg-[#89ceff] selection:text-[#00344d]">
      {/* ========================================================================= */}
      {/* TOP BAR */}
      {/* ========================================================================= */}
      <header className="h-12 w-full bg-[#131b2e] border-b border-[#3e4850] px-4 sm:px-6 flex items-center justify-between z-40 flex-shrink-0 select-none">
        {/* Left: Brand Identity & Subtitle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-1 rounded text-[#88929b] hover:text-white hover:bg-[#222a3d] transition-colors"
            title="Toggle Sidebar"
          >
            <span className="material-symbols-outlined text-[20px]">
              {isSidebarCollapsed ? 'menu_open' : 'menu'}
            </span>
          </button>

          <div
            onClick={() => onNavigate('overview')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <span className="material-symbols-outlined text-[#89ceff] text-[22px] group-hover:scale-110 transition-transform">
              hub
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-headline font-bold text-white text-[15px] tracking-wide uppercase">
                ResilientSC
              </span>
              <span className="text-[10px] font-mono text-[#88929b] hidden md:inline-block">
                AI SUPPLY CHAIN COMMAND CENTER
              </span>
            </div>
          </div>
        </div>

        {/* Center: jump to a screen, or to what an id refers to */}
        <div className="hidden lg:flex items-center w-80 relative">
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[16px] text-[#88929b]">search</span>
          <input
            type="text"
            aria-label="Jump to"
            placeholder="Jump to a screen, product, supplier, route, simulation…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && jumps[0]) go(jumps[0]);
              if (e.key === 'Escape') setSearchQuery('');
            }}
            className="w-full h-7 pl-8 pr-3 bg-[#060e20] text-xs font-mono text-white placeholder-[#88929b] rounded border border-[#3e4850] focus:outline-hidden focus:border-[#89ceff] transition-colors"
          />
          {searchQuery.trim() && (
            <div className="absolute top-8 left-0 right-0 z-50 bg-[#131b2e] border border-[#3e4850] rounded shadow-2xl overflow-hidden">
              {jumps.length === 0 && <div className="px-3 py-2 text-[11px] font-mono text-[#88929b]">Nothing matches. Try a screen name, a product id (22197), a supplier (S007), a route (SHA-ROT-SUEZ) or a simulation id.</div>}
              {jumps.map((j, i) => (
                <button key={j.label} onMouseDown={() => go(j)} className={`w-full text-left px-3 py-1.5 text-[11px] font-mono hover:bg-[#222a3d] ${i === 0 ? 'text-[#89ceff]' : 'text-[#bec8d2]'}`}>
                  {j.label} <span className="text-[#88929b]">— {j.hint}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Operational Telemetry & SAP Connectivity */}
        <div className="flex items-center gap-3 text-xs font-mono">
          {/* Orchestrator status: what the backend reports */}
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-0.5 bg-[#171f33] border border-[#3e4850] rounded text-[11px]" title={apiUp ? (llmOk ? 'Backend reachable; LLM key configured' : 'Backend reachable; no LLM_API_KEY set') : 'Backend unreachable'}>
            <span className="relative flex h-2 w-2">
              {apiUp && <span className="radar-ping absolute inline-flex h-full w-full rounded-full bg-[#4edea3] opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${apiUp ? 'bg-[#4edea3]' : 'bg-[#ffb4ab]'}`}></span>
            </span>
            <span className="text-[#dae2fd]">{apiUp ? (llmOk ? 'Orchestrator: online' : 'Orchestrator: no LLM key') : 'Orchestrator: unreachable'}</span>
          </div>

          {/* UTC Clock */}
          <div className="hidden sm:flex items-center gap-1 text-[#bec8d2] text-[11px]">
            <span className="material-symbols-outlined text-[15px] text-[#ffb95f]">schedule</span>
            <span>{utcTime || 'UTC 14:38:09'}</span>
          </div>

          {/* Notifications Trigger */}
          <div className="relative">
            <button
              onClick={() => setIsNotificationOpen(true)}
              className="p-1 rounded text-[#88929b] hover:text-white hover:bg-[#222a3d] transition-colors relative"
              title="Notifications"
            >
              <span className="material-symbols-outlined text-[18px]">notifications</span>
              {alerts.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-[#93000a] text-[9px] font-bold text-[#ffdad6] flex items-center justify-center">
                  {alerts.length}
                </span>
              )}
            </button>
          </div>

          {/* Backend connection (there is no SAP connection in the MVP) */}
          <button onClick={recheck} title={notReady ? `Backend reachable but not ready — ${notReadyWhy}` : 'Re-check the backend'} className="flex items-center gap-2 pl-3 border-l border-[#3e4850]">
            <span className={`h-2 w-2 rounded-full ${!apiUp ? 'bg-[#ffb4ab]' : notReady ? 'bg-[#ffb95f]' : 'bg-[#4edea3]'}`}></span>
            <span className={`font-bold text-[11px] tracking-wider hidden sm:inline-block ${!apiUp ? 'text-[#ffb4ab]' : notReady ? 'text-[#ffb95f]' : 'text-[#89ceff]'}`}>
              {!apiUp ? 'API Unreachable' : notReady ? 'API Not Ready' : 'API Connected'}
            </span>
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* WORKSPACE WRAPPER (SIDEBAR + MAIN CANVAS) */}
      {/* ========================================================================= */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT NAVIGATION DRAWER */}
        <aside
          className={`flex flex-col justify-between h-full bg-[#060e20] border-r border-[#3e4850] flex-shrink-0 z-30 select-none transition-all duration-200 ${
            isSidebarCollapsed ? 'w-16' : 'w-60'
          }`}
        >
          {/* Top Section: Tenant Profile & Navigation Links */}
          <div className="p-3 space-y-3">
            {/* SAP Tenant Lockup */}
            {!isSidebarCollapsed ? (
              <div className="p-2.5 bg-[#131b2e] border border-[#3e4850] rounded-lg flex items-center gap-3">
                <div className="h-8 w-8 rounded bg-[#222a3d] border border-[#3e4850] flex items-center justify-center text-[#89ceff] font-headline font-bold text-xs">
                  SC
                </div>
                <div className="overflow-hidden">
                  <div className="font-headline font-bold text-white text-xs leading-tight truncate">
                    ResilientSC MVP
                  </div>
                  <select
                    value={simulationId ?? ''}
                    onChange={(e) => e.target.value && switchTo(e.target.value)}
                    title="The simulation every screen is showing. Pick an earlier one to look at it again."
                    className="w-full bg-[#060e20] text-[10px] font-mono text-[#bec8d2] rounded border border-[#3e4850] px-1 py-0.5 mt-0.5 focus:outline-hidden focus:border-[#89ceff]"
                  >
                    {!simulationId && <option value="">No simulation</option>}
                    {simulationId && !(simulations.data ?? []).some((s) => s.simulation_id === simulationId) && <option value={simulationId}>{simulationId}</option>}
                    {(simulations.data ?? []).map((s) => (
                      <option key={s.simulation_id} value={s.simulation_id}>
                        {s.simulation_id} · {s.scenario_type} · {s.status}
                      </option>
                    ))}
                  </select>
                  <div className={`text-[9px] font-mono flex items-center gap-1 mt-0.5 ${apiUp ? 'text-[#4edea3]' : 'text-[#ffb4ab]'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${apiUp ? 'bg-[#4edea3]' : 'bg-[#ffb4ab]'}`}></span> {apiUp ? 'BACKEND ONLINE' : 'BACKEND UNREACHABLE'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-9 w-9 mx-auto rounded bg-[#131b2e] border border-[#3e4850] flex items-center justify-center text-[#89ceff] font-headline font-bold text-xs">
                SC
              </div>
            )}

            {/* Navigation Menu Links */}
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive =
                  currentView === item.id ||
                  (item.id === 'simulator' && currentView === 'orchestration') ||
                  (item.id === 'overview' && currentView === 'disruptions');

                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded text-xs font-mono transition-all duration-150 relative ${
                      isActive
                        ? 'bg-[#222a3d] text-[#89ceff] font-bold border-l-2 border-[#89ceff]'
                        : 'text-[#bec8d2] hover:bg-[#131b2e] hover:text-white border-l-2 border-transparent'
                    }`}
                    title={item.label}
                  >
                    <span className="material-symbols-outlined text-[18px] flex-shrink-0">
                      {item.icon}
                    </span>
                    {!isSidebarCollapsed && (
                      <span className="truncate flex-1 text-[11px] font-medium">{item.label}</span>
                    )}
                    {!isSidebarCollapsed && item.badge && (
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                          item.badge.includes('Critical')
                            ? 'bg-[#93000a] text-[#ffdad6]'
                            : 'bg-[#d88a00]/30 text-[#ffb95f]'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom Sidebar: BTP Engine Status */}
          {!isSidebarCollapsed && (
            <div className="p-3 border-t border-[#3e4850] bg-[#060e20]">
              <div className="p-2.5 bg-[#131b2e] rounded border border-[#3e4850] space-y-1.5 text-[10px] font-mono">
                <div className="flex justify-between text-[#88929b]">
                  <span>Backend API:</span>
                  <span className={`font-bold ${apiUp ? 'text-[#4edea3]' : 'text-[#ffb4ab]'}`}>{apiUp ? 'Online' : 'Unreachable'}</span>
                </div>
                <div className="flex justify-between text-[#88929b]">
                  <span>LLM (Gemini):</span>
                  <span className={`font-bold ${llmOk ? 'text-[#4edea3]' : 'text-[#ffb95f]'}`}>{apiUp ? (llmOk ? 'Key set' : 'No key') : '—'}</span>
                </div>
                <div className="flex justify-between text-[#88929b]">
                  <span>Optimizer:</span>
                  <span className="text-[#89ceff] font-bold">Prototype (HiGHS)</span>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* MAIN CONTENT VIEWPORT */}
        <main className="flex-1 flex flex-col overflow-y-auto bg-[#0b1326]">
          {/* Quick Sub-Navigation / Hackfest Demo Tabs */}
          <div className="px-4 sm:px-6 py-2 border-b border-[#3e4850] bg-[#131b2e] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-[#88929b] uppercase tracking-wider text-[10px]">Workspace /</span>
              <span className="font-headline font-bold text-white text-xs uppercase">
                {currentView === 'overview'
                  ? 'Mission Control Dashboard'
                  : currentView === 'disruptions'
                  ? 'Active Maritime Disruptions'
                  : currentView === 'simulator'
                  ? 'Disruption Simulator & Agents'
                  : currentView === 'orchestration'
                  ? 'Agent Orchestration Swarm'
                  : currentView === 'decisions'
                  ? 'AI Decision Center & Explainability'
                  : currentView === 'inventory'
                  ? 'Inventory Intelligence & Warehouse Risk'
                  : currentView === 'sourcing'
                  ? 'Sourcing Intelligence & Redundancy'
                  : currentView === 'logistics'
                  ? 'Logistics Network Topology'
                  : currentView === 'compliance'
                  ? 'Compliance & Human Authorization'
                  : currentView === 'scenarios'
                  ? 'Scenario Benchmark Comparison'
                  : 'Technical Agent Monitor'}
              </span>
            </div>

            {/* Quick Demo Switcher Tabs for Hackfest Judges */}
            <div className="flex items-center gap-1 bg-[#060e20] p-1 rounded border border-[#3e4850] text-[11px] font-mono">
              <button
                onClick={() => onNavigate('overview')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  currentView === 'overview' || currentView === 'disruptions'
                    ? 'bg-[#222a3d] text-[#89ceff] font-bold'
                    : 'text-[#bec8d2] hover:text-white'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => onNavigate('simulator')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  currentView === 'simulator' || currentView === 'orchestration'
                    ? 'bg-[#222a3d] text-[#89ceff] font-bold'
                    : 'text-[#bec8d2] hover:text-white'
                }`}
              >
                Simulator &amp; Agents
              </button>
              <button
                onClick={() => onNavigate('decisions')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  currentView === 'decisions'
                    ? 'bg-[#222a3d] text-[#89ceff] font-bold'
                    : 'text-[#bec8d2] hover:text-white'
                }`}
              >
                AI Reasoning
              </button>
              <button
                onClick={() => onNavigate('inventory')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  currentView === 'inventory'
                    ? 'bg-[#222a3d] text-[#89ceff] font-bold'
                    : 'text-[#bec8d2] hover:text-white'
                }`}
              >
                Inventory
              </button>
              <button
                onClick={() => onNavigate('compliance')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  currentView === 'compliance'
                    ? 'bg-[#222a3d] text-[#89ceff] font-bold'
                    : 'text-[#bec8d2] hover:text-white'
                }`}
              >
                Approvals
              </button>
              <button
                onClick={() => onNavigate('scenarios')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  currentView === 'scenarios'
                    ? 'bg-[#222a3d] text-[#89ceff] font-bold'
                    : 'text-[#bec8d2] hover:text-white'
                }`}
              >
                Benchmarking
              </button>
            </div>
          </div>

          {/* Child View Canvas */}
          <div className="flex-1 p-4 sm:p-6">{children}</div>

          {/* STEP 17: SAP INTEGRATION ARCHITECTURE FOOTER */}
          <footer className="border-t border-[#3e4850] bg-[#060e20] p-4 flex flex-wrap items-center justify-between gap-4 text-xs font-mono flex-shrink-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[#88929b] uppercase text-[10px]">Running on:</span>
              <span className="px-2 py-0.5 bg-[#131b2e] border border-[#3e4850] rounded text-white">FastAPI + SQLite</span>
              <span className="px-2 py-0.5 bg-[#131b2e] border border-[#3e4850] rounded text-white">XGBoost forecasting</span>
              <span className="px-2 py-0.5 bg-[#131b2e] border border-[#3e4850] rounded text-white">Gemini sensing</span>
              <span className="px-2 py-0.5 bg-[#00a572]/20 border border-[#4edea3] rounded text-[#4edea3]">
                Live MVP (HiGHS via scipy)
              </span>
              <span className="px-2 py-0.5 bg-[#171f33] border border-[#3e4850] rounded text-[#88929b]">
                Production target: SAP IBP &amp; S/4HANA (not connected)
              </span>
            </div>

            <div className="text-[11px] text-[#88929b]">
              SAP Hackfest · ResilientSC
            </div>
          </footer>
        </main>
      </div>

      {/* Notifications Drawer */}
      <NotificationDrawer
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        onNavigateToView={(view) => {
          setIsNotificationOpen(false);
          onNavigate(view);
        }}
      />
    </div>
  );
};
