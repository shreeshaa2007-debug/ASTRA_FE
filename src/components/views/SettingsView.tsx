import React, { useState } from 'react';
import {
  Settings,
  Sliders,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Server,
  Shield,
  HelpCircle,
} from 'lucide-react';
import { useOilShield } from '../../context/OilShieldContext';

export const SettingsView: React.FC = () => {
  const {
    resetAllData,
    userProfile,
    emergencySpendLimit,
    setEmergencySpendLimit,
    minCoverageDays,
    setMinCoverageDays,
    agentConfidenceThreshold,
    setAgentConfidenceThreshold,
  } = useOilShield();

  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  const handleConfirmReset = () => {
    resetAllData();
    setIsResetModalOpen(false);
    setResetSuccessMessage('All application data and demo telemetry have been restored to initial operational baseline.');
    setTimeout(() => setResetSuccessMessage(null), 4000);
  };

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Settings & Maintenance
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational thresholds, financial approval limits, agent confidence guardrails, and SAP integration.
          </p>
        </div>

        <button
          onClick={() => setIsResetModalOpen(true)}
          className="px-3 py-1.5 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 rounded-lg text-xs font-bold transition-colors border border-slate-200 flex items-center gap-1.5 shadow-xs"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Application Data</span>
        </button>
      </div>

      {resetSuccessMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{resetSuccessMessage}</span>
        </div>
      )}

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Operational & Financial Guardrails */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="border-b border-slate-100 pb-2.5">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#154734]" />
              <span>Operational & Delegation Limits</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Parameters checked by Compliance Agent and evaluated dynamically in recovery options.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between font-semibold text-slate-800 mb-1">
                <span>Single-Operator Emergency Spend Cap:</span>
                <span className="font-mono font-bold text-[#154734]">${emergencySpendLimit.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min="50000"
                max="250000"
                step="10000"
                value={emergencySpendLimit}
                onChange={(e) => setEmergencySpendLimit(Number(e.target.value))}
                className="w-full accent-[#154734] cursor-pointer"
              />
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Recovery options exceeding this require secondary executive authorization (e.g. ADNOC spot tender).
              </span>
            </div>

            <div>
              <div className="flex justify-between font-semibold text-slate-800 mb-1">
                <span>Refinery Safety Stock Buffer Floor:</span>
                <span className="font-mono font-bold text-[#154734]">{minCoverageDays} Days</span>
              </div>
              <input
                type="range"
                min="1.5"
                max="7.0"
                step="0.5"
                value={minCoverageDays}
                onChange={(e) => setMinCoverageDays(Number(e.target.value))}
                className="w-full accent-[#154734] cursor-pointer"
              />
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Internal buffer draws leaving donor terminals below this trigger a policy warning.
              </span>
            </div>

            <div>
              <div className="flex justify-between font-semibold text-slate-800 mb-1">
                <span>Agent Minimum Confidence Threshold:</span>
                <span className="font-mono font-bold text-[#154734]">{agentConfidenceThreshold}%</span>
              </div>
              <input
                type="range"
                min="70"
                max="99"
                step="1"
                value={agentConfidenceThreshold}
                onChange={(e) => setAgentConfidenceThreshold(Number(e.target.value))}
                className="w-full accent-[#154734] cursor-pointer"
              />
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Autonomous agent findings below this score require extra evidentiary justification.
              </span>
            </div>
          </div>
        </div>

        {/* Enterprise & SAP S/4HANA Connectivity */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="border-b border-slate-100 pb-2.5">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-600" />
              <span>Enterprise ERP & SAP S/4HANA Status</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              ERP connection telemetry and operator clearance role.
            </p>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">SAP Connector Status:</span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold font-mono text-[10px]">
                  MOCK CONNECTOR ACTIVE
                </span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Clean enterprise schema adapters (LFA1 Vendor Master, EINA Purchasing, and MB52 Material Ledger). Configured to connect to SAP BTP and SAP S/4HANA.
              </p>
            </div>

            <div className="space-y-1.5 pt-1 text-slate-700">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Operator:</span>
                <span className="font-bold text-slate-900">{userProfile.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Role:</span>
                <span className="font-bold text-slate-900">{userProfile.role}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Department:</span>
                <span className="font-bold text-slate-900">{userProfile.department}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Delegated Authority:</span>
                <span className="font-mono font-bold text-emerald-700">{userProfile.clearanceLevel}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CONFIRMATION MODAL FOR SENSITIVE RESET ACTION (Section 13 Requirement) */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-5 space-y-4 shadow-pop border border-slate-200">
            <div className="flex items-start gap-3">
              <span className="p-2 rounded-lg bg-red-100 text-red-600 flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Confirm Data Reset
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Are you sure you want to reset all demo data and operational decisions? This will restore initial shipments, incidents, and telemetry.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReset}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-xs"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
