/**
 * OilShield — Agentic AI Oil Supply Chain Control Tower
 * Domain Types and Interfaces for SAP Hackathon
 */

export type OilShieldView =
  | 'overview'
  | 'disruptions'
  | 'agents'
  | 'network'
  | 'suppliers'
  | 'logistics'
  | 'inventory'
  | 'scenarios'
  | 'compliance'
  | 'decisions'
  | 'audit'
  | 'settings';

export type DisruptionSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type DisruptionStatus =
  | 'ACTIVE_ANALYZING'
  | 'RECOVERY_PROPOSED'
  | 'AWAITING_APPROVAL'
  | 'APPROVED_EXECUTING'
  | 'RESOLVED';

export interface DisruptionIncident {
  id: string; // e.g. "OIL-1042"
  title: string;
  type: string; // e.g. "Port Congestion"
  location: string; // e.g. "Chennai Port"
  coordinates: [number, number];
  affectedShipment: string; // e.g. "SHP-1042 (MT Ocean Vanguard)"
  vesselName: string;
  product: string; // e.g. "Crude Oil (Arab Light / Heavy Blend)"
  quantityBarrels: number; // e.g. 20000
  severity: DisruptionSeverity;
  estimatedDelayHours: number; // e.g. 18
  affectedRefinery: string; // e.g. "Chennai Refinery (CPCL Manali)"
  affectedCustomer: string; // e.g. "Customer C104 (Southern Petrochem Corp)"
  detectionTime: string; // ISO string or format
  status: DisruptionStatus;
  estimatedExposureValueUsd: number;
  rootCause: string;
  berthDelayTrend: string;
  affectedShipmentCount: number;
  totalNetworkExposureBarrels: number;
}

export type AgentRole =
  | 'disruption'
  | 'supplier'
  | 'logistics'
  | 'inventory'
  | 'scenario'
  | 'compliance';

export interface SpecializedAgent {
  id: string;
  code: string;
  name: string;
  title: string;
  role: AgentRole;
  responsibility: string;
  status: 'ONLINE' | 'ACTIVE' | 'PROCESSING' | 'IDLE' | 'COMPLETED';
  latencyMs: number;
  confidenceScore: number;
  latestFinding: string;
  structuredOutput: Record<string, unknown>;
  inputsReceived: string[];
  outputsGenerated: string[];
  timestamp: string;
  evidenceCount: number;
  iconName: string;
}

export type SupplierApprovalStatus = 'APPROVED' | 'PENDING_REVIEW' | 'RESTRICTED';

export interface CrudeSupplier {
  id: string;
  name: string;
  location: string;
  country: string;
  crudeGrade: string;
  apiGravity: number;
  sulfurContentPct: number;
  availableQuantityBarrels: number;
  leadTimeHours: number;
  reliabilityScorePct: number;
  approvalStatus: SupplierApprovalStatus;
  estimatedCostPerBbl: number;
  compatibilityPct: number;
  portAccess: string;
  contractType: 'Framework Agreement' | 'Spot Tender' | 'Internal Transfer' | 'Restricted Intermediary';
  complianceNotes: string;
  actionAvailable: boolean;
}

export type TransportMode = 'SEA' | 'PIPELINE' | 'RAIL' | 'ROAD' | 'AIR';

export interface LogisticsOption {
  id: string;
  name: string;
  origin: string;
  destination: string;
  currentRoute: string;
  alternativeRoute: string;
  alternativePort?: string;
  transportMode: TransportMode;
  estimatedTravelHours: number;
  transportCostPerBbl: number;
  totalCostUsd: number;
  availableCapacityBarrels: number;
  routeRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  delayEstimateHours: number;
  status: 'AVAILABLE' | 'DISRUPTED' | 'CONGESTED' | 'RESTRICTED';
  connectivityVerified: boolean;
  infrastructureNotes: string;
  carbonIntensityKgPerBbl: number;
}

export interface InventoryFacility {
  id: string;
  name: string;
  type: 'Refinery Terminal' | 'Inland Storage Depot' | 'Distribution Terminal' | 'Strategic Reserve';
  location: string;
  coordinates: [number, number];
  currentInventoryBarrels: number;
  minThresholdBarrels: number;
  safetyStockBarrels: number;
  maxCapacityBarrels: number;
  availableTransferBarrels: number;
  coverageDays: number;
  stockoutRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  transferFeasibility: boolean;
  pipelineConnected: boolean;
  railSidingAvailable: boolean;
  recentBufferDrawBarrels: number;
}

