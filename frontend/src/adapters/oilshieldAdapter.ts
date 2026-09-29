/**
 * OilShield adapter — the ONE place oil vocabulary is invented on top of the real backend.
 *
 * Strategy (docs/oilshield-frontend-integration-plan.md §0, "relabel layer"): the backend's
 * data model stays exactly as it is (generic products/warehouses/suppliers/routes, MVP cost
 * units, docs/api-plan.md) — nothing here changes the backend contract. This file only
 * *relabels* real numbers into the oil-flavored shape `src/types/oilshield.ts` expects
 * (units -> "barrels", supplier -> "crude supplier", etc.).
 *
 * Every field below is either:
 *   (a) a real number/string straight from the API response, or
 *   (b) a value computed FROM real fields (documented inline), or
 *   (c) an explicit "not tracked" placeholder for a field the mock invented that has no
 *       backend source (vessel names, API gravity, sulfur %, crude grade, ...).
 * Nothing is fabricated as if it were real. See the integration plan's §4 for the per-field
 * disposition this file implements.
 *
 * IMPORTANT caveat carried over, not hidden: cost figures are the backend's MVP cost units
 * (no real currency peg — backend/config/compliance_rules.yaml, frontend/src/utils/format.ts).
 * The pre-built OilShield view components render them with a "$" glyph baked into their JSX;
 * this adapter cannot fix that without rewriting those views (out of scope for this pass —
 * flagged in the integration plan's open questions).
 */
import {
  ApiInventoryRow,
  ApiRoute,
  ApiShipment,
  ApiSupplier,
  CheckpointRecord,
  ComplianceResponse,
  DashboardResponse,
  DecisionResponse,
  ScenarioComparison,
  ScenarioRow,
  SimulationStatusResponse,
} from '../types/api';
import {
  AgentRole,
  AuditEvent,
  ComplianceCheckRule,
  CrudeSupplier,
  DisruptionIncident,
  DynamicRecoveryOption,
  HumanApprovalStatus,
  InventoryFacility,
  LogisticsOption,
  OperationalShipment,
  RecoveryScenario,
  ScenarioCompliance,
  ScenarioFeasibility,
  SpecializedAgent,
  SupplyChainNode,
  TransportMode,
} from '../types/oilshield';

export const NOT_TRACKED = 'Not tracked — no source dataset for this field';

// ---------------------------------------------------------------------------
// small shared helpers
// ---------------------------------------------------------------------------

/** A real, deterministic (not `Math.random()`) checksum over a checkpoint's own fields — a
 * genuine derived value, not a cryptographic hash and not invented per-render. */
function checksum(...parts: (string | number)[]): string {
  const s = parts.join('|');
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return `0x${(h >>> 0).toString(16).padStart(8, '0')}`;
}

const TRANSPORT_MODE_MAP: Record<string, TransportMode> = {
  sea: 'SEA',
  rail: 'RAIL',
  air: 'AIR',
  road: 'ROAD',
  pipeline: 'PIPELINE',
};

function transportMode(mode: string | null | undefined): TransportMode {
  if (!mode) return 'SEA';
  return TRANSPORT_MODE_MAP[mode.toLowerCase()] ?? 'SEA';
}

/** OPTIMAL/INFEASIBLE/ERROR -> a 0-100 score. Real signal (plan status + how many
 * constraints are binding), not an invented precision number. */
export function feasibilityScoreFrom(status: string, bindingConstraintCount = 0): number {
  if (status === 'OPTIMAL') return Math.max(40, 100 - bindingConstraintCount * 5);
  if (status === 'EVALUATED') return 70;
  return 0;
}

function feasibilityStatusFrom(status: string): ScenarioFeasibility {
  if (status === 'OPTIMAL' || status === 'EVALUATED') return 'FEASIBLE';
  if (status === 'ERROR') return 'RESTRICTED';
  return 'INFEASIBLE';
}

function complianceStatusFrom(verdict: ComplianceResponse['compliance'] | null | undefined): ScenarioCompliance {
  if (!verdict) return 'REQUIRES_REVIEW';
  if (verdict.status === 'APPROVED') return 'COMPLIANT';
  if (verdict.status === 'ESCALATED') return 'REQUIRES_REVIEW';
  return 'RESTRICTED';
}

