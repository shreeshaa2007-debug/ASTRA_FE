import React from 'react';
import { ApiError } from '../../services/api';
import { ViewMode } from '../../types';

// One place for the three non-data states every live screen can be in, so a
// screen never renders something that looks like data when it isn't.

export const LoadingBlock: React.FC<{ label?: string }> = ({ label = 'Loading from the API…' }) => (
  <div className="p-6 bg-card rounded-2xl flex items-center gap-3 text-xs font-mono text-muted shadow-card">
    <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
    <span>{label}</span>
  </div>
);

export const ErrorBlock: React.FC<{ error: Error | ApiError; onRetry?: () => void }> = ({ error, onRetry }) => {
  const api = error instanceof ApiError ? error : null;
  const unreachable = !api && /fetch|network/i.test(error.message);
  return (
    <div className="p-4 bg-card border border-danger/40 rounded-2xl space-y-1.5 text-xs font-mono shadow-card">
      <div className="flex items-center gap-2 text-danger font-bold uppercase">
        <span className="material-symbols-outlined text-[16px]">error</span>
        <span>{api?.code ?? (unreachable ? 'API_UNREACHABLE' : 'REQUEST_FAILED')}</span>
      </div>
      <p className="text-ink-2 font-body">
        {unreachable ? 'Could not reach the backend. Start it from the repo root: uvicorn backend.api.main:app --port 8000 --env-file .env' : error.message}
      </p>
      {api?.recovery && <p className="text-muted font-body">{api.recovery}</p>}
      {api?.requestId && <p className="text-muted text-[10px]">request id <span className="text-ink-2">{api.requestId}</span> — quote it to find this request in the backend log</p>}
      {onRetry && (
        <button onClick={onRetry} className="mt-1 px-3 py-1 border border-line hover:bg-raised rounded-lg text-primary">
          Retry
        </button>
      )}
    </div>
  );
};

// Shown when a screen needs a simulation (a plan, a verdict, an agent timeline)
// and none has been run yet.
export const NoSimulationNotice: React.FC<{ onNavigate: (v: ViewMode) => void; what: string }> = ({ onNavigate, what }) => (
  <div className="p-6 bg-card rounded-2xl space-y-3 shadow-card">
    <div className="flex items-center gap-2 text-warning text-xs font-mono font-bold uppercase">
      <span className="material-symbols-outlined text-[18px]">info</span>
      <span>No simulation yet</span>
    </div>
    <p className="text-sm font-body text-ink-2">
      {what} comes from a simulation run — nothing is shown until the pipeline has produced it, so there is no placeholder data here.
    </p>
    <button
      onClick={() => onNavigate('simulator')}
      className="px-4 py-2 bg-primary hover:bg-primary-strong text-white font-headline text-xs font-bold rounded-lg transition-colors"
    >
      Open the Disruption Simulator
    </button>
  </div>
);

export const EngineBadge: React.FC<{ label?: string; engine?: string }> = ({ label, engine }) =>
  label ? (
    <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-mono font-bold rounded-lg" title={engine ? `engine: ${engine}` : undefined}>
      {label}
    </span>
  ) : null;

export const StatusPill: React.FC<{ value: string }> = ({ value }) => {
  const v = value.toUpperCase();
  const style =
    v === 'DISRUPTED' || v === 'HIGH' || v === 'CRITICAL' || v === 'FAILED' || v === 'REJECTED' || v === 'INFEASIBLE'
      ? 'bg-danger-soft text-danger'
      : v === 'DELAYED' || v === 'REDUCED' || v === 'MEDIUM' || v === 'ESCALATED' || v === 'PENDING' || v === 'ACTION_REQUIRED' || v === 'PROPOSED'
      ? 'bg-warning/15 text-warning'
      : v === 'ALTERNATIVE'
      ? 'bg-primary/10 text-primary'
      : 'bg-success/10 text-success';
  return <span className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold ${style}`}>{value.replace(/_/g, ' ')}</span>;
};
