/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ViewMode } from './types';
import { ApiRoute } from './types/api';
import { SimulationProvider } from './context/SimulationContext';
import { Shell } from './components/layout/Shell';
import { DashboardView } from './components/views/DashboardView';
import { SimulatorView } from './components/views/SimulatorView';
import { DecisionView } from './components/views/DecisionView';
import { InventoryView } from './components/views/InventoryView';
import { SourcingView } from './components/views/SourcingView';
import { LogisticsView } from './components/views/LogisticsView';
import { ComplianceView } from './components/views/ComplianceView';
import { ScenariosView } from './components/views/ScenariosView';
import { AgentMonitorView } from './components/views/AgentMonitorView';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('overview');
  const [selectedRoute, setSelectedRoute] = useState<ApiRoute | null>(null);

  const handleNavigate = (view: ViewMode) => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectRoute = (route: ApiRoute) => {
    setSelectedRoute(route);
    setCurrentView('logistics');
  };

  return (
    <SimulationProvider>
      <Shell currentView={currentView} onNavigate={handleNavigate}>
        {(currentView === 'overview' || currentView === 'disruptions') && (
          <DashboardView onNavigate={handleNavigate} onSelectRoute={handleSelectRoute} />
        )}
        {(currentView === 'simulator' || currentView === 'orchestration') && (
          <SimulatorView onNavigate={handleNavigate} />
        )}
        {currentView === 'decisions' && <DecisionView onNavigate={handleNavigate} />}
        {currentView === 'inventory' && <InventoryView onNavigate={handleNavigate} />}
        {currentView === 'sourcing' && <SourcingView onNavigate={handleNavigate} />}
        {currentView === 'logistics' && (
          <LogisticsView onNavigate={handleNavigate} initialRouteId={selectedRoute?.route_id} />
        )}
        {currentView === 'compliance' && <ComplianceView onNavigate={handleNavigate} />}
        {currentView === 'scenarios' && <ScenariosView onNavigate={handleNavigate} />}
        {currentView === 'monitor' && <AgentMonitorView onNavigate={handleNavigate} />}
      </Shell>
    </SimulationProvider>
  );
}