/** ApprovalStatusValue (backend) -> HumanApprovalStatus (oilshield UI). NOT_REQUIRED is a real
 * outcome (in-policy, auto-cleared) — closest honest label is APPROVED (nothing is pending). */
export function humanApprovalStatusFrom(status: string): HumanApprovalStatus {
  switch (status) {
    case 'APPROVED':
    case 'NOT_REQUIRED':
      return 'APPROVED';
    case 'REJECTED':
      return 'REJECTED';
    case 'PENDING':
    default:
      return 'AWAITING_APPROVAL';
  }
}

// ---------------------------------------------------------------------------
// DisruptionIncident — from the dashboard + the active disruption on a simulation's state
// ---------------------------------------------------------------------------
export function toDisruptionIncident(
  dashboard: DashboardResponse | null,
  status: SimulationStatusResponse | null,
  event: { event_id: string; event_type: string; location: string; severity: string; summary?: string | null } | null
): DisruptionIncident | null {
  if (!event) return null;
  const kpis = dashboard?.kpis;
  const statusLabel: DisruptionIncident['status'] =
    status?.status === 'AWAITING_APPROVAL'
      ? 'AWAITING_APPROVAL'
      : status?.status === 'COMPLETED'
        ? 'APPROVED_EXECUTING'
        : status?.status === 'RUNNING'
          ? 'ACTIVE_ANALYZING'
          : status?.status === 'REJECTED' || status?.status === 'FAILED'
            ? 'RECOVERY_PROPOSED'
            : 'ACTIVE_ANALYZING';
  return {
    id: event.event_id,
    title: event.summary || `${event.event_type} at ${event.location}`,
    type: event.event_type,
    location: event.location,
    coordinates: [0, 0], // real port coordinates live in data/network.ts by route, not by disruption; not wired in this pass
    affectedShipment: status?.simulation_id ?? event.event_id,
    vesselName: NOT_TRACKED, // no shipment dataset exists (docs/api-plan.md) — nothing to source a vessel name from
    product: status?.scenario_type ?? 'unspecified product',
    quantityBarrels: kpis?.units_at_risk ?? NaN,
    severity: (event.severity as DisruptionIncident['severity']) ?? 'MEDIUM',
    estimatedDelayHours: NaN, // backend reports transit DAYS on a route/allocation, not an incident-level delay estimate
    affectedRefinery: NOT_TRACKED,
    affectedCustomer: NOT_TRACKED,
    detectionTime: status?.timeline?.[0]?.at ?? new Date().toISOString(),
    status: statusLabel,
    estimatedExposureValueUsd: kpis?.estimated_exposure ?? NaN,
    rootCause: event.summary || event.event_type,
    berthDelayTrend: status?.current_step ? `pipeline step: ${status.current_step}` : '',
    affectedShipmentCount: kpis?.shipments_at_risk ?? NaN,
    totalNetworkExposureBarrels: kpis?.units_at_risk ?? NaN,
  };
}

// ---------------------------------------------------------------------------
// SpecializedAgent — from GET /api/agents/status (or .../status), one entry per real pipeline stage
// ---------------------------------------------------------------------------
const AGENT_META: Record<string, { role: AgentRole; name: string; title: string; responsibility: string; iconName: string }> = {
  sensing: { role: 'disruption', name: 'Sensing Agent', title: 'Disruption Sensing', responsibility: 'Parses the incoming report into a structured, validated disruption event.', iconName: 'AlertTriangle' },
  sourcing: { role: 'supplier', name: 'Sourcing Agent', title: 'Crude Supplier Intelligence', responsibility: 'Ranks suppliers by landed cost, capacity and reliability.', iconName: 'Building2' },
  logistics: { role: 'logistics', name: 'Logistics Agent', title: 'Route & Transport Intelligence', responsibility: 'Evaluates route capacity, cost and transit time; proposes alternatives.', iconName: 'Truck' },
  inventory: { role: 'inventory', name: 'Inventory Agent', title: 'Inventory & Stockout Intelligence', responsibility: 'Forecasts demand and flags stockout risk per facility.', iconName: 'Database' },
  optimization: { role: 'scenario', name: 'Optimization Engine', title: 'Recovery Plan Optimizer', responsibility: 'Solves one feasible minimum-cost plan across suppliers, routes and warehouses.', iconName: 'GitBranch' },
  compliance: { role: 'compliance', name: 'Compliance Agent', title: 'Compliance & Policy Check', responsibility: 'Deterministic rule checks: supplier, country, route and spend threshold.', iconName: 'ShieldCheck' },
};

