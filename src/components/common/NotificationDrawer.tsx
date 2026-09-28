import React from 'react';
import {
  X,
  Bell,
  CheckCircle,
  AlertTriangle,
  Info,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { useOilShield } from '../../context/OilShieldContext';
import { OilShieldView } from '../../types/oilshield';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToView?: (view: any) => void;
}

export const useAlerts = () => {
  return [];
};

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  onNavigateToView,
}) => {
  const {
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    setCurrentView,
  } = useOilShield();

  if (!isOpen) return null;

  const handleItemClick = (id: string, targetView: OilShieldView) => {
    markNotificationRead(id);
    setCurrentView(targetView);
    onClose();
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <ShieldAlert className="w-4 h-4 text-red-600" />;
      case 'WARNING':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case 'SUCCESS':
        return <CheckCircle className="w-4 h-4 text-success" />;
      default:
        return <Info className="w-4 h-4 text-accent" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
      />

      {/* Drawer */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-pop flex flex-col border-l border-slate-200">
          {/* Header */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-primary-soft text-accent border border-primary-border/60 rounded-lg">
                <Bell className="w-4 h-4" />
              </span>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">System Notifications</h3>
                <p className="text-xs text-slate-500">Live operational events & agent signals</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={markAllNotificationsRead}
                className="text-xs text-accent hover:text-accent-strong font-semibold px-2 py-1 transition-colors"
              >
                Mark all read
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {notifications.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                No active notifications
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item.id, item.targetView)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer hover:shadow-md ${
                    item.unread
                      ? 'bg-primary-soft/60 border-primary-border shadow-xs'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex-shrink-0">{getSeverityIcon(item.severity)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-slate-900 text-xs truncate">
                          {item.title}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
                          {item.timestamp}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                        {item.message}
                      </p>
                      <div className="mt-2 flex items-center justify-between text-[11px]">
                        <span className="text-accent font-semibold flex items-center gap-1">
                          Jump to {item.targetView}
                          <ArrowRight className="w-3 h-3" />
                        </span>
                        {item.incidentId && (
                          <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {item.incidentId}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
