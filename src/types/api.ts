/**
 * Types mirroring the real backend responses (docs/api-plan.md, backend/api/views.py).
 * JSON is snake_case, straight from pydantic `.model_dump(mode="json")` — no
 * relabeling here, so a field name in this file is a field name on the wire.
 *
 * Costs are in the MVP's own cost unit (suppliers.csv unit_cost, routes.csv
 * cost_per_unit) — there is no real currency peg. Nothing in this file should
 * be rendered with a currency symbol invented on the frontend.
 */

export interface ApiErrorBody {
  status: string;
  error_code: string;
  message: string;
  recovery?: string;
  request_id?: string;
}

export interface Envelope<T> {
  data?: T;
  error?: ApiErrorBody;
}

export type SimulationStatus = 'CREATED' | 'RUNNING' | 'AWAITING_APPROVAL' | 'COMPLETED' | 'REJECTED' | 'FAILED';
export type ApprovalStatusValue = 'NOT_EVALUATED' | 'NOT_REQUIRED' | 'PENDING' | 'APPROVED' | 'REJECTED';
export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface DisruptionEvent {
  event_id: string;
  event_type: string;
  location: string;
  severity: Severity;
  start_date: string;
  estimated_duration: number;
  affected_routes: string[];
  affected_suppliers: string[];
  affected_products: string[];
  confidence: number;
  summary?: string | null;
}

export interface ApprovalDecision {
  decided_by: string;
  decided_at: string;
  note: string;
}

export interface ComplianceCheck {
  name: string;
  passed: boolean;
  detail: string;
  offenders?: string[];
}

export interface ComplianceStatus {
  status: 'APPROVED' | 'REJECTED' | 'ESCALATED';
  checks: ComplianceCheck[];
  reason: string;
  requires_human: boolean;
}

export interface Allocation {
  supplier_id: string;
  route_id: string | null;
  transport_mode: string | null;
  quantity: number;
  landed_unit_cost: number;
  freight_unit_cost: number;
  arrival_days: number;
}

export interface Transfer {
  from_warehouse: string;
  to_warehouse: string;
  quantity: number;
  unit_cost: number;
}

export interface ConstraintStatus {
  name: string;
  category: string;
  sense: '<=' | '>=' | '==';
  value: number;
  bound: number;
  satisfied: boolean;
  binding: boolean;
  detail: string;
}

export interface ExcludedOption {
  kind: 'supplier' | 'lane' | 'route';
  id: string;
  reason: string;
}

export interface DecisionFactor {
  factor: string;
  detail: string;
}

export interface Deviation {
  agent: string;
  recommended: string;
  planned: string;
  reason: string;
}

export interface SplitEntry {
  units: number;
  share: number;
}

export interface OptimizationSolution {
  status: 'OPTIMAL' | 'INFEASIBLE' | 'ERROR';
  engine: string;
  label: string;
  message: string;
  objective_value: number | null;
  objective_terms: Record<string, number>;
  allocations: Allocation[];
  transfers: Transfer[];
  inbound_by_warehouse: Record<string, number>;
  end_stock_by_warehouse: Record<string, number>;
  constraint_status: ConstraintStatus[];
  excluded_options: ExcludedOption[];
  deviations: Deviation[];
  decision_factors: DecisionFactor[];
  diagnostics: Record<string, unknown>;
  solver: Record<string, unknown>;
  problem: {
    product_id: string;
    assumptions: string[];
    [key: string]: unknown;
  };
}

export interface InventoryAssessment {
  warehouse: string;
  product: string;
  forecast_demand: number;
  current_stock: number;
  stockout_risk: string;
  recommended_transfer?: { from: string; quantity: number } | null;
}

export interface ForecastRecord {
  product_id: string;
  warehouse_id: string;
  horizon_days: number;
  forecast_demand: number;
  model_version: string;
}

export interface SimulationState {
  simulation_id: string;
  scenario_type: string;
  status: SimulationStatus;
  version: number;
  created_at: string;
  timestamp: string;
  current_disruptions: DisruptionEvent[];
  route_status: Record<string, string>;
  supplier_status: Record<string, string>;
  inventory_status: InventoryAssessment[];
  demand_forecasts: ForecastRecord[];
  shipment_status: Record<string, string>;
  tariffs: Record<string, number>;
  current_plan: OptimizationSolution | null;
  compliance_status: ComplianceStatus | null;
  approval_status: ApprovalStatusValue;
  approval_decision: ApprovalDecision | null;
  replan_count: number;
  error: string | null;
  engine?: string;
  label?: string;
}