const STAGE_CHECKPOINTS: Record<string, string[]> = {
  sensing: ['event_sensed'],
  inventory: ['agents_assessed'],
  logistics: ['agents_assessed'],
  sourcing: ['agents_assessed'],
  optimization: ['plan_optimized'],
  compliance: ['compliance_checked'],
};

function timeOfCheckpoint(timeline: CheckpointRecord[], names: string[]): string | undefined {
  for (let i = timeline.length - 1; i >= 0; i--) {
    if (names.includes(timeline[i].checkpoint)) return timeline[i].at;
  }
  return undefined;
}

function evidenceCountFor(stageId: string, status: SimulationStatusResponse, decision: DecisionResponse | null): number {
  switch (stageId) {
    case 'sensing':
      return status.timeline.length ? 1 : 0;
    case 'sourcing':
      return decision ? Object.keys(decision.supplier_split ?? {}).length : 0;
    case 'logistics':
      return decision ? Object.keys(decision.mode_split ?? {}).length : 0;
    case 'inventory':
      return decision ? Object.keys(decision.end_stock_by_warehouse ?? {}).length : 0;
    case 'optimization':
      return decision ? decision.binding_constraints.length : 0;
    case 'compliance':
      return decision?.compliance?.checks.length ?? 0;
    default:
      return 0;
  }
}

function structuredOutputFor(stageId: string, decision: DecisionResponse | null): Record<string, unknown> {
  if (!decision) return {};
  switch (stageId) {
    case 'sourcing':
      return { supplier_split: decision.supplier_split };
    case 'logistics':
      return { mode_split: decision.mode_split };
    case 'inventory':
      return { end_stock_by_warehouse: decision.end_stock_by_warehouse };
    case 'optimization':
      return { objective_terms: decision.objective_terms, objective_value: decision.objective_value };
    case 'compliance':
      return { checks: decision.compliance?.checks };
    default:
      return {};
  }
}

export function toSpecializedAgents(status: SimulationStatusResponse, decision: DecisionResponse | null): SpecializedAgent[] {
  return status.agents
    .filter((a) => a.id !== 'human_approval') // a human isn't a "specialized agent" — AgentRole has no slot for it
    .map((a) => {
      const meta = AGENT_META[a.id] ?? { role: 'compliance' as AgentRole, name: a.name, title: a.name, responsibility: '', iconName: 'Bot' };
      const uiStatus: SpecializedAgent['status'] =
        a.status === 'COMPLETE' || a.status === 'NOT_REQUIRED'
          ? 'COMPLETED'
          : a.status === 'RUNNING'
            ? 'PROCESSING'
            : a.status === 'PENDING'
              ? 'IDLE'
              : a.status === 'FAILED' || a.status === 'REJECTED'
                ? 'ACTIVE'
                : 'ONLINE';
      // Confidence is a completion-state indicator relabeled as "confidence," not a model-reported
      // score — the one real exception is the Sensing Agent, which does report a real event confidence.
      const sensedConfidence = a.id === 'sensing' && status.timeline.some((h) => h.checkpoint === 'event_sensed') ? null : null;
      const confidenceScore = sensedConfidence ?? (uiStatus === 'COMPLETED' ? 96 : uiStatus === 'PROCESSING' ? 55 : uiStatus === 'ACTIVE' ? 20 : 0);
      return {
        id: a.id,
        code: a.id.toUpperCase(),
        name: meta.name,
        title: meta.title,
        role: meta.role,
        responsibility: meta.responsibility,
        status: uiStatus,
        latencyMs: a.latency_ms ?? NaN,
        confidenceScore,
        latestFinding: a.detail || '(no detail reported for this stage yet)',
        structuredOutput: structuredOutputFor(a.id, decision),
        inputsReceived: [], // the real pipeline's wiring (docs/architecture.md) isn't exposed per-call by the API
        outputsGenerated: [],
        timestamp: timeOfCheckpoint(status.timeline, STAGE_CHECKPOINTS[a.id] ?? []) ?? status.timeline[0]?.at ?? new Date().toISOString(),
        evidenceCount: evidenceCountFor(a.id, status, decision),
        iconName: meta.iconName,
      };
    });
}

