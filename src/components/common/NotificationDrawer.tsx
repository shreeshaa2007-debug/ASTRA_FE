import React from 'react';
import { useSimulation } from '../../context/SimulationContext';
import { ViewMode } from '../../types';

export interface Alert {
  id: string;
  tone: 'critical' | 'warning' | 'info';
  tag: string;
  title: string;
  body: string;
  action?: { label: string; view: ViewMode };
}

// Alerts are derived from the current simulation's real status — nothing is
// scripted. With no simulation there are none.
export function useAlerts(): Alert[] {
  const { status, isActive } = useSimulation();
  if (!status) return [];
  const alerts: Alert[] = [];
  const outcome = status.run?.outcome;
  const sensing = status.agents.find((a) => a.id === 'sensing');

  if (status.stalled) {
    alerts.push({
      id: 'stalled', tone: 'warning', tag: 'RUN STALLED', title: 'A run was interrupted',
      body: 'The server restarted mid-run, so nothing is executing this simulation. Reset it or start a new run.',
      action: { label: 'Open the simulator', view: 'simulator' },
    });
  }
  if (sensing?.status === 'COMPLETE') {
    alerts.push({
      id: 'sensed', tone: 'critical', tag: 'DISRUPTION SENSED', title: 'The Sensing Agent found a disruption',
      body: sensing.detail, action: { label: 'See the response', view: 'decisions' },
    });
  }
  if (status.awaiting_approval) {
    alerts.push({
      id: 'approval', tone: 'warning', tag: 'ACTION REQUIRED', title: 'A plan is waiting for a human decision',
      body: status.agents.find((a) => a.id === 'compliance')?.detail ?? '', action: { label: 'Review and decide', view: 'compliance' },
    });
  }
  if (!isActive && outcome && ['FAILED', 'SENSING_ERROR', 'SENSING_REJECTED'].includes(outcome.outcome)) {
    alerts.push({
      id: 'failed', tone: 'critical', tag: outcome.outcome.replace(/_/g, ' '), title: 'The last run did not produce a plan',
      body: outcome.message, action: { label: 'Open the simulator', view: 'simulator' },
    });
  }
  if (!isActive && outcome?.outcome === 'NO_DISRUPTION') {
    alerts.push({ id: 'none', tone: 'info', tag: 'NO DISRUPTION', title: 'Nothing to act on', body: outcome.message, action: { label: 'Try another report', view: 'simulator' } });
  }
  return alerts;
}

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToView: (view: ViewMode) => void;
}

const tones = {
  critical: { border: 'border-[#93000a]', tag: 'bg-[#93000a] text-[#ffdad6]' },
  warning: { border: 'border-[#d88a00]', tag: 'bg-[#d88a00]/30 text-[#ffb95f]' },
  info: { border: 'border-[#3e4850]', tag: 'bg-[#1e293b] text-[#bec8d2]' },
};

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ isOpen, onClose, onNavigateToView }) => {
  const alerts = useAlerts();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md h-full bg-[#0b1326] border-l border-[#3e4850] shadow-2xl flex flex-col justify-between">
        <div className="p-4 bg-[#131b2e] border-b border-[#3e4850] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#89ceff]">notifications_active</span>
            <span className="font-headline font-bold text-white text-sm">Operational Alerts ({alerts.length})</span>
          </div>
          <button onClick={onClose} className="p-1 text-[#88929b] hover:text-white hover:bg-[#222a3d] rounded transition-colors">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs">
          {alerts.length === 0 && (
            <div className="p-3 bg-[#060e20] border border-[#3e4850] rounded-lg text-[#88929b] font-body text-[11px]">
              No alerts. Alerts come from a simulation run — they are not scripted, so there is nothing here until one has produced something to report.
            </div>
          )}
          {alerts.map((a) => (
            <div key={a.id} className={`p-3 bg-[#131b2e] border ${tones[a.tone].border} rounded-lg space-y-2`}>
              <span className={`px-2 py-0.5 text-[9px] font-bold rounded ${tones[a.tone].tag}`}>{a.tag}</span>
              <h4 className="font-headline font-bold text-white text-sm">{a.title}</h4>
              {a.body && <p className="font-body text-[#bec8d2] text-[11px]">{a.body}</p>}
              {a.action && (
                <button
                  onClick={() => {
                    onClose();
                    onNavigateToView(a.action!.view);
                  }}
                  className="text-[#89ceff] hover:underline text-[11px] font-bold flex items-center gap-1"
                >
                  <span>{a.action.label}</span>
                  <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="p-3 bg-[#131b2e] border-t border-[#3e4850] text-center">
          <span className="text-[10px] font-mono text-[#88929b]">Derived from the current simulation's status</span>
        </div>
      </div>
    </div>
  );
};
