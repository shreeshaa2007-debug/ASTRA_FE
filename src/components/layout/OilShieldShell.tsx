import React, { useState } from 'react';
import { OilShieldSidebar } from './OilShieldSidebar';
import { OilShieldHeader } from './OilShieldHeader';
import { NotificationDrawer } from '../common/NotificationDrawer';
import { useOilShield } from '../../context/OilShieldContext';

interface ShellProps {
  children: React.ReactNode;
}

export const OilShieldShell: React.FC<ShellProps> = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState<boolean>(false);
  const { currentView } = useOilShield();

  return (
    <div className="h-screen bg-canvas text-ink flex overflow-hidden font-body">
      {/* Dark Navy Sidebar */}
      <OilShieldSidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Top Navigation Bar */}
        <OilShieldHeader
          onOpenNotifications={() => setIsNotificationOpen(true)}
        />

        {/* Viewport Canvas */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 flex flex-col">
          {/* Child View Content */}
          <div className="flex-1">{children}</div>

          {/* Operational Footer */}
          <footer className="mt-8 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 flex-shrink-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-700">
                OilShield AI
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-600">Shipment Operations Control Tower</span>
              <span className="px-2 py-0.5 bg-emerald-50 rounded-md border border-emerald-200 text-emerald-700 font-semibold text-[11px]">
                Human Approval Enforced
              </span>
              <span className="px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200 text-slate-700 font-medium text-[11px]">
                6 Agents Active
              </span>
            </div>

            <div className="text-slate-400 text-[11px] font-mono">
              SAP S/4HANA & BTP Connected (Sim)
            </div>
          </footer>
        </main>
      </div>

      {/* Notifications Drawer */}
      <NotificationDrawer
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
      />
    </div>
  );
};