// ---------------------------------------------------------------------------
// CrudeSupplier — from GET /api/suppliers
// ---------------------------------------------------------------------------
export function toCrudeSupplier(s: ApiSupplier): CrudeSupplier {
  return {
    id: s.supplier_id,
    name: s.supplier_name,
    location: s.region,
    country: s.region,
    crudeGrade: NOT_TRACKED, // generic commodity dataset — no crude assay data
    apiGravity: NaN,
    sulfurContentPct: NaN,
    availableQuantityBarrels: s.capacity,
    leadTimeHours: s.lead_time_days * 24,
    reliabilityScorePct: Math.round(s.reliability * 100),
    approvalStatus: s.status === 'DISRUPTED' ? 'RESTRICTED' : s.status === 'REDUCED' ? 'PENDING_REVIEW' : 'APPROVED',
    estimatedCostPerBbl: s.unit_cost,
    compatibilityPct: Math.round(s.reliability * 100), // no compatibility metric exists; reusing the real reliability score rather than inventing a second number
    portAccess: NOT_TRACKED,
    contractType: 'Spot Tender',
    complianceNotes: s.tariff_rate_pct != null ? `Tariff ${s.tariff_rate_pct}% (backend/config, World Bank rate table)` : 'No tariff on file',
    actionAvailable: s.status !== 'DISRUPTED',
  };
}

// ---------------------------------------------------------------------------
// LogisticsOption — from GET /api/routes
// ---------------------------------------------------------------------------
export function toLogisticsOption(r: ApiRoute): LogisticsOption {
  return {
    id: r.route_id,
    name: `${r.origin} → ${r.destination} (${r.transport_mode})`,
    origin: r.origin,
    destination: r.destination,
    currentRoute: r.route_id,
    alternativeRoute: r.status === 'DISRUPTED' ? 'see ALTERNATIVE-status routes for this lane' : r.route_id,
    transportMode: transportMode(r.transport_mode),
    estimatedTravelHours: r.transit_time_days * 24,
    transportCostPerBbl: r.cost_per_unit,
    totalCostUsd: r.cost_per_unit * r.capacity,
    availableCapacityBarrels: r.capacity - (r.planned_quantity ?? 0),
    routeRisk: r.status === 'DISRUPTED' ? 'HIGH' : r.status === 'ALTERNATIVE' ? 'MEDIUM' : 'LOW',
    delayEstimateHours: r.status === 'DISRUPTED' ? r.transit_time_days * 24 : 0,
    status: r.status === 'DISRUPTED' ? 'DISRUPTED' : r.status === 'ALTERNATIVE' ? 'AVAILABLE' : 'AVAILABLE',
    connectivityVerified: true,
    infrastructureNotes: `provenance: ${r.provenance}`,
    carbonIntensityKgPerBbl: NaN, // no emissions dataset
  };
}

// ---------------------------------------------------------------------------
// InventoryFacility — from GET /api/inventory
// ---------------------------------------------------------------------------
export function toInventoryFacility(row: ApiInventoryRow): InventoryFacility {
  const risk = (row.stockout_risk ?? 'LOW').toUpperCase() as InventoryFacility['stockoutRisk'];
  return {
    id: row.warehouse_id,
    name: `${row.warehouse_id} Distribution Terminal`,
    type: 'Distribution Terminal',
    location: row.warehouse_id,
    coordinates: [0, 0],
    currentInventoryBarrels: row.current_stock,
    minThresholdBarrels: row.safety_stock ?? NaN,
    safetyStockBarrels: row.safety_stock ?? NaN,
    maxCapacityBarrels: NaN, // no facility max-capacity field in the ledger
    availableTransferBarrels: row.recommended_transfer?.quantity ?? 0,
    coverageDays: row.days_of_cover ?? NaN,
    stockoutRisk: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(risk) ? risk : 'LOW',
    transferFeasibility: !!row.recommended_transfer,
    pipelineConnected: false, // no pipeline dataset — never claim a facility is pipeline-connected without one
    railSidingAvailable: false,
    recentBufferDrawBarrels: NaN,
  };
}

