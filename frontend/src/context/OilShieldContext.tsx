/**
 * OilShield — Global Application Context & State Management
 *
 * Rewritten (docs/oilshield-frontend-integration-plan.md, Phase O3) to read the REAL backend
 * (docs/api-plan.md) through `SimulationProvider` + `adapters/oilshieldAdapter.ts`, instead of
 * the generated mock (`data/mockOilShieldData.ts`, no longer imported here except for the
 * hackathon tour-step navigation, which is real UI content, not fabricated business data).
 *
 * The exported shape (`OilShieldContextType`) is unchanged, so every view component copied
 * from the `optimized` branch keeps working without edits.
 */
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
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
import { HACKATHON_DEMO_STEPS } from '../data/mockOilShieldData';
import { SimulationProvider, useSimulation } from './SimulationContext';
import { useFetch } from '../hooks/useFetch';
import {
  ApiError,
  getCompliance,
  getDashboard,
  getDecision,
  getInventory,
  getRoutes,
  getScenarioComparison,
  getScenarios,
  getShipments,
  getSimulation,
  getSuppliers,
  listSimulations,
} from '../services/api';
import { ScenarioComparison } from '../types/api';
import {
  toAuditEvents,
  toComplianceCheckRules,
  toCrudeSupplier,
  toDisruptionIncident,
  toDynamicRecoveryOptions,
  toInventoryFacility,
  toLogisticsOption,
  toOperationalShipment,
  toRecoveryScenario,
  toSpecializedAgents,
  toSupplyChainNodes,
} from '../adapters/oilshieldAdapter';

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
  // Real-backend extras (not in the original mock context; additive, safe for existing views to ignore)
  isLoading: boolean;
  loadError: string | null;
  simulationId: string | null;
  isReportModalOpen: boolean;
  openReportModal: () => void;
  closeReportModal: () => void;
  // Groq's plain-English narration of the current compliance verdict (never decides it — see
  // backend/agents/compliance/llm.py). Null when GROQ_API_KEY isn't configured or the call failed.
  complianceRationale: string | null;
}

const OilShieldContext = createContext<OilShieldContextType | undefined>(undefined);

// This app has no sign-in yet (Phase 21 auth is off by default) — there is no real signed-in
// user to attribute actions to. Approvals type their own name in the approval dialog
// (`decided_by`, recorded by the real backend); this label is UI chrome only, never sent to
// the API as if it were an authenticated identity.
const DEFAULT_USER: UserProfile = {
  name: 'Operator',
  role: 'Supply Chain Operations',
  department: 'ResilientSC / OilShield',
  clearanceLevel: 'Local demo — no auth configured',
  avatarInitials: 'OP',
};

const EMPTY_SHIPMENT: OperationalShipment = {
  id: '', vesselName: '', cargo: '', quantityBarrels: NaN, origin: '', destination: '', supplier: '',
  status: 'ACTIVE_ANALYZING', eta: '', delayHours: NaN, disruptionSummary: 'Loading from the backend…',
};

const EMPTY_INCIDENT: DisruptionIncident = {
  id: '', title: 'No active disruption', type: '', location: '', coordinates: [0, 0], affectedShipment: '',
  vesselName: '', product: '', quantityBarrels: NaN, severity: 'LOW', estimatedDelayHours: NaN,
  affectedRefinery: '', affectedCustomer: '', detectionTime: '', status: 'RESOLVED', estimatedExposureValueUsd: NaN,
  rootCause: '', berthDelayTrend: '', affectedShipmentCount: NaN, totalNetworkExposureBarrels: NaN,
};

const EMPTY_RECOVERY_OPTION: DynamicRecoveryOption = {
  id: '', title: 'No plan available yet', category: 'Spot Tender', supplier: '', route: '', destination: '',
  transportMode: 'SEA', quantityBarrels: NaN, etaDeltaHours: NaN, costUsd: NaN, costPerBbl: NaN,
  feasibilityScore: 0, complianceStatus: 'REQUIRES_REVIEW', complianceChecks: [], inventoryImpact: '',
  customerImpact: '', operationalSummary: '', reasoning: [], constraintsChecked: [],
  humanApprovalStatus: 'AWAITING_APPROVAL',
};

function describeError(err: unknown): string {
  if (err instanceof ApiError) return err.recovery ? `${err.message} — ${err.recovery}` : err.message;
  return err instanceof Error ? err.message : String(err);
}

