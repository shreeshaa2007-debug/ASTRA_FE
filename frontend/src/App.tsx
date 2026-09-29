/**
 * OilShield — Agentic AI Oil Supply Chain Control Tower
 * Root Application Component for SAP Hackathon
 */

import React from 'react';
import { OilShieldProvider, useOilShield } from './context/OilShieldContext';
import { OilShieldShell } from './components/layout/OilShieldShell';
import { OverviewView } from './components/views/OverviewView';
import { DisruptionCenterView } from './components/views/DisruptionCenterView';
import { AgentIntelligenceView } from './components/views/AgentIntelligenceView';
import { SupplyNetworkView } from './components/views/SupplyNetworkView';
import { SupplierIntelligenceView } from './components/views/SupplierIntelligenceView';
import { LogisticsTransportationView } from './components/views/LogisticsTransportationView';
import { InventoryManagementView } from './components/views/InventoryManagementView';
import { RecoveryScenariosView } from './components/views/RecoveryScenariosView';
import { ComplianceCenterView } from './components/views/ComplianceCenterView';
import { DecisionCenterView } from './components/views/DecisionCenterView';
import { AuditTrailView } from './components/views/AuditTrailView';
import { SettingsView } from './components/views/SettingsView';

const MainViewRenderer: React.FC = () => {
  const { currentView } = useOilShield();

  switch (currentView) {
    case 'overview':
      return <OverviewView />;
    case 'disruptions':
      return <OverviewView />;
    case 'agents':
      return <OverviewView />;
    case 'network':
      return <SupplyNetworkView />;
    case 'suppliers':
      return <SupplierIntelligenceView />;
    case 'logistics':
      return <LogisticsTransportationView />;
    case 'inventory':
      return <OverviewView />; // Inventory page removed per Section 10; backend logic preserved
    case 'scenarios':
      return <RecoveryScenariosView />;
    case 'compliance':
      return <DecisionCenterView />; // Compliance integrated into Decisions per Section 12
    case 'decisions':
      return <DecisionCenterView />;
    case 'audit':
      return <AuditTrailView />;
    case 'settings':
      return <SettingsView />;
    default:
      return <OverviewView />;
  }
};

export default function App() {
  return (
    <OilShieldProvider>
      <OilShieldShell>
        <MainViewRenderer />
      </OilShieldShell>
    </OilShieldProvider>
  );
}