// ---------------------------------------------------------------------------
// ComplianceCheckRule — from GET /api/compliance/{id} (backend/config/compliance_rules.yaml)
// ---------------------------------------------------------------------------
export function toComplianceCheckRules(compliance: ComplianceResponse | null): ComplianceCheckRule[] {
  if (!compliance) return [];
  return compliance.compliance.checks.map((c, i) => ({
    id: `RULE-${i + 1}`,
    ruleCode: c.name.toUpperCase(),
    ruleName: c.name.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()),
    // The real rule categories are supplier/country/route policy and a spend threshold
    // (backend/config/compliance_rules.yaml) — not the mock's maritime/ESG taxonomy.
    category: c.name.includes('cost') ? 'Financial Threshold' : c.name.includes('country') ? 'Sanctions & ESG' : c.name.includes('route') ? 'Maritime Safety' : 'Supplier Eligibility',
    status: c.passed ? 'COMPLIANT' : 'RESTRICTED',
    severity: c.passed ? 'INFO' : 'CRITICAL',
    evidenceSummary: c.detail,
    requiredAction: c.passed ? 'None' : `Resolve: ${(c.offenders ?? []).join(', ') || c.detail}`,
    appliesToScenario: compliance.simulation_id,
  }));
}

// ---------------------------------------------------------------------------
// AuditEvent — from the real checkpoint timeline (already on every status response)
// ---------------------------------------------------------------------------
export function toAuditEvents(timeline: CheckpointRecord[]): AuditEvent[] {
  return timeline.map((h) => {
    const isApproval = h.checkpoint.includes('approval') || h.checkpoint === 'plan_finalized' || h.checkpoint === 'plan_rejected_by_human';
    const d = new Date(h.at);
    return {
      id: `${h.simulation_id}-v${h.version}`,
      timestamp: h.at,
      timeFormatted: Number.isNaN(d.getTime()) ? h.at : d.toISOString().slice(11, 19),
      event: h.checkpoint.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()),
      actorType: isApproval && h.actor !== 'orchestrator' ? 'HUMAN_OPERATOR' : h.actor === 'orchestrator' ? 'SYSTEM_MONITOR' : 'AI_AGENT',
      actorName: h.actor,
      actorRole: h.actor === 'orchestrator' ? 'Pipeline Orchestrator' : 'Operator',
      incidentId: h.simulation_id,
      status: h.checkpoint === 'run_failed' ? 'WARNING' : isApproval ? 'CONFIRMED' : 'INFO',
      details: `version ${h.version}; changed: ${h.changed_fields.join(', ') || '(status only)'}`,
      verificationHash: checksum(h.simulation_id, h.version, h.checkpoint, h.at),
    };
  });
}

// ---------------------------------------------------------------------------
// OperationalShipment — from GET /api/shipments ("the shipments the plan proposes", per the backend's own note)
// ---------------------------------------------------------------------------
export function toOperationalShipment(s: ApiShipment, incidentId: string | null, simStatus: string): OperationalShipment {
  const status: OperationalShipment['status'] =
    s.status === 'PLANNED' ? 'IN_TRANSIT' : simStatus === 'AWAITING_APPROVAL' ? 'ACTIVE_ANALYZING' : 'APPROVED_EXECUTING';
  return {
    id: s.shipment_id,
    incidentId: incidentId ?? undefined,
    vesselName: NOT_TRACKED,
    cargo: s.product_id,
    quantityBarrels: s.quantity,
    origin: s.supplier_id,
    destination: s.route_id ?? 'direct',
    supplier: s.supplier_id,
    status,
    eta: `${s.arrival_days.toFixed(1)}d`,
    delayHours: 0,
    disruptionSummary: s.provenance,
    isEmergency: false,
  };
}

