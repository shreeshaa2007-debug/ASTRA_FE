/**
 * OilShield — Agentic AI Oil Supply Chain Control Tower
 * Global Application Context & State Management
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  OilShieldView,
  DisruptionIncident,
  DisruptionSeverity,
  SpecializedAgent,
  CrudeSupplier,
  LogisticsOption,
  TransportMode,
  InventoryFacility,
  RecoveryScenario,
  ComplianceCheckRule,
  SupplyChainNode,
  AuditEvent,
  SystemNotification,
  DynamicRecoveryOption,
  OperationalShipment,
} from '../types/oilshield';
import {
  INITIAL_INCIDENTS,
  INITIAL_AGENTS,
  INITIAL_SUPPLIERS,
  INITIAL_LOGISTICS,
  INITIAL_INVENTORY,
  INITIAL_SCENARIOS,
  INITIAL_COMPLIANCE_RULES,
  INITIAL_NETWORK_NODES,
  INITIAL_AUDIT_LOG,
  INITIAL_NOTIFICATIONS,
  HACKATHON_DEMO_STEPS,
  OPERATIONAL_SHIPMENTS,
  generateDynamicRecoveryOptions,
} from '../data/mockOilShieldData';

export interface UserProfile {
  name: string;
  role: string;
  department: string;
  clearanceLevel: string;
  avatarInitials: string;
}

interface OilShieldContextType {
  currentView: OilShieldView;
  setCurrentView: (view: OilShieldView) => void;
  operationalShipments: OperationalShipment[];
  selectedShipment: OperationalShipment;
  selectedShipmentId: string;
  setSelectedShipmentId: (id: string) => void;
  incidents: DisruptionIncident[];
  selectedIncident: DisruptionIncident;
  setSelectedIncidentId: (id: string) => void;
  agents: SpecializedAgent[];
  suppliers: CrudeSupplier[];
  logistics: LogisticsOption[];
  inventory: InventoryFacility[];
  scenarios: RecoveryScenario[];
  selectedScenarioId: string;
  setSelectedScenarioId: (id: string) => void;
  dynamicRecoveryOptions: DynamicRecoveryOption[];
  selectedRecoveryOptionId: string;
  setSelectedRecoveryOptionId: (id: string) => void;
  selectedRecoveryOption: DynamicRecoveryOption;
  emergencySpendLimit: number;
  setEmergencySpendLimit: (val: number) => void;
  minCoverageDays: number;
  setMinCoverageDays: (val: number) => void;
  agentConfidenceThreshold: number;
  setAgentConfidenceThreshold: (val: number) => void;
  complianceRules: ComplianceCheckRule[];
  networkNodes: SupplyChainNode[];
  auditLogs: AuditEvent[];
  notifications: SystemNotification[];
  unreadNotificationCount: number;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  userProfile: UserProfile;
  setUserProfile: (profile: UserProfile) => void;
  currentTourStep: number;
  goToNextTourStep: () => void;
  goToPrevTourStep: () => void;
  goToTourStep: (stepNumber: number) => void;
  approveScenario: (scenarioId: string, approverName: string, notes?: string) => void;
  rejectScenario: (scenarioId: string, reason: string, notes?: string) => void;
  modifyScenario: (scenarioId: string, updates: Partial<RecoveryScenario>, notes: string) => void;
  approveRecoveryOption: (optionId: string, approverName: string, notes?: string) => void;
  rejectRecoveryOption: (optionId: string, reason: string, notes?: string) => void;
  modifyRecoveryOption: (optionId: string, updates: Partial<DynamicRecoveryOption>, notes: string) => void;
  requestScenarioAnalysis: (scenarioId: string, queryNotes: string) => void;
  escalateScenario: (scenarioId: string, notes: string) => void;
  resetAllData: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  addShipment: (input: NewShipmentInput) => void;
  logDisruption: (input: NewIncidentInput) => void;
  addNetworkNode: (input: NewNetworkNodeInput) => void;
  addSupplier: (input: NewSupplierInput) => void;
  addLogisticsOption: (input: NewLogisticsOptionInput) => void;
  proposeRecoveryOption: (input: NewRecoveryOptionInput) => void;
  addManualAuditEntry: (input: NewAuditEntryInput) => void;
  triggerAutomation: (shipmentId: string) => void;
}

export interface NewShipmentInput {
  vesselName: string;
  cargo: string;
  quantityBarrels: number;
  origin: string;
  destination: string;
  supplier: string;
  eta: string;
  delayHours?: number;
}

export interface NewIncidentInput {
  title: string;
  type: string;
  location: string;
  linkedShipmentId?: string;
  vesselName: string;
  product: string;
  quantityBarrels: number;
  severity: DisruptionSeverity;
  estimatedDelayHours: number;
  affectedRefinery: string;
  affectedCustomer: string;
  rootCause: string;
}

export interface NewNetworkNodeInput {
  name: string;
  tier: SupplyChainNode['tier'];
  location: string;
  throughputBarrelsPerDay: number;
  currentCapacityPct: number;
  productHandling: string;
  connectedTo?: string[];
  notes?: string;
}

export interface NewSupplierInput {
  name: string;
  location: string;
  country: string;
  crudeGrade: string;
  apiGravity: number;
  sulfurContentPct: number;
  availableQuantityBarrels: number;
  leadTimeHours: number;
  reliabilityScorePct: number;
  estimatedCostPerBbl: number;
  compatibilityPct: number;
  portAccess: string;
  contractType: CrudeSupplier['contractType'];
  complianceNotes: string;
}

export interface NewLogisticsOptionInput {
  name: string;
  origin: string;
  destination: string;
  currentRoute: string;
  alternativeRoute: string;
  transportMode: TransportMode;
  estimatedTravelHours: number;
  transportCostPerBbl: number;
  availableCapacityBarrels: number;
  routeRisk: LogisticsOption['routeRisk'];
  infrastructureNotes: string;
}

export interface NewRecoveryOptionInput {
  title: string;
  category: DynamicRecoveryOption['category'];
  supplier: string;
  route: string;
  destination: string;
  transportMode: TransportMode;
  quantityBarrels: number;
  etaDeltaHours: number;
  costUsd: number;
  operationalSummary: string;
}

export interface NewAuditEntryInput {
  event: string;
  details: string;
}

const OilShieldContext = createContext<OilShieldContextType | undefined>(undefined);

const DEFAULT_USER: UserProfile = {
  name: 'Vikram Malhotra',
  role: 'Supply Chain Operations Lead',
  department: 'Global Crude Logistics & Refineries',
  clearanceLevel: 'Executive Level 4',
  avatarInitials: 'VM',
};

export const OilShieldProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentView, setCurrentView] = useState<OilShieldView>('overview');
  const [operationalShipments, setOperationalShipments] = useState<OperationalShipment[]>(OPERATIONAL_SHIPMENTS);
  const [selectedShipmentId, setSelectedShipmentIdState] = useState<string>('SHP-1042');
  const [incidents, setIncidents] = useState<DisruptionIncident[]>(INITIAL_INCIDENTS);
  const [selectedIncidentId, setSelectedIncidentIdState] = useState<string>('OIL-1042');
  const [agents, setAgents] = useState<SpecializedAgent[]>(INITIAL_AGENTS);
  const [suppliers, setSuppliers] = useState<CrudeSupplier[]>(INITIAL_SUPPLIERS);
  const [logistics, setLogistics] = useState<LogisticsOption[]>(INITIAL_LOGISTICS);
  const [inventory, setInventory] = useState<InventoryFacility[]>(INITIAL_INVENTORY);
  const [scenarios, setScenarios] = useState<RecoveryScenario[]>(INITIAL_SCENARIOS);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('SCENARIO-D');

  // Operational Settings
  const [emergencySpendLimit, setEmergencySpendLimit] = useState<number>(100000);
  const [minCoverageDays, setMinCoverageDays] = useState<number>(3.0);
  const [agentConfidenceThreshold, setAgentConfidenceThreshold] = useState<number>(85);

  // Dynamic Recovery Options
  const [dynamicRecoveryOptions, setDynamicRecoveryOptions] = useState<DynamicRecoveryOption[]>(() =>
    generateDynamicRecoveryOptions('SHP-1042', 100000, 3.0)
  );
  const [selectedRecoveryOptionId, setSelectedRecoveryOptionId] = useState<string>('REC-OPT-01');

  const [complianceRules, setComplianceRules] = useState<ComplianceCheckRule[]>(INITIAL_COMPLIANCE_RULES);
  const [networkNodes, setNetworkNodes] = useState<SupplyChainNode[]>(INITIAL_NETWORK_NODES);
  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>(INITIAL_AUDIT_LOG);
  const [notifications, setNotifications] = useState<SystemNotification[]>(INITIAL_NOTIFICATIONS);
  const [currentTourStep, setCurrentTourStep] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_USER);

  const selectedShipment =
    operationalShipments.find((s) => s.id === selectedShipmentId) || operationalShipments[0];

  const selectedIncident =
    incidents.find((i) => i.id === selectedIncidentId) ||
    incidents.find((i) => i.id === selectedShipment.incidentId) ||
    incidents[0];

  const selectedRecoveryOption =
    dynamicRecoveryOptions.find((o) => o.id === selectedRecoveryOptionId) ||
    dynamicRecoveryOptions[0] || {
      id: 'REC-OPT-01',
      title: 'Default Maritime Diversion',
      category: 'Maritime Diversion' as const,
      supplier: 'Primary Supplier',
      route: 'Direct diversion',
      destination: 'Alternative Port',
      transportMode: 'SEA' as const,
      quantityBarrels: 20000,
      etaDeltaHours: 6.5,
      costUsd: 48000,
      costPerBbl: 2.4,
      feasibilityScore: 94,
      complianceStatus: 'COMPLIANT' as const,
      complianceChecks: [],
      inventoryImpact: 'Safe inventory coverage maintained',
      customerImpact: 'Normal offtake',
      operationalSummary: 'Standard recovery route',
      reasoning: [],
      constraintsChecked: [],
      humanApprovalStatus: 'AWAITING_APPROVAL' as const,
    };

  const setSelectedShipmentId = (id: string) => {
    setSelectedShipmentIdState(id);
    const ship = operationalShipments.find((s) => s.id === id);
    if (ship?.incidentId) {
      setSelectedIncidentIdState(ship.incidentId);
    }
    const generated = generateDynamicRecoveryOptions(id, emergencySpendLimit, minCoverageDays);
    setDynamicRecoveryOptions(generated);
    if (generated[0]) {
      setSelectedRecoveryOptionId(generated[0].id);
    }
  };

  const setSelectedIncidentId = (id: string) => {
    setSelectedIncidentIdState(id);
    const matchingShip = operationalShipments.find((s) => s.incidentId === id);
    if (matchingShip) {
      setSelectedShipmentIdState(matchingShip.id);
      const generated = generateDynamicRecoveryOptions(matchingShip.id, emergencySpendLimit, minCoverageDays);
      setDynamicRecoveryOptions(generated);
      if (generated[0]) {
        setSelectedRecoveryOptionId(generated[0].id);
      }
    }
  };

  const unreadNotificationCount = notifications.filter((n) => n.unread).length;

  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: false } : n))
    );
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  // Human Decision: Approve Scenario
  const approveScenario = (scenarioId: string, approverName: string, notes?: string) => {
    const target = scenarios.find((s) => s.id === scenarioId);
    if (!target) return;

    const now = new Date();
    const timeFormatted = now.toTimeString().split(' ')[0];
    const timestampStr = `${now.toISOString().split('T')[0]} ${timeFormatted} UTC`;
    const hash = `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`;

    // 1. Update Scenario
    setScenarios((prev) =>
      prev.map((s) =>
        s.id === scenarioId
          ? {
              ...s,
              humanApprovalStatus: 'APPROVED',
              approvedBy: approverName || userProfile.name,
              approvedAt: timestampStr,
              approvalNotes: notes || 'Authorized for immediate execution by Supply Chain Manager.',
            }
          : s
      )
    );

    // 2. Update Incident Status
    setIncidents((prev) =>
      prev.map((inc) =>
        inc.id === selectedIncidentId
          ? {
              ...inc,
              status: 'APPROVED_EXECUTING',
              estimatedDelayHours: target.estimatedDeliveryHours,
              berthDelayTrend: `Mitigated via ${target.name}. Recovery ETA: +${target.estimatedDeliveryHours}h`,
            }
          : inc
      )
    );

    // 3. Append to Audit Trail
    const newAuditEvent: AuditEvent = {
      id: `AUD-${Date.now().toString().slice(-4)}`,
      timestamp: timestampStr,
      timeFormatted,
      event: `Recovery Strategy Approved: ${target.name}`,
      actorType: 'HUMAN_OPERATOR',
      actorName: approverName || userProfile.name,
      actorRole: userProfile.role,
      incidentId: selectedIncidentId,
      status: 'CONFIRMED',
      details: `HUMAN DECISION AUTHORIZED: Executing ${target.name} for ${target.quantityRecoveredBarrels.toLocaleString()} barrels. Total approved spend: $${target.totalEstimatedCostUsd.toLocaleString()}. Notes: ${notes || 'Formal human authorization granted.'}`,
      verificationHash: hash,
    };

    setAuditLogs((prev) => [...prev, newAuditEvent]);

    // 4. Create Notification
    const newNotif: SystemNotification = {
      id: `notif-${Date.now()}`,
      timestamp: timeFormatted,
      severity: 'SUCCESS',
      title: `${target.code} Approved & Dispatched`,
      message: `Operator ${approverName || userProfile.name} authorized recovery plan. ERP work orders generated.`,
      incidentId: selectedIncidentId,
      unread: true,
      targetView: 'audit',
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  // Human Decision: Reject Scenario
  const rejectScenario = (scenarioId: string, reason: string, notes?: string) => {
    const target = scenarios.find((s) => s.id === scenarioId);
    if (!target) return;

    const now = new Date();
    const timeFormatted = now.toTimeString().split(' ')[0];
    const timestampStr = `${now.toISOString().split('T')[0]} ${timeFormatted} UTC`;
    const hash = `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`;

    setScenarios((prev) =>
      prev.map((s) =>
        s.id === scenarioId
          ? {
              ...s,
              humanApprovalStatus: 'REJECTED',
              rejectionReason: `${reason}: ${notes || 'No further notes provided.'}`,
            }
          : s
      )
    );

    const newAuditEvent: AuditEvent = {
      id: `AUD-${Date.now().toString().slice(-4)}`,
      timestamp: timestampStr,
      timeFormatted,
      event: `Recovery Plan Rejected: ${target.name}`,
      actorType: 'HUMAN_OPERATOR',
      actorName: userProfile.name,
      actorRole: userProfile.role,
      incidentId: selectedIncidentId,
      status: 'FLAGGED',
      details: `HUMAN REJECTION: Operator declined ${target.name}. Reason: ${reason}. Additional remarks: ${notes || 'N/A'}. Requiring alternative scenario review.`,
      verificationHash: hash,
    };

    setAuditLogs((prev) => [...prev, newAuditEvent]);

    const newNotif: SystemNotification = {
      id: `notif-${Date.now()}`,
      timestamp: timeFormatted,
      severity: 'WARNING',
      title: `${target.code} Rejected by Operator`,
      message: `Reason: ${reason}. System awaiting selection of another viable scenario.`,
      incidentId: selectedIncidentId,
      unread: true,
      targetView: 'decisions',
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  // Human Decision: Modify Plan
  const modifyScenario = (scenarioId: string, updates: Partial<RecoveryScenario>, notes: string) => {
    const target = scenarios.find((s) => s.id === scenarioId);
    if (!target) return;

    const now = new Date();
    const timeFormatted = now.toTimeString().split(' ')[0];
    const timestampStr = `${now.toISOString().split('T')[0]} ${timeFormatted} UTC`;
    const hash = `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`;

    setScenarios((prev) =>
      prev.map((s) =>
        s.id === scenarioId
          ? {
              ...s,
              ...updates,
              humanApprovalStatus: 'MODIFIED_APPROVED',
              approvedBy: userProfile.name,
              approvedAt: timestampStr,
              approvalNotes: `MODIFIED BY HUMAN: ${notes}`,
            }
          : s
      )
    );

    // Update Incident
    setIncidents((prev) =>
      prev.map((inc) =>
        inc.id === selectedIncidentId
          ? {
              ...inc,
              status: 'APPROVED_EXECUTING',
              estimatedDelayHours: updates.estimatedDeliveryHours || target.estimatedDeliveryHours,
              berthDelayTrend: `Mitigated with modified ${target.name}.`,
            }
          : inc
      )
    );

    const newAuditEvent: AuditEvent = {
      id: `AUD-${Date.now().toString().slice(-4)}`,
      timestamp: timestampStr,
      timeFormatted,
      event: `Plan Modified & Approved: ${target.name}`,
      actorType: 'HUMAN_OPERATOR',
      actorName: userProfile.name,
      actorRole: userProfile.role,
      incidentId: selectedIncidentId,
      status: 'CONFIRMED',
      details: `OPERATOR MODIFICATION: Parameters adjusted by human supervisor. Notes: ${notes}. Plan authorized with custom specifications.`,
      verificationHash: hash,
    };

    setAuditLogs((prev) => [...prev, newAuditEvent]);

    const newNotif: SystemNotification = {
      id: `notif-${Date.now()}`,
      timestamp: timeFormatted,
      severity: 'SUCCESS',
      title: `${target.code} Modified & Approved`,
      message: `Custom parameters applied by ${userProfile.name}. SAP orders scheduled.`,
      incidentId: selectedIncidentId,
      unread: true,
      targetView: 'audit',
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  // Request More Analysis
  const requestScenarioAnalysis = (scenarioId: string, queryNotes: string) => {
    const target = scenarios.find((s) => s.id === scenarioId);
    if (!target) return;

    const now = new Date();
    const timeFormatted = now.toTimeString().split(' ')[0];
    const timestampStr = `${now.toISOString().split('T')[0]} ${timeFormatted} UTC`;
    const hash = `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`;

    setScenarios((prev) =>
      prev.map((s) =>
        s.id === scenarioId
          ? {
              ...s,
              humanApprovalStatus: 'ANALYSIS_REQUESTED',
            }
          : s
      )
    );

    const newAuditEvent: AuditEvent = {
      id: `AUD-${Date.now().toString().slice(-4)}`,
      timestamp: timestampStr,
      timeFormatted,
      event: `Deep-Dive Analysis Requested: ${target.name}`,
      actorType: 'HUMAN_OPERATOR',
      actorName: userProfile.name,
      actorRole: userProfile.role,
      incidentId: selectedIncidentId,
      status: 'INFO',
      details: `ADDITIONAL ANALYSIS REQUEST: Operator queried: "${queryNotes}". Dispatched high-priority request to Logistics Agent and Scenario Planning Agent.`,
      verificationHash: hash,
    };

    setAuditLogs((prev) => [...prev, newAuditEvent]);

    const newNotif: SystemNotification = {
      id: `notif-${Date.now()}`,
      timestamp: timeFormatted,
      severity: 'INFO',
      title: `Analysis Dispatched for ${target.code}`,
      message: `Agents re-evaluating route capacity and secondary port tariffs based on operator query.`,
      incidentId: selectedIncidentId,
      unread: true,
      targetView: 'agents',
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  // Escalate
  const escalateScenario = (scenarioId: string, notes: string) => {
    const target = scenarios.find((s) => s.id === scenarioId);
    if (!target) return;

    const now = new Date();
    const timeFormatted = now.toTimeString().split(' ')[0];
    const timestampStr = `${now.toISOString().split('T')[0]} ${timeFormatted} UTC`;
    const hash = `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`;

    setScenarios((prev) =>
      prev.map((s) =>
        s.id === scenarioId
          ? {
              ...s,
              humanApprovalStatus: 'ESCALATED',
            }
          : s
      )
    );

    const newAuditEvent: AuditEvent = {
      id: `AUD-${Date.now().toString().slice(-4)}`,
      timestamp: timestampStr,
      timeFormatted,
      event: `Incident Escalated to Executive Committee`,
      actorType: 'HUMAN_OPERATOR',
      actorName: userProfile.name,
      actorRole: userProfile.role,
      incidentId: selectedIncidentId,
      status: 'WARNING',
      details: `ESCALATION: Plan ${target.name} escalated to VP Global Supply Chain & Executive Committee. Escalation Note: ${notes}`,
      verificationHash: hash,
    };

    setAuditLogs((prev) => [...prev, newAuditEvent]);

    const newNotif: SystemNotification = {
      id: `notif-${Date.now()}`,
      timestamp: timeFormatted,
      severity: 'WARNING',
      title: `Incident ${selectedIncidentId} Escalated`,
      message: `Notification transmitted to Executive Operations Board for crisis management briefing.`,
      incidentId: selectedIncidentId,
      unread: true,
      targetView: 'decisions',
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  // Hackathon Demo Tour Step Navigation
  const goToTourStep = (stepNumber: number) => {
    if (stepNumber < 1 || stepNumber > HACKATHON_DEMO_STEPS.length) return;
    setCurrentTourStep(stepNumber);
    const targetStep = HACKATHON_DEMO_STEPS[stepNumber - 1];
    if (targetStep) {
      setCurrentView(targetStep.view);
    }
  };

  const goToNextTourStep = () => {
    if (currentTourStep < HACKATHON_DEMO_STEPS.length) {
      goToTourStep(currentTourStep + 1);
    }
  };

  const goToPrevTourStep = () => {
    if (currentTourStep > 1) {
      goToTourStep(currentTourStep - 1);
    }
  };

  // Human Decision: Approve Dynamic Recovery Option
  const approveRecoveryOption = (optionId: string, approverName: string, notes?: string) => {
    const target = dynamicRecoveryOptions.find((o) => o.id === optionId);
    if (!target) return;

    const now = new Date();
    const timeFormatted = now.toTimeString().split(' ')[0];
    const timestampStr = `${now.toISOString().split('T')[0]} ${timeFormatted} UTC`;
    const hash = `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`;

    // 1. Update Dynamic Options
    setDynamicRecoveryOptions((prev) =>
      prev.map((o) =>
        o.id === optionId
          ? {
              ...o,
              humanApprovalStatus: 'APPROVED',
              approvedBy: approverName || userProfile.name,
              approvedAt: timestampStr,
              approvalNotes: notes || 'Authorized for immediate operational execution by Supply Chain Lead.',
            }
          : o
      )
    );

    // 2. Update Shipment
    setOperationalShipments((prev) =>
      prev.map((s) =>
        s.id === selectedShipmentId
          ? {
              ...s,
              status: 'APPROVED_EXECUTING',
              eta: `Executing: ${target.title} (+${target.etaDeltaHours}h)`,
            }
          : s
      )
    );

    // 3. Update Incident if linked
    if (selectedShipment.incidentId) {
      setIncidents((prev) =>
        prev.map((inc) =>
          inc.id === selectedShipment.incidentId
            ? {
                ...inc,
                status: 'APPROVED_EXECUTING',
                estimatedDelayHours: target.etaDeltaHours,
                berthDelayTrend: `Mitigated via ${target.title}. Recovery ETA: +${target.etaDeltaHours}h`,
              }
            : inc
        )
      );
    }

    // 4. Append to Audit Trail
    const newAuditEvent: AuditEvent = {
      id: `AUD-${Date.now().toString().slice(-4)}`,
      timestamp: timestampStr,
      timeFormatted,
      event: `Recovery Option Authorized: ${target.title}`,
      actorType: 'HUMAN_OPERATOR',
      actorName: approverName || userProfile.name,
      actorRole: userProfile.role,
      incidentId: selectedShipment.incidentId || selectedShipment.id,
      status: 'CONFIRMED',
      details: `HUMAN OPERATOR AUTHORIZATION: Executing ${target.title} for ${target.quantityBarrels.toLocaleString()} bbl. Approved spend: $${target.costUsd.toLocaleString()} ($${target.costPerBbl.toFixed(2)}/bbl). Strategy: ${target.operationalSummary}. Notes: ${notes || 'Formal human approval confirmed.'}`,
      verificationHash: hash,
    };
    setAuditLogs((prev) => [...prev, newAuditEvent]);

    // 5. System Notification
    const newNotif: SystemNotification = {
      id: `notif-${Date.now()}`,
      timestamp: timeFormatted,
      severity: 'SUCCESS',
      title: `${target.title} Approved & Dispatched`,
      message: `Operator ${approverName || userProfile.name} authorized recovery plan for ${selectedShipment.id}. Work orders dispatched.`,
      incidentId: selectedShipment.incidentId,
      unread: true,
      targetView: 'audit',
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  // Human Decision: Reject Dynamic Recovery Option
  const rejectRecoveryOption = (optionId: string, reason: string, notes?: string) => {
    const target = dynamicRecoveryOptions.find((o) => o.id === optionId);
    if (!target) return;

    const now = new Date();
    const timeFormatted = now.toTimeString().split(' ')[0];
    const timestampStr = `${now.toISOString().split('T')[0]} ${timeFormatted} UTC`;
    const hash = `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`;

    setDynamicRecoveryOptions((prev) =>
      prev.map((o) =>
        o.id === optionId
          ? {
              ...o,
              humanApprovalStatus: 'REJECTED',
              rejectionReason: `${reason}: ${notes || 'No further notes provided.'}`,
            }
          : o
      )
    );

    const newAuditEvent: AuditEvent = {
      id: `AUD-${Date.now().toString().slice(-4)}`,
      timestamp: timestampStr,
      timeFormatted,
      event: `Recovery Option Rejected: ${target.title}`,
      actorType: 'HUMAN_OPERATOR',
      actorName: userProfile.name,
      actorRole: userProfile.role,
      incidentId: selectedShipment.incidentId || selectedShipment.id,
      status: 'FLAGGED',
      details: `HUMAN REJECTION: Operator declined ${target.title}. Reason: ${reason}. Notes: ${notes || 'N/A'}. Awaiting alternative recovery selection.`,
      verificationHash: hash,
    };
    setAuditLogs((prev) => [...prev, newAuditEvent]);

    const newNotif: SystemNotification = {
      id: `notif-${Date.now()}`,
      timestamp: timeFormatted,
      severity: 'WARNING',
      title: `${target.title} Rejected`,
      message: `Reason: ${reason}. Awaiting selection of alternative option.`,
      incidentId: selectedShipment.incidentId,
      unread: true,
      targetView: 'decisions',
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  // Human Decision: Modify Dynamic Recovery Option
  const modifyRecoveryOption = (
    optionId: string,
    updates: Partial<DynamicRecoveryOption>,
    notes: string
  ) => {
    const target = dynamicRecoveryOptions.find((o) => o.id === optionId);
    if (!target) return;

    const now = new Date();
    const timeFormatted = now.toTimeString().split(' ')[0];
    const timestampStr = `${now.toISOString().split('T')[0]} ${timeFormatted} UTC`;
    const hash = `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`;

    setDynamicRecoveryOptions((prev) =>
      prev.map((o) =>
        o.id === optionId
          ? {
              ...o,
              ...updates,
              humanApprovalStatus: 'MODIFIED_APPROVED',
              approvedBy: userProfile.name,
              approvedAt: timestampStr,
              approvalNotes: `MODIFIED BY HUMAN: ${notes}`,
            }
          : o
      )
    );

    setOperationalShipments((prev) =>
      prev.map((s) =>
        s.id === selectedShipmentId
          ? {
              ...s,
              status: 'APPROVED_EXECUTING',
              eta: `Executing modified: ${target.title}`,
            }
          : s
      )
    );

    const newAuditEvent: AuditEvent = {
      id: `AUD-${Date.now().toString().slice(-4)}`,
      timestamp: timestampStr,
      timeFormatted,
      event: `Plan Modified & Approved: ${target.title}`,
      actorType: 'HUMAN_OPERATOR',
      actorName: userProfile.name,
      actorRole: userProfile.role,
      incidentId: selectedShipment.incidentId || selectedShipment.id,
      status: 'CONFIRMED',
      details: `OPERATOR MODIFICATION: Parameters customized by human lead. Notes: ${notes}. Plan authorized with custom specifications.`,
      verificationHash: hash,
    };
    setAuditLogs((prev) => [...prev, newAuditEvent]);

    const newNotif: SystemNotification = {
      id: `notif-${Date.now()}`,
      timestamp: timeFormatted,
      severity: 'SUCCESS',
      title: `${target.title} Modified & Approved`,
      message: `Custom parameters applied by ${userProfile.name}. Execution scheduled.`,
      incidentId: selectedShipment.incidentId,
      unread: true,
      targetView: 'audit',
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  // Create: register a new operational shipment
  const addShipment = (input: NewShipmentInput) => {
    const now = new Date();
    const timeFormatted = now.toTimeString().split(' ')[0];
    const timestampStr = `${now.toISOString().split('T')[0]} ${timeFormatted} UTC`;
    const hash = `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`;
    const id = `SHP-${Date.now().toString().slice(-4)}`;
    const delayHours = input.delayHours ?? 0;

    const newShipment: OperationalShipment = {
      id,
      vesselName: input.vesselName,
      cargo: input.cargo,
      quantityBarrels: input.quantityBarrels,
      origin: input.origin,
      destination: input.destination,
      supplier: input.supplier,
      status: delayHours > 0 ? 'ACTIVE_ANALYZING' : 'IN_TRANSIT',
      eta: input.eta,
      delayHours,
    };
    setOperationalShipments((prev) => [...prev, newShipment]);

    setAuditLogs((prev) => [
      ...prev,
      {
        id: `AUD-${Date.now().toString().slice(-4)}`,
        timestamp: timestampStr,
        timeFormatted,
        event: `Shipment Registered: ${input.vesselName} (${id})`,
        actorType: 'HUMAN_OPERATOR',
        actorName: userProfile.name,
        actorRole: userProfile.role,
        incidentId: id,
        status: 'INFO',
        details: `New shipment logged manually by ${userProfile.name}: ${input.quantityBarrels.toLocaleString()} bbl ${input.cargo} from ${input.origin} to ${input.destination}, supplier ${input.supplier}. ETA ${input.eta}.`,
        verificationHash: hash,
      },
    ]);

    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        timestamp: timeFormatted,
        severity: 'INFO',
        title: `${id} Added to Fleet`,
        message: `${input.vesselName} registered by ${userProfile.name}.`,
        incidentId: id,
        unread: true,
        targetView: 'overview',
      },
      ...prev,
    ]);
  };

  // Create: log a new disruption incident, optionally linking it to an existing shipment
  const logDisruption = (input: NewIncidentInput) => {
    const now = new Date();
    const timeFormatted = now.toTimeString().split(' ')[0];
    const timestampStr = `${now.toISOString().split('T')[0]} ${timeFormatted} UTC`;
    const hash = `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`;
    const id = `OIL-${Date.now().toString().slice(-4)}`;
    const linkedShipment = input.linkedShipmentId
      ? operationalShipments.find((s) => s.id === input.linkedShipmentId)
      : undefined;

    const newIncident: DisruptionIncident = {
      id,
      title: input.title,
      type: input.type,
      location: input.location,
      coordinates: [0, 0],
      affectedShipment: linkedShipment ? `${linkedShipment.id}: ${input.vesselName}` : input.vesselName,
      vesselName: input.vesselName,
      product: input.product,
      quantityBarrels: input.quantityBarrels,
      severity: input.severity,
      estimatedDelayHours: input.estimatedDelayHours,
      affectedRefinery: input.affectedRefinery,
      affectedCustomer: input.affectedCustomer,
      detectionTime: timestampStr,
      status: 'ACTIVE_ANALYZING',
      estimatedExposureValueUsd: Math.round(input.quantityBarrels * 70),
      rootCause: input.rootCause,
      berthDelayTrend: 'Newly logged — awaiting recovery analysis.',
      affectedShipmentCount: linkedShipment ? 1 : 0,
      totalNetworkExposureBarrels: input.quantityBarrels,
    };
    setIncidents((prev) => [...prev, newIncident]);
    setSelectedIncidentIdState(id);

    if (linkedShipment) {
      setOperationalShipments((prev) =>
        prev.map((s) =>
          s.id === linkedShipment.id
            ? {
                ...s,
                incidentId: id,
                isEmergency: true,
                status: 'EMERGENCY_DISRUPTED',
                delayHours: input.estimatedDelayHours,
                disruptionSummary: input.rootCause,
              }
            : s
        )
      );
      setSelectedShipmentIdState(linkedShipment.id);
      const generated = generateDynamicRecoveryOptions(linkedShipment.id, emergencySpendLimit, minCoverageDays);
      setDynamicRecoveryOptions(generated);
      if (generated[0]) setSelectedRecoveryOptionId(generated[0].id);
    }

    setAuditLogs((prev) => [
      ...prev,
      {
        id: `AUD-${Date.now().toString().slice(-4)}`,
        timestamp: timestampStr,
        timeFormatted,
        event: `Disruption Logged: ${input.title} (${id})`,
        actorType: 'HUMAN_OPERATOR',
        actorName: userProfile.name,
        actorRole: userProfile.role,
        incidentId: id,
        status: input.severity === 'CRITICAL' || input.severity === 'HIGH' ? 'WARNING' : 'INFO',
        details: `New disruption logged manually by ${userProfile.name} at ${input.location}: ${input.type}. Root cause: ${input.rootCause}. Est. delay +${input.estimatedDelayHours}h.`,
        verificationHash: hash,
      },
    ]);

    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        timestamp: timeFormatted,
        severity: input.severity === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
        title: `${id} Logged: ${input.title}`,
        message: `Reported by ${userProfile.name} at ${input.location}. Awaiting agent analysis.`,
        incidentId: id,
        unread: true,
        targetView: 'overview',
      },
      ...prev,
    ]);
  };

  // Create: add a supply-network node
  const addNetworkNode = (input: NewNetworkNodeInput) => {
    const now = new Date();
    const timeFormatted = now.toTimeString().split(' ')[0];
    const timestampStr = `${now.toISOString().split('T')[0]} ${timeFormatted} UTC`;
    const hash = `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`;
    const id = `NODE-${Date.now().toString().slice(-4)}`;

    const newNode: SupplyChainNode = {
      id,
      name: input.name,
      tier: input.tier,
      location: input.location,
      status: 'NORMAL',
      throughputBarrelsPerDay: input.throughputBarrelsPerDay,
      currentCapacityPct: input.currentCapacityPct,
      productHandling: input.productHandling,
      incidentAffected: false,
      notes: input.notes ?? '',
      connectedTo: input.connectedTo ?? [],
    };
    setNetworkNodes((prev) => [...prev, newNode]);

    setAuditLogs((prev) => [
      ...prev,
      {
        id: `AUD-${Date.now().toString().slice(-4)}`,
        timestamp: timestampStr,
        timeFormatted,
        event: `Network Node Added: ${input.name} (${id})`,
        actorType: 'HUMAN_OPERATOR',
        actorName: userProfile.name,
        actorRole: userProfile.role,
        incidentId: id,
        status: 'INFO',
        details: `${input.tier} node "${input.name}" added to the supply network at ${input.location} by ${userProfile.name}.`,
        verificationHash: hash,
      },
    ]);
  };

  // Create: onboard a new crude supplier
  const addSupplier = (input: NewSupplierInput) => {
    const now = new Date();
    const timeFormatted = now.toTimeString().split(' ')[0];
    const timestampStr = `${now.toISOString().split('T')[0]} ${timeFormatted} UTC`;
    const hash = `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`;
    const id = `SUP-${Date.now().toString().slice(-4)}`;

    const newSupplier: CrudeSupplier = {
      id,
      name: input.name,
      location: input.location,
      country: input.country,
      crudeGrade: input.crudeGrade,
      apiGravity: input.apiGravity,
      sulfurContentPct: input.sulfurContentPct,
      availableQuantityBarrels: input.availableQuantityBarrels,
      leadTimeHours: input.leadTimeHours,
      reliabilityScorePct: input.reliabilityScorePct,
      approvalStatus: 'PENDING_REVIEW',
      estimatedCostPerBbl: input.estimatedCostPerBbl,
      compatibilityPct: input.compatibilityPct,
      portAccess: input.portAccess,
      contractType: input.contractType,
      complianceNotes: input.complianceNotes,
      actionAvailable: true,
    };
    setSuppliers((prev) => [...prev, newSupplier]);

    setAuditLogs((prev) => [
      ...prev,
      {
        id: `AUD-${Date.now().toString().slice(-4)}`,
        timestamp: timestampStr,
        timeFormatted,
        event: `Supplier Onboarded: ${input.name} (${id})`,
        actorType: 'HUMAN_OPERATOR',
        actorName: userProfile.name,
        actorRole: userProfile.role,
        incidentId: id,
        status: 'INFO',
        details: `Supplier "${input.name}" (${input.crudeGrade}, ${input.country}) added by ${userProfile.name}. Pending compliance review before approval.`,
        verificationHash: hash,
      },
    ]);
  };

  // Create: add a logistics/route option
  const addLogisticsOption = (input: NewLogisticsOptionInput) => {
    const now = new Date();
    const timeFormatted = now.toTimeString().split(' ')[0];
    const timestampStr = `${now.toISOString().split('T')[0]} ${timeFormatted} UTC`;
    const hash = `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`;
    const id = `LOG-${Date.now().toString().slice(-4)}`;

    const newOption: LogisticsOption = {
      id,
      name: input.name,
      origin: input.origin,
      destination: input.destination,
      currentRoute: input.currentRoute,
      alternativeRoute: input.alternativeRoute,
      transportMode: input.transportMode,
      estimatedTravelHours: input.estimatedTravelHours,
      transportCostPerBbl: input.transportCostPerBbl,
      totalCostUsd: Math.round(input.transportCostPerBbl * input.availableCapacityBarrels),
      availableCapacityBarrels: input.availableCapacityBarrels,
      routeRisk: input.routeRisk,
      delayEstimateHours: 0,
      status: 'AVAILABLE',
      connectivityVerified: true,
      infrastructureNotes: input.infrastructureNotes,
      carbonIntensityKgPerBbl: 0,
    };
    setLogistics((prev) => [...prev, newOption]);

    setAuditLogs((prev) => [
      ...prev,
      {
        id: `AUD-${Date.now().toString().slice(-4)}`,
        timestamp: timestampStr,
        timeFormatted,
        event: `Logistics Option Added: ${input.name} (${id})`,
        actorType: 'HUMAN_OPERATOR',
        actorName: userProfile.name,
        actorRole: userProfile.role,
        incidentId: id,
        status: 'INFO',
        details: `${input.transportMode} route "${input.name}" (${input.origin} → ${input.destination}) added by ${userProfile.name}.`,
        verificationHash: hash,
      },
    ]);
  };

  // Create: propose a new recovery option for human review
  const proposeRecoveryOption = (input: NewRecoveryOptionInput) => {
    const now = new Date();
    const timeFormatted = now.toTimeString().split(' ')[0];
    const timestampStr = `${now.toISOString().split('T')[0]} ${timeFormatted} UTC`;
    const hash = `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`;
    const id = `REC-OPT-${Date.now().toString().slice(-4)}`;

    const newOption: DynamicRecoveryOption = {
      id,
      title: input.title,
      category: input.category,
      supplier: input.supplier,
      route: input.route,
      destination: input.destination,
      transportMode: input.transportMode,
      quantityBarrels: input.quantityBarrels,
      etaDeltaHours: input.etaDeltaHours,
      costUsd: input.costUsd,
      costPerBbl: input.quantityBarrels > 0 ? input.costUsd / input.quantityBarrels : 0,
      feasibilityScore: 75,
      complianceStatus: 'REQUIRES_REVIEW',
      complianceChecks: [],
      inventoryImpact: 'Pending assessment',
      customerImpact: 'Pending assessment',
      operationalSummary: input.operationalSummary,
      reasoning: [`Manually proposed by ${userProfile.name} — pending agent analysis.`],
      constraintsChecked: [],
      humanApprovalStatus: 'AWAITING_APPROVAL',
    };
    setDynamicRecoveryOptions((prev) => [...prev, newOption]);
    setSelectedRecoveryOptionId(id);

    setAuditLogs((prev) => [
      ...prev,
      {
        id: `AUD-${Date.now().toString().slice(-4)}`,
        timestamp: timestampStr,
        timeFormatted,
        event: `Recovery Option Proposed: ${input.title} (${id})`,
        actorType: 'HUMAN_OPERATOR',
        actorName: userProfile.name,
        actorRole: userProfile.role,
        incidentId: selectedIncidentId,
        status: 'INFO',
        details: `${input.category} option "${input.title}" proposed manually by ${userProfile.name}: ${input.quantityBarrels.toLocaleString()} bbl via ${input.route}, est. cost $${input.costUsd.toLocaleString()}. Awaiting review.`,
        verificationHash: hash,
      },
    ]);

    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        timestamp: timeFormatted,
        severity: 'INFO',
        title: `${input.title} Proposed`,
        message: `${userProfile.name} proposed a new recovery option, ready for review.`,
        incidentId: selectedIncidentId,
        unread: true,
        targetView: 'decisions',
      },
      ...prev,
    ]);
  };

  // Create: append a free-text manual audit entry (e.g. a phone call or external coordination note)
  const addManualAuditEntry = (input: NewAuditEntryInput) => {
    const now = new Date();
    const timeFormatted = now.toTimeString().split(' ')[0];
    const timestampStr = `${now.toISOString().split('T')[0]} ${timeFormatted} UTC`;
    const hash = `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`;

    setAuditLogs((prev) => [
      ...prev,
      {
        id: `AUD-${Date.now().toString().slice(-4)}`,
        timestamp: timestampStr,
        timeFormatted,
        event: input.event,
        actorType: 'HUMAN_OPERATOR',
        actorName: userProfile.name,
        actorRole: userProfile.role,
        incidentId: selectedIncidentId,
        status: 'INFO',
        details: input.details,
        verificationHash: hash,
      },
    ]);
  };

  // Automation: run the AI recovery-planning pipeline for an emergency shipment and hand the result to Approvals & Decisions
  const triggerAutomation = (shipmentId: string) => {
    const ship = operationalShipments.find((s) => s.id === shipmentId);
    if (!ship) return;

    const now = new Date();
    const timeFormatted = now.toTimeString().split(' ')[0];
    const timestampStr = `${now.toISOString().split('T')[0]} ${timeFormatted} UTC`;
    const hash = `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`;

    setSelectedShipmentIdState(shipmentId);
    if (ship.incidentId) setSelectedIncidentIdState(ship.incidentId);

    const generated = generateDynamicRecoveryOptions(shipmentId, emergencySpendLimit, minCoverageDays);
    setDynamicRecoveryOptions(generated);
    const topOption = generated[0];
    if (topOption) setSelectedRecoveryOptionId(topOption.id);

    setAuditLogs((prev) => [
      ...prev,
      {
        id: `AUD-${Date.now().toString().slice(-4)}`,
        timestamp: timestampStr,
        timeFormatted,
        event: `Automation Triggered: ${ship.id} (${ship.vesselName})`,
        actorType: 'AI_AGENT',
        actorName: 'ASTRA Orchestrator',
        actorRole: 'Multi-Agent Recovery Pipeline',
        incidentId: ship.incidentId || ship.id,
        status: 'COMPLETED',
        details: `Operator-triggered automation ran the full agent pipeline (Disruption, Supplier, Logistics, Inventory, Scenario, Compliance) for ${ship.id}. ${generated.length} recovery option(s) generated${
          topOption ? `, top recommendation: "${topOption.title}"` : ''
        }. Awaiting human approval.`,
        verificationHash: hash,
      },
    ]);

    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        timestamp: timeFormatted,
        severity: 'INFO',
        title: `Recovery Plan Ready: ${ship.id}`,
        message: `Automation completed for ${ship.vesselName}. ${topOption ? topOption.title : 'A recovery plan'} is awaiting your approval.`,
        incidentId: ship.incidentId,
        unread: true,
        targetView: 'decisions',
      },
      ...prev,
    ]);

    setCurrentView('decisions');
  };

  // Reset demo
  const resetAllData = () => {
    setIncidents(INITIAL_INCIDENTS);
    setSelectedIncidentIdState('OIL-1042');
    setSelectedShipmentIdState('SHP-1042');
    setOperationalShipments(OPERATIONAL_SHIPMENTS);
    setAgents(INITIAL_AGENTS);
    setSuppliers(INITIAL_SUPPLIERS);
    setLogistics(INITIAL_LOGISTICS);
    setInventory(INITIAL_INVENTORY);
    setScenarios(INITIAL_SCENARIOS);
    setSelectedScenarioId('SCENARIO-D');
    setEmergencySpendLimit(100000);
    setMinCoverageDays(3.0);
    setAgentConfidenceThreshold(85);
    const generated = generateDynamicRecoveryOptions('SHP-1042', 100000, 3.0);
    setDynamicRecoveryOptions(generated);
    if (generated[0]) setSelectedRecoveryOptionId(generated[0].id);
    setComplianceRules(INITIAL_COMPLIANCE_RULES);
    setNetworkNodes(INITIAL_NETWORK_NODES);
    setAuditLogs(INITIAL_AUDIT_LOG);
    setNotifications(INITIAL_NOTIFICATIONS);
    setCurrentTourStep(1);
    setCurrentView('overview');
    setUserProfile(DEFAULT_USER);
  };

  return (
    <OilShieldContext.Provider
      value={{
        currentView,
        setCurrentView,
        operationalShipments,
        selectedShipment,
        selectedShipmentId,
        setSelectedShipmentId,
        incidents,
        selectedIncident,
        setSelectedIncidentId,
        agents,
        suppliers,
        logistics,
        inventory,
        scenarios,
        selectedScenarioId,
        setSelectedScenarioId,
        dynamicRecoveryOptions,
        selectedRecoveryOptionId,
        setSelectedRecoveryOptionId,
        selectedRecoveryOption,
        emergencySpendLimit,
        setEmergencySpendLimit,
        minCoverageDays,
        setMinCoverageDays,
        agentConfidenceThreshold,
        setAgentConfidenceThreshold,
        complianceRules,
        networkNodes,
        auditLogs,
        notifications,
        unreadNotificationCount,
        markNotificationRead,
        markAllNotificationsRead,
        userProfile,
        currentTourStep,
        goToNextTourStep,
        goToPrevTourStep,
        goToTourStep,
        approveScenario,
        rejectScenario,
        modifyScenario,
        approveRecoveryOption,
        rejectRecoveryOption,
        modifyRecoveryOption,
        requestScenarioAnalysis,
        escalateScenario,
        resetAllData,
        searchQuery,
        setSearchQuery,
        addShipment,
        logDisruption,
        addNetworkNode,
        addSupplier,
        addLogisticsOption,
        proposeRecoveryOption,
        addManualAuditEntry,
        triggerAutomation,
        setUserProfile,
      }}
    >
      {children}
    </OilShieldContext.Provider>
  );
};

export const useOilShield = (): OilShieldContextType => {
  const context = useContext(OilShieldContext);
  if (!context) {
    throw new Error('useOilShield must be used within an OilShieldProvider');
  }
  return context;
};
