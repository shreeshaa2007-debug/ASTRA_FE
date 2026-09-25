import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ApiError,
  approveDecision,
  createSimulation,
  getSimulationStatus,
  rejectDecision,
  resetSimulation,
  runScenario,
  runSimulation,
} from '../services/api';
import { SimulationStatusResponse } from '../types/api';

const STORAGE_KEY = 'resilientsc:simulationId';
const POLL_MS = 1000;

function readStored(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStored(id: string | null) {
  try {
    if (id) window.localStorage.setItem(STORAGE_KEY, id);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage blocked (private mode etc.) — the app still works, it just won't remember across reloads
  }
}

function describe(err: unknown): string {
  if (err instanceof ApiError) return err.recovery ? `${err.message} — ${err.recovery}` : err.message;
  return err instanceof Error ? err.message : String(err);
}

export interface SimulationContextValue {
  simulationId: string | null;
  status: SimulationStatusResponse | null;
  isActive: boolean; // a run is in flight for the current simulation
  busy: boolean; // a create/run/reset/approve request is in flight
  error: string | null;
  start: (opts: { signal: string; productId: string; scenarioType: string }) => Promise<void>;
  startScenario: (opts: { scenarioId: string; productId?: string }) => Promise<boolean>;
  refresh: () => Promise<void>;
  reset: () => Promise<void>;
  approve: (decidedBy: string, note?: string, expectedVersion?: number) => Promise<void>;
  reject: (decidedBy: string, note?: string, expectedVersion?: number) => Promise<void>;
  forget: () => void;
  switchTo: (id: string) => void; // look at a different (earlier) simulation
  clearError: () => void;
}

const SimulationContext = createContext<SimulationContextValue | null>(null);

export const SimulationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [simulationId, setSimulationId] = useState<string | null>(readStored);
  const [status, setStatus] = useState<SimulationStatusResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isActive = !!status && (status.run?.state === 'RUNNING' || (status.status === 'RUNNING' && !status.stalled));

  const select = useCallback((id: string | null) => {
    setSimulationId(id);
    writeStored(id);
    // never leave the previous simulation's status beside a new id
    setStatus((prev) => (prev && prev.simulation_id === id ? prev : null));
  }, []);

  const refresh = useCallback(async () => {
    if (!simulationId) return;
    try {
      setStatus(await getSimulationStatus(simulationId));
    } catch (err) {
      // the remembered simulation is gone (fresh database) — drop it rather than show a stale id
      if (err instanceof ApiError && err.status === 404) select(null);
      else setError(describe(err));
    }
  }, [simulationId, select]);

  // Load the remembered simulation's status once on mount / when it changes.
  useEffect(() => {
    if (!simulationId) {
      setStatus(null);
      return;
    }
    let cancelled = false;
    getSimulationStatus(simulationId)
      .then((s) => {
        if (!cancelled) setStatus(s);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) select(null);
        else setError(describe(err));
      });
    return () => {
      cancelled = true;
    };
  }, [simulationId, select]);

  // Poll only while a run is in flight; setTimeout chaining so polls never overlap.
  useEffect(() => {
    if (!simulationId || !isActive) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const s = await getSimulationStatus(simulationId);
        if (!cancelled) setStatus(s);
      } catch (err) {
        if (!cancelled) setError(describe(err));
      }
      if (!cancelled) timer = setTimeout(tick, POLL_MS);
    };
    timer = setTimeout(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [simulationId, isActive]);

  const start = useCallback(
    async ({ signal, productId, scenarioType }: { signal: string; productId: string; scenarioType: string }) => {
      setBusy(true);
      setError(null);
      try {
        // A simulation that is still CREATED (fresh, reset, or one where sensing found nothing)
        // can be run again as-is; any other status needs a new, isolated simulation.
        const reusable = !!simulationId && !!status && status.status === 'CREATED' && !isActive && status.scenario_type === scenarioType;
        const id = reusable ? simulationId! : (await createSimulation(scenarioType)).simulation_id;
        select(id);
        await runSimulation(id, { signal, product_id: productId });
        setStatus(await getSimulationStatus(id));
      } catch (err) {
        setError(describe(err));
      } finally {
        setBusy(false);
      }
    },
    [select, simulationId, status, isActive]
  );

  // A defined scenario (backend/config/scenarios.yaml) through the full pipeline: always a new
  // simulation, and no LLM — the trigger is structured. Resolves true if the run was accepted.
  const startScenario = useCallback(
    async ({ scenarioId, productId }: { scenarioId: string; productId?: string }) => {
      setBusy(true);
      setError(null);
      try {
        const accepted = await runScenario(scenarioId, productId);
        select(accepted.simulation_id);
        setStatus(await getSimulationStatus(accepted.simulation_id));
        return true;
      } catch (err) {
        setError(describe(err));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [select]
  );

  const reset = useCallback(async () => {
    if (!simulationId) return;
    setBusy(true);
    setError(null);
    try {
      await resetSimulation(simulationId);
      setStatus(await getSimulationStatus(simulationId));
    } catch (err) {
      setError(describe(err));
    } finally {
      setBusy(false);
    }
  }, [simulationId]);

  const decide = useCallback(
    async (kind: 'approve' | 'reject', decidedBy: string, note?: string, expectedVersion?: number) => {
      if (!simulationId) return;
      setBusy(true);
      setError(null);
      try {
        const body = { decided_by: decidedBy, note: note ?? '', expected_version: expectedVersion };
        await (kind === 'approve' ? approveDecision(simulationId, body) : rejectDecision(simulationId, body));
        setStatus(await getSimulationStatus(simulationId));
      } catch (err) {
        setError(describe(err));
        // the decision was refused because the plan is not what this page was showing (someone else
        // decided, or it changed): re-read it so the page shows the truth, not the stale "pending"
        getSimulationStatus(simulationId).then(setStatus).catch(() => undefined);
        throw err;
      } finally {
        setBusy(false);
      }
    },
    [simulationId]
  );

  const value = useMemo<SimulationContextValue>(
    () => ({
      simulationId,
      status,
      isActive,
      busy,
      error,
      start,
      startScenario,
      refresh,
      reset,
      approve: (by, note, ver) => decide('approve', by, note, ver),
      reject: (by, note, ver) => decide('reject', by, note, ver),
      forget: () => select(null),
      switchTo: (id) => select(id),
      clearError: () => setError(null),
    }),
    [simulationId, status, isActive, busy, error, start, startScenario, refresh, reset, decide, select]
  );

  return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>;
};

export function useSimulation(): SimulationContextValue {
  const ctx = useContext(SimulationContext);
  if (!ctx) throw new Error('useSimulation must be used inside <SimulationProvider>');
  return ctx;
}