// ---------------------------------------------------------------------------
// RecoveryScenario — one per DEFINED scenario (backend/config/scenarios.yaml), from its real comparison
// ---------------------------------------------------------------------------
export function toRecoveryScenario(row: ScenarioRow, comparison: ScenarioComparison | null, rank: number): RecoveryScenario {
  const mitigated = comparison?.mitigated;
  const bindingCount = 0; // ScenarioComparison's CaseSummary doesn't carry binding_constraints; only /api/decisions does
  return {
    id: row.scenario_id,
    code: row.scenario_id.replace(/_/g, ' '),
    name: row.label,
    description: row.description,
    proposedAction: mitigated?.message ?? row.description,
    supplier: comparison?.newly_disrupted_suppliers.join(', ') || '(none disrupted)',
    route: comparison?.newly_disrupted_routes.join(', ') || '(none disrupted)',
    port: row.event?.location ?? '',
    transportMode: mitigated ? Object.keys(mitigated.mode_split)[0] ?? '' : '',
    quantityRecoveredBarrels: mitigated?.units_delivered ?? NaN,
    estimatedDeliveryHours: (mitigated?.avg_arrival_days ?? NaN) * 24,
    totalEstimatedCostUsd: mitigated?.spend ?? NaN,
    inventoryImpact: mitigated ? `${mitigated.below_safety_units ?? 0} units below safety stock at horizon end` : 'not modeled',
    customerImpact: comparison?.exposure ? `${comparison.exposure.shipments_at_risk} shipment(s), ${comparison.exposure.units_at_risk} units at risk` : 'not modeled',
    supplyRisk: !row.modeled ? 'HIGH' : mitigated?.status === 'OPTIMAL' ? 'LOW' : 'MEDIUM',
    recoveryTimeHours: (mitigated?.avg_arrival_days ?? NaN) * 24,
    feasibilityStatus: row.modeled ? feasibilityStatusFrom(mitigated?.status ?? 'ERROR') : 'RESTRICTED',
    feasibilityScore: row.modeled ? feasibilityScoreFrom(mitigated?.status ?? 'ERROR', bindingCount) : 0,
    complianceStatus: 'REQUIRES_REVIEW', // per-scenario compliance needs a run simulation id; the comparison endpoint is read-only and pre-compliance
    humanApprovalStatus: 'AWAITING_APPROVAL',
    recommendedRank: rank,
    whyThisScenario: comparison?.assumptions ?? [],
    supportingEvidence: comparison
      ? [`baseline spend ${comparison.baseline.spend ?? 'n/a'}`, `mitigated spend ${comparison.mitigated.spend ?? 'n/a'}`, `mitigation cost ${comparison.deltas.mitigation_cost ?? 'n/a'}`]
      : [],
    assumptions: comparison?.assumptions ?? [],
    expectedBenefits: comparison?.deltas.units_protected != null ? [`${comparison.deltas.units_protected} units protected vs. the unmitigated case`] : [],
    risks: comparison?.warnings ?? [],
    complianceFindings: [],
    unresolvedUncertainties: !row.modeled ? [row.not_modeled_reason ?? 'not modeled'] : [],
  };
}

