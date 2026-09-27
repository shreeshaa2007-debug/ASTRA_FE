import {
  Envelope,
  SimulationState,
  SimulationSummary,
  SimulationStatusResponse,
  RunAcceptedResponse,
  DashboardResponse,
  RoutesResponse,
  SuppliersResponse,
  InventoryResponse,
  InventoryForecastResponse,
  ShipmentsResponse,
  DecisionResponse,
  ComplianceResponse,
  DecisionActionResponse,
  DisruptionsResponse,
  HealthResponse,
  ProductRow,
  MetricsSnapshot,
  ModelMonitoring,
  ReadyResponse,
  ScenarioRow,
  ScenarioComparison,
  ScenarioRunAccepted,
  RealtimePort,
  MaritimeChokepoint,
  PortsSummary,
} from '../types/api';

// The real API (docs/api-plan.md), backed by the actual pipeline (Phase 15).
// Override the host with VITE_API_BASE_URL. An empty value means "this origin": behind the SAP Approuter (BTP) the UI and
// the API share one host, and the browser session — not this code — carries the sign-in (`npm run build:btp`).
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

// Behind the Approuter every state-changing request must carry its CSRF token. The protocol is the Approuter's: ask for a
// token with `X-CSRF-Token: Fetch` on a GET, send it back on POSTs, and ask again when a POST is refused with
// `X-CSRF-Token: Required` (the session was renewed). Off unless the build turns it on: the local API has no Approuter.
const USE_CSRF = import.meta.env.VITE_CSRF_TOKEN === 'true';
let csrfToken: string | null = null;

async function refreshCsrfToken(): Promise<void> {
  const res = await fetch(`${API_BASE}/api/health`, { headers: { 'X-CSRF-Token': 'Fetch' } });
  csrfToken = res.headers.get('X-CSRF-Token');
}

export class ApiError extends Error {
  code?: string;
  recovery?: string;
  requestId?: string; // the id that is also on every backend log line for this request
  status: number;
  constructor(message: string, status: number, code?: string, recovery?: string, requestId?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.recovery = recovery;
    this.requestId = requestId;
  }
}

async function unwrap<T>(res: Response): Promise<T> {
  let body: Envelope<T>;
  try {
    body = await res.json();
  } catch {
    throw new ApiError(`Request failed (${res.status})`, res.status);
  }
  if (!res.ok || body.error) {
    throw new ApiError(
      body.error?.message ?? `Request failed (${res.status})`,
      res.status,
      body.error?.error_code,
      body.error?.recovery,
      body.error?.request_id ?? res.headers.get('X-Request-ID') ?? undefined
    );
  }
  return body.data as T;
}

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  return unwrap<T>(res);
}

async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const send = () =>
    fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(USE_CSRF && csrfToken ? { 'X-CSRF-Token': csrfToken } : {}) },
      body: JSON.stringify(body ?? {}),
    });
  if (USE_CSRF && !csrfToken) await refreshCsrfToken();
  let res = await send();
  if (USE_CSRF && res.status === 403 && res.headers.get('X-CSRF-Token')?.toLowerCase() === 'required') {
    await refreshCsrfToken();
    res = await send();
  }
  return unwrap<T>(res);
}

function qs(params: Record<string, string | number | undefined | null>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  if (entries.length === 0) return '';
  return '?' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');
}

// --- meta ---
// /api/health is the one endpoint that is not wrapped in the {data} envelope.
export const getHealth = async (): Promise<HealthResponse> => {
  const res = await fetch(`${API_BASE}/api/health`);
  if (!res.ok) throw new ApiError(`Health check failed (${res.status})`, res.status);
  return (await res.json()) as HealthResponse;
};

// --- simulation lifecycle ---
export const createSimulation = (scenarioType: string, simulationId?: string) =>
  apiPost<SimulationState>('/api/simulations', { scenario_type: scenarioType, simulation_id: simulationId });

export const listSimulations = (status?: string, limit = 50) =>
  apiGet<SimulationSummary[]>(`/api/simulations${qs({ status, limit })}`);

export const getSimulation = (id: string) => apiGet<SimulationState>(`/api/simulations/${id}`);

export interface RunSimulationBody {
  signal: string | { scenario_type?: string; description: string; candidate?: Record<string, unknown> };
  product_id: string;
  as_of_date?: string;
  tariff_overrides?: Record<string, number>;
}

export const runSimulation = (id: string, body: RunSimulationBody) =>
  apiPost<RunAcceptedResponse>(`/api/simulations/${id}/run`, body);

export const getSimulationStatus = (id: string) => apiGet<SimulationStatusResponse>(`/api/simulations/${id}/status`);

export const resetSimulation = (id: string) => apiPost<SimulationState>(`/api/simulations/${id}/reset`);

// --- network + results (read-only views) ---
export const getDashboard = () => apiGet<DashboardResponse>('/api/dashboard');