export interface SimulationSummary {
  simulation_id: string;
  scenario_type: string;
  status: SimulationStatus;
  version: number;
  created_at: string;
  updated_at: string;
}

export type AgentStageStatus =
  | 'PENDING' | 'RUNNING' | 'COMPLETE' | 'FAILED' | 'NO_EVENT' | 'ACTION_REQUIRED' | 'NOT_REQUIRED' | 'REJECTED';

export interface AgentStatusEntry {
  id: string;
  name: string;
  status: AgentStageStatus;
  detail: string;
  latency_ms: number | null;
}

export interface StepRecord {
  name: string;
  ok: boolean;
  duration_ms: number;
  detail: string;
}

export type RunOutcomeKind = 'COMPLETED' | 'AWAITING_APPROVAL' | 'FAILED' | 'NO_DISRUPTION' | 'SENSING_REJECTED' | 'SENSING_ERROR';

export interface RunOutcome {
  outcome: RunOutcomeKind;
  simulation_id: string;
  status: SimulationStatus;
  message: string;
  error?: string | null;
  steps: StepRecord[];
}

export interface RunRecord {
  run_id: string;
  simulation_id: string;
  state: 'RUNNING' | 'FINISHED' | 'CRASHED';
  started_at: string;
  finished_at: string | null;
  elapsed_ms: number;
  overdue: boolean;
  outcome: RunOutcome | null;
  error: string | null;
}

export interface CheckpointRecord {
  simulation_id: string;
  version: number;
  checkpoint: string;
  actor: string;
  at: string;
  changed_fields: string[];
}

export interface SimulationStatusResponse {
  simulation_id: string;
  scenario_type: string;
  status: SimulationStatus;
  version: number;
  current_step: string;
  awaiting_approval: boolean;
  stalled: boolean;
  error: string | null;
  replan_count: number;
  run: RunRecord | null;
  agents: AgentStatusEntry[];
  timeline: CheckpointRecord[];
}

export interface RunAcceptedResponse {
  simulation_id: string;
  run_id: string;
  run_state: string;
  status_url: string;
}

export interface DashboardKpis {
  active_disruptions: number;
  routes_total: number;
  routes_disrupted: number;
  suppliers_total: number;
  suppliers_disrupted: number;
  suppliers_reduced: number;
  supplier_health_pct: number | null;
  inventory_records: number;
  inventory_at_risk: number;
  plan_status: string | null;
  plan_objective_value: number | null;
  plan_spend: number | null;
  approval_status: string | null;
  shipments_at_risk: number | null;
  units_at_risk?: number | null;
  estimated_exposure: number | null;
}

export interface DashboardResponse {
  simulation_id: string | null;
  reflects: string;
  engine?: string;
  label?: string;
  kpis: DashboardKpis;
  unavailable: Record<string, string>;
  exposure_note?: string;
}

export interface ApiRoute {
  route_id: string;
  origin: string;
  destination: string;
  transport_mode: string;
  distance_km: number;
  capacity: number;
  transit_time_days: number;
  cost_per_unit: number;
  status: string;
  provenance: string;
  planned_quantity: number | null;
}

export interface RoutesResponse {
  simulation_id: string | null;
  routes: ApiRoute[];
  engine?: string;
  label?: string;
}

export interface ApiSupplier {
  supplier_id: string;
  supplier_name: string;
  region: string;
  product_id: string;
  capacity: number;
  unit_cost: number;
  lead_time_days: number;
  reliability: number;
  risk_level: string;
  status: string;
  provenance: string;
  tariff_rate_pct: number | null;
  recommended_quantity: number | null;
}

export interface SuppliersResponse {
  simulation_id: string | null;
  product_id: string | null;
  suppliers: ApiSupplier[];
  recommended_mix: { supplier_id: string; quantity: number; share: number }[] | null;
  engine?: string;
  label?: string;
}

export interface ApiInventoryRow {
  warehouse_id: string;
  product_id: string;
  current_stock: number;
  safety_stock: number | null;
  forecast_demand: number | null;
  horizon_days: number | null;
  stockout_risk: string | null;
  days_of_cover: number | null;
  recommended_transfer?: { from: string; quantity: number } | null;
  source: 'ledger' | 'simulation';
  as_of_date?: string;
  stockout_flag?: boolean;
}

export interface InventoryResponse {
  simulation_id: string | null;
  source: string;
  inventory: ApiInventoryRow[];
  model_version?: string | null;
}

