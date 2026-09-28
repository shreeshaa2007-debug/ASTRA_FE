/**
 * OilShield — Agentic AI Oil Supply Chain Control Tower
 * Global Application Context & State Management
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  OilShieldView,
  DisruptionIncident,
  SpecializedAgent,
  CrudeSupplier,
  LogisticsOption,
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

interface UserProfile {
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
  const userProfile = DEFAULT_USER;

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