export const getDisruptions = (params: { simulationId?: string; source?: string; severity?: string; limit?: number; offset?: number } = {}) =>
  apiGet<DisruptionsResponse>(
    `/api/disruptions${qs({ simulation_id: params.simulationId, source: params.source, severity: params.severity, limit: params.limit, offset: params.offset })}`
  );

export const getInventory = (simulationId?: string, productId?: string) =>
  apiGet<InventoryResponse>(`/api/inventory${qs({ simulation_id: simulationId, product_id: productId })}`);

export const getInventoryForecast = (productId: string, warehouseId = 'Mumbai', horizonDays = 14, asOfDate?: string) =>
  apiGet<InventoryForecastResponse>(
    `/api/inventory/forecast${qs({ product_id: productId, warehouse_id: warehouseId, horizon_days: horizonDays, as_of_date: asOfDate })}`
  );

export const getSuppliers = (simulationId?: string, productId?: string) =>
  apiGet<SuppliersResponse>(`/api/suppliers${qs({ simulation_id: simulationId, product_id: productId })}`);

export const getRoutes = (simulationId?: string) => apiGet<RoutesResponse>(`/api/routes${qs({ simulation_id: simulationId })}`);

export const getShipments = (simulationId?: string, routeId?: string, status?: string) =>
  apiGet<ShipmentsResponse>(`/api/shipments${qs({ simulation_id: simulationId, route_id: routeId, status })}`);

export const getAgentsStatus = (simulationId?: string) =>
  apiGet<SimulationStatusResponse>(`/api/agents/status${qs({ simulation_id: simulationId })}`);

// --- decisions, compliance, approval ---
export const getDecision = (simulationId: string) => apiGet<DecisionResponse>(`/api/decisions/${simulationId}`);

export const getCompliance = (simulationId: string) => apiGet<ComplianceResponse>(`/api/compliance/${simulationId}`);

export interface DecisionActionBody {
  decided_by: string;
  note?: string;
  expected_version?: number;
}

export const approveDecision = (simulationId: string, body: DecisionActionBody) =>
  apiPost<DecisionActionResponse>(`/api/decisions/${simulationId}/approve`, body);

export const rejectDecision = (simulationId: string, body: DecisionActionBody) =>
  apiPost<DecisionActionResponse>(`/api/decisions/${simulationId}/reject`, body);

// --- Phase 17: scenario simulation ---
export const getProducts = () => apiGet<ProductRow[]>('/api/products');

export const getScenarios = () => apiGet<ScenarioRow[]>('/api/scenarios');

export const getScenarioComparison = (scenarioId: string, productId?: string, asOfDate?: string) =>
  apiGet<ScenarioComparison>(`/api/scenarios/${scenarioId}/comparison${qs({ product_id: productId, as_of_date: asOfDate })}`);

export const runScenario = (scenarioId: string, productId?: string) =>
  apiPost<ScenarioRunAccepted>(`/api/scenarios/${scenarioId}/run`, productId ? { product_id: productId } : {});

export const getSimulationComparison = (simulationId: string, productId?: string, asOfDate?: string) =>
  apiGet<ScenarioComparison>(`/api/simulations/${simulationId}/comparison${qs({ product_id: productId, as_of_date: asOfDate })}`);

// --- Phase 19: observability ---
export const getMetrics = () => apiGet<MetricsSnapshot>('/api/metrics');

export const getModelMonitoring = (backtestProductId?: string) =>
  apiGet<ModelMonitoring>(`/api/monitoring/model${qs({ backtest_product_id: backtestProductId })}`);

// Readiness answers 503 with the same body when something required is missing, and that body is the answer.
export const getReady = async (): Promise<ReadyResponse> => {
  const res = await fetch(`${API_BASE}/api/ready`);
  const body = (await res.json()) as Envelope<ReadyResponse>;
  if (!body.data) throw new ApiError(body.error?.message ?? `Readiness check failed (${res.status})`, res.status, body.error?.error_code);
  return body.data;
};

// --- Real-time Port Telemetry & Chokepoints (Phase 20) ---
export const getRealtimePorts = (status?: string, severity?: string) =>
  apiGet<RealtimePort[]>(`/api/ports/realtime${qs({ status, severity })}`);

export const getMaritimeChokepoints = () =>
  apiGet<MaritimeChokepoint[]>('/api/ports/chokepoints');

export const getPortsSummary = () =>
  apiGet<PortsSummary>('/api/ports/summary');

export const refreshPortsTelemetry = () =>
  apiPost<{ message: string; summary: PortsSummary; ports_count: number }>('/api/ports/refresh', {});

export const getPortModelMetrics = () =>
  apiGet<any>('/api/ports/model-metrics');

export const predictPortDelay = (portId?: string) =>
  apiGet<any>(`/api/ports/predict-delay${qs({ port_id: portId })}`);