export interface ForecastPoint {
  date: string;
  value: number;
}

export interface InventoryForecastResponse {
  product_id: string;
  warehouse_id: string;
  horizon_days: number;
  as_of_date: string;
  actual: ForecastPoint[];
  predicted: ForecastPoint[];
  model_version: string;
  confidence: null;
  note: string;
}

export interface ApiShipment {
  shipment_id: string;
  product_id: string;
  supplier_id: string;
  route_id: string | null;
  transport_mode: string | null;
  quantity: number;
  arrival_days: number;
  freight_unit_cost: number;
  status: 'PROPOSED' | 'PLANNED';
  provenance: string;
}

export interface ShipmentsResponse {
  simulation_id: string | null;
  shipments: ApiShipment[];
  note: string;
  engine?: string;
  label?: string;
}

export interface DecisionResponse {
  simulation_id: string;
  simulation_status: SimulationStatus;
  version: number;
  engine: string;
  label: string;
  plan_status: 'OPTIMAL' | 'INFEASIBLE' | 'ERROR';
  message: string;
  product_id: string;
  objective_value: number | null;
  objective_terms: Record<string, number>;
  plan_spend: number | null;
  allocations: Allocation[];
  transfers: Transfer[];
  inbound_by_warehouse: Record<string, number>;
  end_stock_by_warehouse: Record<string, number>;
  mode_split: Record<string, SplitEntry> | null;
  supplier_split: Record<string, SplitEntry> | null;
  avg_arrival_days: number | null;
  avg_all_in_unit_cost: number | null;
  weighted_reliability: number | null;
  constraints: ConstraintStatus[];
  binding_constraints: string[];
  decision_factors: DecisionFactor[];
  deviations: Deviation[];
  assumptions: string[];
  excluded_options: ExcludedOption[];
  diagnostics: Record<string, unknown>;
  solver: Record<string, unknown>;
  disruptions: { event_id: string; event_type: string; location: string; severity: string; summary?: string | null }[];
  compliance: ComplianceStatus | null;
  approval: { status: ApprovalStatusValue; decision: ApprovalDecision | null };
  replan_count: number;
}

export interface ComplianceResponse {
  simulation_id: string;
  simulation_status: SimulationStatus;
  version: number;
  compliance: ComplianceStatus;
  approval: { status: ApprovalStatusValue; decision: ApprovalDecision | null };
  replan_count: number;
  plan_spend: number | null;
  engine?: string;
  label?: string;
}

export interface DecisionActionResponse {
  simulation_id: string;
  status: SimulationStatus;
  version: number;
  approval_status: ApprovalStatusValue;
  approval_decision: ApprovalDecision | null;
}

export interface HistoricalDisruption {
  event_id: string;
  event_type: string;
  location: string;
  start_date: string;
  end_date: string | null;
  severity: string;
  affected_route?: string | null;
  affected_supplier?: string | null;
  estimated_delay_days?: number | null;
  status: string;
  source: string;
  provenance: string;
}

export interface DisruptionsResponse {
  simulation_id: string | null;
  active: DisruptionEvent[];
  historical: { total: number; limit: number; offset: number; events: HistoricalDisruption[] };
}

export interface HealthResponse {
  status: string;
  mode: string;
  llm_configured: boolean;
}

// ---- Phase 17: scenario simulation ----
export interface ProductRow {
  product_id: string;
  supplier_count: number;
  has_suppliers: boolean;
}

export interface ScenarioRow {
  scenario_id: string;
  label: string;
  description: string;
  modeled: boolean;
  not_modeled_reason: string | null;
  default_product_id: string;
  event: {
    event_type: string;
    location: string;
    severity: Severity;
    estimated_duration: number;
    affected_routes: string[];
    affected_suppliers: string[];
    summary?: string | null;
  } | null;
  tariff_changes: { iso3: string; baseline_pct: number; scenario_pct: number }[];
}

export interface ModeShare {
  units: number;
  share: number;
}

export interface CaseSummary {
  case: 'baseline' | 'unmitigated' | 'mitigated';
  label: string;
  status: 'OPTIMAL' | 'INFEASIBLE' | 'ERROR' | 'EVALUATED' | 'NOT_AVAILABLE';
  message: string;
  spend: number | null;
  units_delivered: number | null;
  units_short: number | null;
  cost_per_unit: number | null;
  avg_arrival_days: number | null;
  shipments: number | null;
  stockout_units: number | null;
  below_safety_units: number | null;
  warehouses_below_safety: string[];
  mode_split: Record<string, ModeShare>;
}

