import React, { useState, useEffect, useRef } from 'react';
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

  // The screen scrolls inside <main>, not the window: a new screen starts at its top.
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [currentView]);

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

  const statusTone = !apiUp ? 'danger' : notReady ? 'warning' : 'success';
  const statusStyle = { danger: 'bg-danger-soft text-danger', warning: 'bg-warning-soft text-warning', success: 'bg-success-soft text-success' }[statusTone];
  const statusDot = { danger: 'bg-danger', warning: 'bg-warning', success: 'bg-success' }[statusTone];

  return (
    <div className="h-screen bg-canvas text-ink flex overflow-hidden font-body selection:bg-primary selection:text-white">
      {/* ========================================================================= */}
      {/* LEFT NAVIGATION: a floating white panel; collapses to the icon rail */}
      {/* ========================================================================= */}
      <aside
        className={`m-3 mr-0 flex flex-col justify-between bg-card rounded-2xl shadow-card flex-shrink-0 z-30 select-none transition-[width] duration-200 ${
          isSidebarCollapsed ? 'w-[68px]' : 'w-64'
        }`}
      >
        <div className="p-3 space-y-4 overflow-y-auto">
          {/* Brand */}
          <div className={`flex items-center ${isSidebarCollapsed ? 'flex-col gap-3' : 'gap-2 px-1 pt-1'}`}>
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="h-9 w-9 rounded-xl flex items-center justify-center text-ink-2 hover:bg-inset hover:text-ink transition-colors flex-shrink-0"
              title="Toggle Sidebar"
            >
              <span className="material-symbols-outlined text-[22px]">{isSidebarCollapsed ? 'menu_open' : 'menu'}</span>
            </button>
            <div onClick={() => onNavigate('overview')} className="flex items-center gap-2.5 cursor-pointer min-w-0" title="ResilientSC — AI supply chain command center">
              <span className="h-9 w-9 rounded-xl bg-primary text-white flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/30">
                <span className="material-symbols-outlined text-[20px]">hub</span>
              </span>
              {!isSidebarCollapsed && (
                <div className="min-w-0">
                  <div className="font-headline font-extrabold text-ink text-[15px] leading-tight tracking-tight">ResilientSC</div>
                  <div className="text-[10px] text-muted leading-tight truncate">AI supply chain command center</div>
                </div>
              )}
            </div>
          </div>

          {/* The simulation every screen is showing */}
          {!isSidebarCollapsed && (
            <div className="p-3 bg-inset rounded-xl space-y-1.5">
              <div className="text-[10px] font-semibold text-muted uppercase tracking-wider">Simulation</div>
              <select
                value={simulationId ?? ''}
                onChange={(e) => e.target.value && switchTo(e.target.value)}
                title="The simulation every screen is showing. Pick an earlier one to look at it again."
                className="w-full bg-card text-[11px] text-ink-2 rounded-lg border border-line px-2 py-1.5 focus:outline-hidden focus:border-primary"
              >
                {!simulationId && <option value="">No simulation</option>}
                {simulationId && !(simulations.data ?? []).some((s) => s.simulation_id === simulationId) && <option value={simulationId}>{simulationId}</option>}
                {(simulations.data ?? []).map((s) => (
                  <option key={s.simulation_id} value={s.simulation_id}>
                    {s.simulation_id} · {s.scenario_type} · {s.status}
                  </option>
                ))}
              </select>
              <div className={`text-[10px] font-semibold flex items-center gap-1.5 ${apiUp ? 'text-success' : 'text-danger'}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${apiUp ? 'bg-success' : 'bg-danger'}`}></span> {apiUp ? 'Backend online' : 'Backend unreachable'}
              </div>
            </div>
          )}

          {/* Navigation */}
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
                  className={`w-full flex items-center gap-3 rounded-xl text-left transition-all duration-150 relative ${isSidebarCollapsed ? 'h-11 justify-center' : 'px-3 py-2.5'} ${
                    isActive ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-ink-2 hover:bg-inset hover:text-ink'
                  }`}
                  title={item.label}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className="material-symbols-outlined text-[20px] flex-shrink-0">{item.icon}</span>
                  {!isSidebarCollapsed && <span className="truncate flex-1 text-[13px] font-semibold">{item.label}</span>}
                  {!isSidebarCollapsed && item.badge && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isActive ? 'bg-white/25 text-white' : 'bg-warning-soft text-warning'}`}>{item.badge}</span>
                  )}
                  {isSidebarCollapsed && item.badge && <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-warning ring-2 ring-card"></span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom of the sidebar: what the backend reports */}
        {!isSidebarCollapsed && (
          <div className="p-3">
            <div className="p-3 bg-inset rounded-xl space-y-1.5 text-[11px]">
              <div className="flex justify-between text-muted">
                <span>Backend API</span>
                <span className={`font-bold ${apiUp ? 'text-success' : 'text-danger'}`}>{apiUp ? 'Online' : 'Unreachable'}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>LLM (Gemini)</span>
                <span className={`font-bold ${llmOk ? 'text-success' : 'text-warning'}`}>{apiUp ? (llmOk ? 'Key set' : 'No key') : '—'}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Optimizer</span>
                <span className="text-primary font-bold">Prototype (HiGHS)</span>
              </div>
            </div>
          </div>
        )}
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* ========================================================================= */}
        {/* TOP BAR: search on the left, telemetry on the right */}
        {/* ========================================================================= */}
        <header className="h-[68px] px-4 sm:px-6 flex items-center justify-between gap-4 z-40 flex-shrink-0 select-none">
          <div className="hidden md:flex items-center flex-1 max-w-xl relative">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[19px] text-muted">search</span>
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
              className="w-full h-11 pl-11 pr-4 bg-card text-[13px] text-ink placeholder-muted rounded-xl shadow-card border border-transparent focus:outline-hidden focus:border-primary/40 transition-colors"
            />
            {searchQuery.trim() && (
              <div className="absolute top-12 left-0 right-0 z-50 bg-card rounded-xl shadow-pop overflow-hidden p-1.5">
                {jumps.length === 0 && <div className="px-3 py-2 text-[12px] text-muted">Nothing matches. Try a screen name, a product id (22197), a supplier (S007), a route (SHA-ROT-SUEZ) or a simulation id.</div>}
                {jumps.map((j, i) => (
                  <button key={j.label} onMouseDown={() => go(j)} className={`w-full text-left px-3 py-2 text-[12px] rounded-lg hover:bg-inset ${i === 0 ? 'text-primary font-semibold' : 'text-ink-2'}`}>
                    {j.label} <span className="text-muted font-normal">— {j.hint}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 ml-auto text-xs">
            {/* Orchestrator status: what the backend reports */}
            <div
              className="hidden xl:flex items-center gap-2 h-10 px-3.5 bg-card rounded-xl shadow-card text-[12px] font-medium text-ink-2"
              title={apiUp ? (llmOk ? 'Backend reachable; LLM key configured' : 'Backend reachable; no LLM_API_KEY set') : 'Backend unreachable'}
            >
              <span className="relative flex h-2 w-2">
                {apiUp && <span className="radar-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${apiUp ? 'bg-success' : 'bg-danger'}`}></span>
              </span>
              <span>{apiUp ? (llmOk ? 'Orchestrator: online' : 'Orchestrator: no LLM key') : 'Orchestrator: unreachable'}</span>
            </div>

            {/* UTC Clock */}
            <div className="hidden sm:flex items-center gap-1.5 h-10 px-3.5 bg-card rounded-xl shadow-card text-ink-2 text-[12px] font-medium font-mono">
              <span className="material-symbols-outlined text-[17px] text-primary">schedule</span>
              <span>{utcTime || 'UTC 14:38:09'}</span>
            </div>

            {/* Notifications Trigger */}
            <button
              onClick={() => setIsNotificationOpen(true)}
              className="h-10 w-10 rounded-xl bg-card shadow-card flex items-center justify-center text-ink-2 hover:text-primary transition-colors relative"
              title="Notifications"
            >
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              {alerts.length > 0 && (
                <span className="absolute -top-1 -right-1 h-[18px] min-w-[18px] px-1 rounded-full bg-danger text-[10px] font-bold text-white flex items-center justify-center ring-2 ring-canvas">
                  {alerts.length}
                </span>
              )}
            </button>

            {/* Backend connection (there is no SAP connection in the MVP) */}
            <button
              onClick={recheck}
              title={notReady ? `Backend reachable but not ready — ${notReadyWhy}` : 'Re-check the backend'}
              className={`flex items-center gap-2 h-10 px-3.5 rounded-xl font-bold text-[12px] ${statusStyle}`}
            >
              <span className={`h-2 w-2 rounded-full ${statusDot}`}></span>
              <span className="hidden sm:inline-block">{!apiUp ? 'API Unreachable' : notReady ? 'API Not Ready' : 'API Connected'}</span>
            </button>
          </div>
        </header>

        {/* MAIN CONTENT VIEWPORT */}
        <main ref={mainRef} className="flex-1 flex flex-col overflow-y-auto px-4 sm:px-6 pb-6">
          {/* Child View Canvas */}
          <div className="flex-1 pt-1">{children}</div>

          {/* What is real and what is not: the same statement as docs/real-vs-simulated.md, kept on every screen */}
          <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 text-[11px] flex-shrink-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted font-semibold uppercase tracking-wider text-[10px]">Running on</span>
              <span className="px-2.5 py-1 bg-card shadow-card rounded-full text-ink-2 font-medium">FastAPI + SQLite</span>
              <span className="px-2.5 py-1 bg-card shadow-card rounded-full text-ink-2 font-medium">XGBoost forecasting</span>
              <span className="px-2.5 py-1 bg-card shadow-card rounded-full text-ink-2 font-medium">Gemini sensing</span>
              <span className="px-2.5 py-1 bg-success-soft rounded-full text-success font-semibold">Live MVP (HiGHS via scipy)</span>
              <span className="px-2.5 py-1 bg-inset rounded-full text-muted font-medium">Production target: SAP IBP &amp; S/4HANA (not connected)</span>
            </div>
            <div className="text-muted">SAP Hackfest · ResilientSC</div>
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