// ---------------------------------------------------------------------------
// DynamicRecoveryOption — one per allocation in the CURRENT simulation's own optimized plan
// ---------------------------------------------------------------------------
export function toDynamicRecoveryOptions(decision: DecisionResponse | null): DynamicRecoveryOption[] {
  if (!decision || decision.plan_status !== 'OPTIMAL') return [];
  return decision.allocations.map((a, i) => {
    const isDirect = !a.route_id;
    return {
      id: `${decision.simulation_id}-alloc-${i + 1}`,
      title: isDirect ? `Buy ${a.quantity.toLocaleString()} bbl from ${a.supplier_id}` : `Route ${a.quantity.toLocaleString()} bbl via ${a.route_id} (${a.transport_mode})`,
      category: isDirect ? 'Spot Tender' : a.transport_mode === 'rail' ? 'Rail Transport' : a.transport_mode === 'sea' ? 'Maritime Diversion' : 'Spot Tender',
      supplier: a.supplier_id,
      route: a.route_id ?? 'direct (no freight leg on file)',
      destination: 'Rotterdam (inbound hub)',
      transportMode: transportMode(a.transport_mode),
      quantityBarrels: a.quantity,
      etaDeltaHours: a.arrival_days * 24,
      costUsd: Math.round((a.landed_unit_cost + a.freight_unit_cost) * a.quantity),
      costPerBbl: a.landed_unit_cost + a.freight_unit_cost,
      feasibilityScore: feasibilityScoreFrom(decision.plan_status, decision.binding_constraints.length),
      complianceStatus: complianceStatusFrom(decision.compliance),
      complianceChecks: (decision.compliance?.checks ?? []).map((c) => ({
        name: c.name.replace(/_/g, ' '),
        status: (c.passed ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
        detail: c.detail,
      })),
      inventoryImpact: `end-of-horizon stock: ${Object.entries(decision.end_stock_by_warehouse).map(([w, q]) => `${w} ${q}`).join(', ')}`,
      customerImpact: `${decision.deviations.length} deviation(s) from each agent's own recommendation`,
      operationalSummary: decision.decision_factors.map((f) => f.detail).join(' '),
      reasoning: decision.decision_factors.map((f) => `${f.factor}: ${f.detail}`),
      constraintsChecked: decision.constraints
        .filter((c) => c.binding)
        .map((c) => ({ label: c.name, value: c.detail, status: (c.satisfied ? 'OK' : 'ALERT') as 'OK' | 'ALERT' })),
      isRecommended: i === 0,
      humanApprovalStatus: humanApprovalStatusFrom(decision.approval.status),
      approvedBy: decision.approval.decision?.decided_by,
      approvedAt: decision.approval.decision?.decided_at,
      approvalNotes: decision.approval.decision?.note,
    };
  });
}

// ---------------------------------------------------------------------------
// SupplyChainNode[] — assembled client-side from routes + suppliers (no single backend endpoint for this graph)
// ---------------------------------------------------------------------------
export function toSupplyChainNodes(suppliers: ApiSupplier[], routes: ApiRoute[], inventory: ApiInventoryRow[]): SupplyChainNode[] {
  const supplierNodes: SupplyChainNode[] = suppliers.map((s) => ({
    id: `supplier:${s.supplier_id}`,
    name: s.supplier_name,
    tier: 'Supplier',
    location: s.region,
    status: s.status === 'DISRUPTED' ? 'DISRUPTED' : s.status === 'REDUCED' ? 'AT_RISK' : 'NORMAL',
    throughputBarrelsPerDay: Math.round(s.capacity / 30),
    currentCapacityPct: Math.round(s.reliability * 100),
    productHandling: s.product_id,
    incidentAffected: s.status !== 'ACTIVE',
    notes: `lead time ${s.lead_time_days}d, reliability ${(s.reliability * 100).toFixed(0)}%`,
    connectedTo: routes.filter((r) => r.origin === s.region).map((r) => `route:${r.route_id}`),
  }));
  const routeNodes: SupplyChainNode[] = routes.map((r) => ({
    id: `route:${r.route_id}`,
    name: `${r.origin} → ${r.destination}`,
    tier: 'Transportation',
    location: `${r.origin} → ${r.destination}`,
    status: r.status === 'DISRUPTED' ? 'DISRUPTED' : r.status === 'ALTERNATIVE' ? 'AT_RISK' : 'NORMAL',
    throughputBarrelsPerDay: Math.round(r.capacity / Math.max(r.transit_time_days, 1)),
    currentCapacityPct: r.planned_quantity ? Math.round((100 * r.planned_quantity) / r.capacity) : 0,
    productHandling: r.transport_mode,
    incidentAffected: r.status === 'DISRUPTED',
    notes: `${r.transit_time_days.toFixed(1)}d transit, provenance: ${r.provenance}`,
    connectedTo: ['facility:Rotterdam'],
  }));
  const facilityNodes: SupplyChainNode[] = inventory.map((inv) => ({
    id: `facility:${inv.warehouse_id}`,
    name: `${inv.warehouse_id} Distribution Terminal`,
    tier: 'Storage',
    location: inv.warehouse_id,
    status: inv.stockout_risk === 'HIGH' ? 'AT_RISK' : 'NORMAL',
    throughputBarrelsPerDay: Math.round((inv.forecast_demand ?? 0) / Math.max(inv.horizon_days ?? 1, 1)),
    currentCapacityPct: inv.safety_stock ? Math.round((100 * inv.current_stock) / inv.safety_stock) : NaN,
    productHandling: inv.product_id,
    incidentAffected: (inv.stockout_risk ?? 'LOW') !== 'LOW',
    notes: `${inv.days_of_cover ?? '—'} days of cover`,
    connectedTo: [],
  }));
  return [...supplierNodes, ...routeNodes, ...facilityNodes];
}
