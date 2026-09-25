import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../services/api';

export interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | Error | null;
  reload: () => void;
}

// Fetches on mount and whenever `deps` or `refreshOn` change; a stale response is dropped.
//
//   deps       what the data is ABOUT (a simulation, a scenario, a product). When it changes, whatever
//              was loaded for the old subject is never handed out — `data` is null until the new one
//              arrives — so a screen cannot show scenario A's numbers under scenario B's heading.
//   refreshOn  when to ask again about the SAME subject (e.g. the simulation moved to a new version).
//              The old data stays visible meanwhile, so a live view doesn't flicker.
//   enabled    false skips the fetch and clears the result: nothing to ask for yet.
//
// There is deliberately no fallback value: a view has real data, is loading, or shows the error.
export function useFetch<T>(fetcher: () => Promise<T>, deps: unknown[], enabled = true, refreshOn: unknown[] = []): FetchState<T> {
  const key = deps.map((d) => String(d)).join('');
  const [result, setResult] = useState<{ key: string; data: T | null; error: Error | null } | null>(null);
  const [fetching, setFetching] = useState<boolean>(enabled);
  const [tick, setTick] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    if (!enabled) {
      setResult(null);
      setFetching(false);
      return;
    }
    let cancelled = false;
    setFetching(true);
    fetcherRef
      .current()
      .then((data) => {
        if (!cancelled) setResult({ key, data, error: null });
      })
      .catch((err) => {
        if (!cancelled) setResult({ key, data: null, error: err instanceof Error ? err : new Error(String(err)) });
      })
      .finally(() => {
        if (!cancelled) setFetching(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, tick, key, ...refreshOn]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const current = enabled && result && result.key === key ? result : null;
  return { data: current?.data ?? null, error: current?.error ?? null, loading: enabled && (fetching || !current), reload };
}