export type ScenarioFeasibility = 'FEASIBLE' | 'PARTIALLY_FEASIBLE' | 'RESTRICTED' | 'INFEASIBLE';
export type ScenarioCompliance = 'COMPLIANT' | 'REQUIRES_REVIEW' | 'RESTRICTED';
export type HumanApprovalStatus = 'AWAITING_APPROVAL' | 'APPROVED' | 'MODIFIED_APPROVED' | 'REJECTED' | 'ANALYSIS_REQUESTED' | 'ESCALATED';

export interface RecoveryScenario {
  id: string; // e.g. "SCENARIO-A"
  code: string; // "Scenario A"
  name: string; // "Alternative Port Reroute"
  description: string;
  proposedAction: string;
  supplier: string;
  route: string;
  port: string;
  transportMode: string;
  quantityRecoveredBarrels: number;
  estimatedDeliveryHours: number; // additional hours over standard baseline
  totalEstimatedCostUsd: number;
  inventoryImpact: string;
  customerImpact: string;
  supplyRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  recoveryTimeHours: number;
  feasibilityStatus: ScenarioFeasibility;
  feasibilityScore: number; // 0 - 100
  complianceStatus: ScenarioCompliance;
  humanApprovalStatus: HumanApprovalStatus;
  approvedBy?: string;
  approvedAt?: string;
  approvalNotes?: string;
  rejectionReason?: string;
  recommendedRank: number; // 1 = highest recommended
  whyThisScenario: string[];
  supportingEvidence: string[];
  assumptions: string[];
  expectedBenefits: string[];
  risks: string[];
  complianceFindings: string[];
  unresolvedUncertainties: string[];
}

export interface DynamicRecoveryOption {
  id: string;
  title: string;
  category: 'Maritime Diversion' | 'Pipeline Transfer' | 'Spot Tender' | 'Rail Transport';
  supplier: string;
  route: string;
  destination: string;
  transportMode: TransportMode;
  quantityBarrels: number;
  etaDeltaHours: number; // e.g. +6.5h
  costUsd: number; // e.g. 48000
  costPerBbl: number;
  feasibilityScore: number; // 0-100
  complianceStatus: ScenarioCompliance;
  complianceChecks: {
    name: string;
    status: 'PASS' | 'WARNING' | 'FAIL';
    detail: string;
  }[];
  inventoryImpact: string;
  customerImpact: string;
  operationalSummary: string;
  reasoning: string[];
  constraintsChecked: {
    label: string;
    value: string;
    status: 'OK' | 'WARNING' | 'ALERT';
  }[];
  isRecommended?: boolean;
  humanApprovalStatus: HumanApprovalStatus;
  approvedBy?: string;
  approvedAt?: string;
  approvalNotes?: string;
  rejectionReason?: string;
}

export interface OperationalShipment {
  id: string;
  incidentId?: string;
  vesselName: string;
  cargo: string;
  quantityBarrels: number;
  origin: string;
  destination: string;
  supplier: string;
  status: 'EMERGENCY_DISRUPTED' | 'ACTIVE_ANALYZING' | 'APPROVED_EXECUTING' | 'IN_TRANSIT' | 'RESOLVED';
  eta: string;
  delayHours: number;
  disruptionSummary?: string;
  isEmergency?: boolean;
}

export interface ComplianceCheckRule {
  id: string;
  ruleCode: string;
  ruleName: string;
  category: 'Supplier Eligibility' | 'Maritime Safety' | 'Financial Threshold' | 'Crude Specification' | 'Sanctions & ESG';
  status: ScenarioCompliance;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  evidenceSummary: string;
  requiredAction: string;
  appliesToScenario: string; // "Scenario A", "Scenario B", etc.
}

export interface SupplyChainNode {
  id: string;
  name: string;
  tier: 'Supplier' | 'Port' | 'Refinery' | 'Storage' | 'Transportation' | 'Customer';
  location: string;
  status: 'NORMAL' | 'AT_RISK' | 'DISRUPTED' | 'UNDER_ANALYSIS';
  throughputBarrelsPerDay: number;
  currentCapacityPct: number;
  productHandling: string;
  incidentAffected: boolean;
  notes: string;
  connectedTo: string[];
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  timeFormatted: string;
  event: string;
  actorType: 'AI_AGENT' | 'HUMAN_OPERATOR' | 'SYSTEM_MONITOR';
  actorName: string;
  actorRole: string;
  incidentId: string;
  status: 'INFO' | 'TRIGGERED' | 'COMPLETED' | 'CONFIRMED' | 'FLAGGED' | 'WARNING';
  details: string;
  verificationHash: string;
}

export interface SystemNotification {
  id: string;
  timestamp: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO' | 'SUCCESS';
  title: string;
  message: string;
  incidentId?: string;
  unread: boolean;
  targetView: OilShieldView;
}