export interface AtRiskShipment {
  supplier_id: string;
  route_id: string | null;
  transport_mode: string | null;
  quantity: number;
  value: number;
  reason: string;
}

export interface ScenarioComparison {
  scenario_id: string | null;
  scenario_label: string;
  simulation_id: string | null;
  product_id: string;
  as_of_date: string | null;
  newly_disrupted_routes: string[];
  newly_disrupted_suppliers: string[];
  tariff_changes: { iso3: string; baseline_pct: number; scenario_pct: number }[];
  baseline: CaseSummary;
  unmitigated: CaseSummary;
  mitigated: CaseSummary;
  exposure: { shipments_at_risk: number; units_at_risk: number; value_at_risk: number; shipments: AtRiskShipment[] } | null;
  deltas: {
    mitigation_cost: number | null;
    mitigation_cost_pct: number | null;
    avg_arrival_delta_days: number | null;
    units_protected: number | null;
  };
  engine: string;
  engine_label: string;
  model_version: string;
  assumptions: string[];
  warnings: string[];
}

export interface ScenarioRunAccepted {
  simulation_id: string;
  scenario_id: string;
  product_id: string;
  run_id: string;
  run_state: string;
  status_url: string;
}

// ---- Phase 19: observability ----
export interface MetricRow {
  labels: Record<string, string>;
}
export interface CounterRow extends MetricRow {
  value: number;
}
export interface SummaryRow extends MetricRow {
  count: number;
  sum: number;
  min: number;
  max: number;
  mean: number;
  p50: number;
  p95: number;
}
export interface MetricsSnapshot {
  uptime_seconds: number;
  counters: Record<string, CounterRow[]>;
  gauges: Record<string, CounterRow[]>;
  summaries: Record<string, SummaryRow[]>;
}

export interface DriftEntry {
  status: 'OK' | 'DRIFT' | 'NO_BASELINE';
  z: number | null;
  window_mean: number;
  train_mean: number | null;
  train_std: number | null;
  checked_at: string;
}
export interface Backtest {
  product_id: string;
  horizon_days: number;
  as_of: string;
  days_scored: number;
  mae: number | null;
  wape: number | null;
  at: string;
}
export interface ModelMonitoring {
  inference_count: number;
  model_versions: Record<string, number>;
  latency_ms: { count: number; mean: number | null; p50: number | null; p95: number | null; max: number | null };
  missing_feature_rate: number | null;
  features_checked: number;
  drift: {
    threshold_z: number;
    window_days: number;
    products_checked: number;
    products_drifting: number;
    by_product: Record<string, DriftEntry>;
    warnings: (DriftEntry & { product_id: string })[];
    method: string;
  };
  backtests: Record<string, Backtest>;
  backtest: Backtest | null;
}

export interface ReadyCheck {
  name: string;
  ok: boolean;
  required: boolean;
  detail: string;
}
export interface ReadyResponse {
  ready: boolean;
  degraded: boolean;
  checks: ReadyCheck[];
}

export interface RealtimePort {
  port_id: string;
  unlocode: string;
  port_name: string;
  country: string;
  region: string;
  latitude: number;
  longitude: number;
  operational_status: 'NORMAL' | 'SLOWDOWN' | 'CONGESTED' | 'BLOCKED';
  anchorage_vessels_count: number;
  median_wait_time_hours: number;
  congestion_index: number;
  congestion_severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  berth_productivity_moves_per_hr: number;
  turnaround_time_hours: number;
  yard_utilization_pct: number;
  estimated_delay_days: number;
  chokepoint_corridor: string;
  weather_condition: string;
  wind_speed_knots: number;
  wave_height_meters: number;
  last_updated_utc: string;
  provenance: string;
}

export interface MaritimeChokepoint {
  chokepoint_id: string;
  name: string;
  coordinates: [number, number];
  global_trade_share_pct: number;
  daily_transits_normal: number;
  daily_transits_current: number;
  status: 'NORMAL' | 'SLOWDOWN' | 'CONGESTED' | 'DISRUPTED' | 'ELEVATED';
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  active_hazard: string;
  detour_route: string;
  affected_corridors: string[];
  last_updated_utc: string;
}

export interface PortsSummary {
  total_monitored_ports: number;
  congested_ports_count: number;
  total_anchorage_queue_vessels: number;
  network_average_wait_hours: number;
  network_average_congestion_index: number;
  network_status: string;
  last_updated_utc: string;
}