const OilShieldInner: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const sim = useSimulation();
  const { simulationId, status } = sim;

  const [currentView, setCurrentView] = useState<OilShieldView>('overview');
  const [selectedShipmentId, setSelectedShipmentId] = useState<string>('');
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>('');
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('');
  const [selectedRecoveryOptionId, setSelectedRecoveryOptionId] = useState<string>('');
  const [emergencySpendLimit, setEmergencySpendLimit] = useState<number>(500000); // matches backend/config/compliance_rules.yaml approval_threshold
  const [minCoverageDays, setMinCoverageDays] = useState<number>(3.0); // demo-only knob — no backend counterpart (integration plan §4)
  const [agentConfidenceThreshold, setAgentConfidenceThreshold] = useState<number>(85); // demo-only knob — no backend counterpart
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [currentTourStep, setCurrentTourStep] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const userProfile = DEFAULT_USER;

  // Bootstrap: reuse the most recently finalized real simulation if one already exists in this
  // backend (so reopening the app doesn't lose a finished run), but never auto-run a canned
  // scenario on load. A presenter reports a disruption themselves (openReportModal below) —
  // the app should never look like "only simulation mode" by starting one on its own.
  useEffect(() => {
    if (simulationId) return;
    let cancelled = false;
    (async () => {
      try {
        const found = await listSimulations('COMPLETED', 1);
        if (!cancelled && found.length > 0) sim.switchTo(found[0].simulation_id);
      } catch {
        // nothing to reuse yet — that's fine, the app shows its empty state
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulationId]);

  const optimizationStage = status?.agents.find((a) => a.id === 'optimization')?.status;
  const planReady = optimizationStage === 'COMPLETE' || optimizationStage === 'FAILED';
  const complianceStage = status?.agents.find((a) => a.id === 'compliance')?.status;
  const complianceReady = complianceStage === 'COMPLETE';

  const dashboardQ = useFetch(() => getDashboard(), [simulationId], true, [status?.version]);
  const simStateQ = useFetch(() => getSimulation(simulationId!), [simulationId], !!simulationId, [status?.version]);
  const suppliersQ = useFetch(() => getSuppliers(simulationId ?? undefined), [simulationId], !!simulationId, [status?.version]);
  const routesQ = useFetch(() => getRoutes(simulationId ?? undefined), [simulationId], !!simulationId, [status?.version]);
  const inventoryQ = useFetch(() => getInventory(simulationId ?? undefined), [simulationId], !!simulationId, [status?.version]);
  const shipmentsQ = useFetch(() => getShipments(simulationId ?? undefined), [simulationId], !!simulationId, [status?.version]);
  const decisionQ = useFetch(() => getDecision(simulationId!), [simulationId], !!simulationId && planReady, [status?.version]);
  const complianceQ = useFetch(() => getCompliance(simulationId!), [simulationId], !!simulationId && complianceReady, [status?.version]);
  const scenariosQ = useFetch(() => getScenarios(), [], true);

  const productId = decisionQ.data?.product_id;
  const comparisonsQ = useFetch(
    async () => {
      const rows = scenariosQ.data ?? [];
      const modeled = rows.filter((r) => r.modeled);
      const results = await Promise.all(
        modeled.map((r) => getScenarioComparison(r.scenario_id, productId ?? r.default_product_id).catch(() => null))
      );
      const map: Record<string, ScenarioComparison | null> = {};
      modeled.forEach((r, i) => {
        map[r.scenario_id] = results[i];
      });
      return map;
    },
    [scenariosQ.data?.length ?? 0, productId ?? ''],
    !!scenariosQ.data
  );

  // ---- derived, oil-relabeled data (adapters/oilshieldAdapter.ts) ----
  const activeEvent = simStateQ.data?.current_disruptions?.[0] ?? decisionQ.data?.disruptions?.[0] ?? null;
  const incident = useMemo(() => toDisruptionIncident(dashboardQ.data, status, activeEvent), [dashboardQ.data, status, activeEvent]);
  const incidents = useMemo(() => (incident ? [incident] : []), [incident]);

  const operationalShipments = useMemo(
    () => (shipmentsQ.data?.shipments ?? []).map((s) => toOperationalShipment(s, incident?.id ?? null, status?.status ?? 'CREATED')),
    [shipmentsQ.data, incident, status?.status]
  );

  const agents = useMemo(() => (status ? toSpecializedAgents(status, decisionQ.data) : []), [status, decisionQ.data]);
  const suppliers = useMemo(() => (suppliersQ.data?.suppliers ?? []).map(toCrudeSupplier), [suppliersQ.data]);
  const logistics = useMemo(() => (routesQ.data?.routes ?? []).map(toLogisticsOption), [routesQ.data]);
  const inventory = useMemo(() => (inventoryQ.data?.inventory ?? []).map(toInventoryFacility), [inventoryQ.data]);
  const complianceRules = useMemo(() => toComplianceCheckRules(complianceQ.data), [complianceQ.data]);
  const complianceRationale = complianceQ.data?.compliance.rationale ?? null;
  const networkNodes = useMemo(
    () => toSupplyChainNodes(suppliersQ.data?.suppliers ?? [], routesQ.data?.routes ?? [], inventoryQ.data?.inventory ?? []),
    [suppliersQ.data, routesQ.data, inventoryQ.data]
  );
  const auditLogs = useMemo(() => (status ? toAuditEvents(status.timeline) : []), [status]);

  const scenarios = useMemo(() => {
    const rows = scenariosQ.data ?? [];
    return rows.map((row, i) => toRecoveryScenario(row, comparisonsQ.data?.[row.scenario_id] ?? null, i + 1));
  }, [scenariosQ.data, comparisonsQ.data]);

  const dynamicRecoveryOptions = useMemo(() => toDynamicRecoveryOptions(decisionQ.data), [decisionQ.data]);

  // ---- keep the selected-* ids pointed at something real once data arrives ----
  useEffect(() => {
    if (!selectedIncidentId && incidents[0]) setSelectedIncidentId(incidents[0].id);
  }, [incidents, selectedIncidentId]);
  useEffect(() => {
    if (operationalShipments.length && !operationalShipments.some((s) => s.id === selectedShipmentId)) {
      setSelectedShipmentId(operationalShipments[0].id);
    }
  }, [operationalShipments, selectedShipmentId]);
  useEffect(() => {
    if (scenarios.length && !scenarios.some((s) => s.id === selectedScenarioId)) {
      setSelectedScenarioId(scenarios[0].id);
    }
  }, [scenarios, selectedScenarioId]);
  useEffect(() => {
    if (dynamicRecoveryOptions.length && !dynamicRecoveryOptions.some((o) => o.id === selectedRecoveryOptionId)) {
      setSelectedRecoveryOptionId(dynamicRecoveryOptions[0].id);
    }
  }, [dynamicRecoveryOptions, selectedRecoveryOptionId]);

  // ---- notifications: synthesized from real status transitions, not a fake feed ----
  const lastNotifiedVersion = React.useRef<number | null>(null);
  useEffect(() => {
    if (!status || status.version === lastNotifiedVersion.current) return;
    lastNotifiedVersion.current = status.version;
    const last = status.timeline[status.timeline.length - 1];
    if (!last) return;
    let entry: SystemNotification | null = null;
    if (last.checkpoint === 'compliance_checked') {
      const verdict = decisionQ.data?.compliance?.status ?? complianceQ.data?.compliance.status;
      entry = {
        id: `notif-${status.simulation_id}-${status.version}`, timestamp: last.at,
        severity: verdict === 'REJECTED' ? 'CRITICAL' : verdict === 'ESCALATED' ? 'WARNING' : 'SUCCESS',
        title: `Compliance verdict: ${verdict ?? 'unknown'}`, message: `Simulation ${status.simulation_id} reached compliance_checked.`,
        incidentId: incident?.id, unread: true, targetView: 'decisions',
      };
    } else if (last.checkpoint === 'plan_finalized' || last.checkpoint === 'plan_rejected_by_human') {
      entry = {
        id: `notif-${status.simulation_id}-${status.version}`, timestamp: last.at,
        severity: last.checkpoint === 'plan_finalized' ? 'SUCCESS' : 'WARNING',
        title: last.checkpoint === 'plan_finalized' ? 'Plan finalized' : 'Plan rejected by operator',
        message: `Simulation ${status.simulation_id}: ${status.status}.`, incidentId: incident?.id, unread: true, targetView: 'decisions',
      };
    } else if (last.checkpoint === 'approval_requested') {
      entry = {
        id: `notif-${status.simulation_id}-${status.version}`, timestamp: last.at, severity: 'WARNING',
        title: 'Awaiting human approval', message: `Simulation ${status.simulation_id} needs a decision.`,
        incidentId: incident?.id, unread: true, targetView: 'decisions',
      };
    }
    if (entry) setNotifications((prev) => [entry!, ...prev].slice(0, 50));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.version]);

  const unreadNotificationCount = notifications.filter((n) => n.unread).length;
  const markNotificationRead = (id: string) => setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)));
  const markAllNotificationsRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));

  // ---- human decisions: real approve/reject calls against the actual backend ----
  const approve = (approverName: string, notes?: string) => {
    sim.approve(approverName || userProfile.name, notes, status?.version).catch(() => undefined);
  };
  const reject = (reason: string, notes?: string) => {
    const note = notes ? `${reason}: ${notes}` : reason;
    sim.reject(userProfile.name, note, status?.version).catch(() => undefined);
  };

  const approveScenario = (_scenarioId: string, approverName: string, notes?: string) => approve(approverName, notes);
  const rejectScenario = (_scenarioId: string, reason: string, notes?: string) => reject(reason, notes);
  // There is no "modify plan" endpoint on the real backend (docs/api-plan.md) — a modification
  // is recorded as an approval carrying the operator's note, never silently invented as a
  // distinct backend action.
  const modifyScenario = (_scenarioId: string, _updates: Partial<RecoveryScenario>, notes: string) =>
    approve(userProfile.name, `MODIFIED BY OPERATOR: ${notes}`);
  const approveRecoveryOption = (_optionId: string, approverName: string, notes?: string) => approve(approverName, notes);
  const rejectRecoveryOption = (_optionId: string, reason: string, notes?: string) => reject(reason, notes);
  const modifyRecoveryOption = (_optionId: string, _updates: Partial<DynamicRecoveryOption>, notes: string) =>
    approve(userProfile.name, `MODIFIED BY OPERATOR: ${notes}`);

  // These two have no real backend counterpart at all (no "ask for deeper analysis" or
  // "escalate to executives" endpoint exists) — kept as local, clearly-labeled notifications
  // rather than pretending they dispatch to a real agent or workflow.
  const requestScenarioAnalysis = (scenarioId: string, queryNotes: string) => {
    setNotifications((prev) => [
      { id: `notif-${Date.now()}`, timestamp: new Date().toISOString(), severity: 'INFO', title: `Analysis requested for ${scenarioId} (not wired to a backend agent)`, message: queryNotes, unread: true, targetView: 'agents' },
      ...prev,
    ]);
  };
  const escalateScenario = (scenarioId: string, notes: string) => {
    setNotifications((prev) => [
      { id: `notif-${Date.now()}`, timestamp: new Date().toISOString(), severity: 'WARNING', title: `${scenarioId} flagged for escalation (local note only — no executive workflow exists)`, message: notes, unread: true, targetView: 'decisions' },
      ...prev,
    ]);
  };

  const resetAllData = () => {
    sim.reset().catch(() => undefined);
    setNotifications([]);
    setCurrentTourStep(1);
    setCurrentView('overview');
  };

  const goToTourStep = (stepNumber: number) => {
    if (stepNumber < 1 || stepNumber > HACKATHON_DEMO_STEPS.length) return;
    setCurrentTourStep(stepNumber);
    const targetStep = HACKATHON_DEMO_STEPS[stepNumber - 1];
    if (targetStep) setCurrentView(targetStep.view);
  };
  const goToNextTourStep = () => {
    if (currentTourStep < HACKATHON_DEMO_STEPS.length) goToTourStep(currentTourStep + 1);
  };
  const goToPrevTourStep = () => {
    if (currentTourStep > 1) goToTourStep(currentTourStep - 1);
  };

  const selectedShipment = operationalShipments.find((s) => s.id === selectedShipmentId) ?? operationalShipments[0] ?? EMPTY_SHIPMENT;
  const selectedIncident = incidents.find((i) => i.id === selectedIncidentId) ?? incidents[0] ?? EMPTY_INCIDENT;
  const selectedRecoveryOption =
    dynamicRecoveryOptions.find((o) => o.id === selectedRecoveryOptionId) ?? dynamicRecoveryOptions[0] ?? EMPTY_RECOVERY_OPTION;

  const isLoading = dashboardQ.loading || suppliersQ.loading || routesQ.loading || inventoryQ.loading || shipmentsQ.loading || scenariosQ.loading;
  const loadError = [dashboardQ.error, suppliersQ.error, routesQ.error, inventoryQ.error, shipmentsQ.error, sim.error]
    .filter(Boolean)
    .map((e) => describeError(e))[0] ?? null;

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
        complianceRationale,
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
        isLoading,
        loadError,
        simulationId,
        isReportModalOpen,
        openReportModal: () => setIsReportModalOpen(true),
        closeReportModal: () => setIsReportModalOpen(false),
      }}
    >
      {children}
    </OilShieldContext.Provider>
  );
};

export const OilShieldProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SimulationProvider>
    <OilShieldInner>{children}</OilShieldInner>
  </SimulationProvider>
);

export const useOilShield = (): OilShieldContextType => {
  const context = useContext(OilShieldContext);
  if (!context) {
    throw new Error('useOilShield must be used within an OilShieldProvider');
  }
  return context;
};
