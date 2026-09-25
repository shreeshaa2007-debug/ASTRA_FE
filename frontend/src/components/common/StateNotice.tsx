import React from 'react';
import { ApiError } from '../../services/api';
import { ViewMode } from '../../types';

// One place for the three non-data states every live screen can be in, so a
// screen never renders something that looks like data when it isn't.

export const LoadingBlock: React.FC<{ label?: string }> = ({ label = 'Loading from the API…' }) => (
  <div className="p-6 bg-[#131b2e] border border-[#3e4850] rounded-lg flex items-center gap-3 text-xs font-mono text-[#88929b]">
    <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
    <span>{label}</span>
  </div>
);

export const ErrorBlock: React.FC<{ error: Error | ApiError; onRetry?: () => void }> = ({ error, onRetry }) => {
  const api = error instanceof ApiError ? error : null;
  const unreachable = !api && /fetch|network/i.test(error.message);
  return (
    <div className="p-4 bg-[#131b2e] border border-[#93000a] rounded-lg space-y-1.5 text-xs font-mono">
      <div className="flex items-center gap-2 text-[#ffb4ab] font-bold uppercase">
        <span className="material-symbols-outlined text-[16px]">error</span>
        <span>{api?.code ?? (unreachable ? 'API_UNREACHABLE' : 'REQUEST_FAILED')}</span>
      </div>
      <p className="text-[#bec8d2] font-body">
        {unreachable ? 'Could not reach the backend. Start it from the repo root: uvicorn backend.api.main:app --port 8000 --env-file .env' : error.message}
      </p>
      {api?.recovery && <p className="text-[#88929b] font-body">{api.recovery}</p>}
      {api?.requestId && <p className="text-[#88929b] text-[10px]">request id <span className="text-[#bec8d2]">{api.requestId}</span> — quote it to find this request in the backend log</p>}
      {onRetry && (
        <button onClick={onRetry} className="mt-1 px-3 py-1 border border-[#3e4850] hover:bg-[#222a3d] rounded text-[#89ceff]">
          Retry
        </button>
      )}
    </div>
  );
};

// Shown when a screen needs a simulation (a plan, a verdict, an agent timeline)
// and none has been run yet.
export const NoSimulationNotice: React.FC<{ onNavigate: (v: ViewMode) => void; what: string }> = ({ onNavigate, what }) => (
  <div className="p-6 bg-[#131b2e] border border-[#3e4850] rounded-lg space-y-3">
    <div className="flex items-center gap-2 text-[#ffb95f] text-xs font-mono font-bold uppercase">
      <span className="material-symbols-outlined text-[18px]">info</span>
      <span>No simulation yet</span>
    </div>
    <p className="text-sm font-body text-[#bec8d2]">
      {what} comes from a simulation run — nothing is shown until the pipeline has produced it, so there is no placeholder data here.
    </p>
    <button
      onClick={() => onNavigate('simulator')}
      className="px-4 py-2 bg-[#0ea5e9] hover:bg-[#89ceff] hover:text-[#00344d] text-white font-headline text-xs font-bold rounded transition-colors"
    >
      Open the Disruption Simulator
    </button>
  </div>
);

export const EngineBadge: React.FC<{ label?: string; engine?: string }> = ({ label, engine }) =>
  label ? (
    <span className="px-2 py-0.5 bg-[#0ea5e9]/20 text-[#89ceff] text-[10px] font-mono font-bold rounded" title={engine ? `engine: ${engine}` : undefined}>
      {label}
    </span>
  ) : null;

export const StatusPill: React.FC<{ value: string }> = ({ value }) => {
  const v = value.toUpperCase();
  const style =
    v === 'DISRUPTED' || v === 'HIGH' || v === 'CRITICAL' || v === 'FAILED' || v === 'REJECTED' || v === 'INFEASIBLE'
      ? 'bg-[#93000a] text-[#ffdad6]'
      : v === 'DELAYED' || v === 'REDUCED' || v === 'MEDIUM' || v === 'ESCALATED' || v === 'PENDING' || v === 'ACTION_REQUIRED' || v === 'PROPOSED'
      ? 'bg-[#d88a00]/30 text-[#ffb95f]'
      : v === 'ALTERNATIVE'
      ? 'bg-[#0ea5e9]/20 text-[#89ceff]'
      : 'bg-[#00a572]/20 text-[#4edea3]';
  return <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${style}`}>{value.replace(/_/g, ' ')}</span>;
};
