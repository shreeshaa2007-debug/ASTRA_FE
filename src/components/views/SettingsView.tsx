import React, { useState } from 'react';
import {
  Settings,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Server,
  Shield,
  HelpCircle,
  Edit3,
} from 'lucide-react';
import { useOilShield } from '../../context/OilShieldContext';
import { TextInput } from '../common/FormModal';

export const SettingsView: React.FC = () => {
  const { resetAllData, userProfile, setUserProfile } = useOilShield();

  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>(userProfile.name);
  const [editRole, setEditRole] = useState<string>(userProfile.role);
  const [editDepartment, setEditDepartment] = useState<string>(userProfile.department);
  const [editClearance, setEditClearance] = useState<string>(userProfile.clearanceLevel);

  const handleConfirmReset = () => {
    resetAllData();
    setIsResetModalOpen(false);
    setIsEditingProfile(false);
    setResetSuccessMessage('All application data and demo telemetry have been restored to initial operational baseline.');
    setTimeout(() => setResetSuccessMessage(null), 4000);
  };

  const startEditingProfile = () => {
    setEditName(userProfile.name);
    setEditRole(userProfile.role);
    setEditDepartment(userProfile.department);
    setEditClearance(userProfile.clearanceLevel);
    setIsEditingProfile(true);
  };

  const handleSaveProfile = () => {
    const initials =
      editName
        .trim()
        .split(/\s+/)
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || userProfile.avatarInitials;

    setUserProfile({
      name: editName.trim() || userProfile.name,
      role: editRole.trim() || userProfile.role,
      department: editDepartment.trim() || userProfile.department,
      clearanceLevel: editClearance.trim() || userProfile.clearanceLevel,
      avatarInitials: initials,
    });
    setIsEditingProfile(false);
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
            SAP ERP connectivity, operator clearance, and application data controls.
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
        <div className="p-3 bg-success-soft border border-success/40 text-success rounded-xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
          <span>{resetSuccessMessage}</span>
        </div>
      )}

      {/* Enterprise & SAP S/4HANA Connectivity */}
      <div className="max-w-xl">
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="border-b border-slate-100 pb-2.5">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Server className="w-4 h-4 text-success" />
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
                <span className="px-2 py-0.5 rounded bg-success-soft text-success font-bold font-mono text-[10px]">
                  MOCK CONNECTOR ACTIVE
                </span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Clean enterprise schema adapters (LFA1 Vendor Master, EINA Purchasing, and MB52 Material Ledger). Configured to connect to SAP BTP and SAP S/4HANA.
              </p>
            </div>

            <div className="pt-1 text-slate-700">
              <div className="flex items-center justify-between pb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Operator Profile
                </span>
                {!isEditingProfile && (
                  <button
                    onClick={startEditingProfile}
                    className="text-[11px] font-bold text-accent hover:text-accent-strong flex items-center gap-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                )}
              </div>

              {isEditingProfile ? (
                <div className="space-y-2.5">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-500 block mb-1">Operator Name</span>
                    <TextInput value={editName} onChange={(e) => setEditName(e.target.value)} />
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-500 block mb-1">Role</span>
                    <TextInput value={editRole} onChange={(e) => setEditRole(e.target.value)} />
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-500 block mb-1">Department</span>
                    <TextInput value={editDepartment} onChange={(e) => setEditDepartment(e.target.value)} />
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-500 block mb-1">Delegated Authority</span>
                    <TextInput value={editClearance} onChange={(e) => setEditClearance(e.target.value)} />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => setIsEditingProfile(false)}
                      className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[11px] font-bold hover:bg-slate-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      className="px-3 py-1.5 bg-primary hover:bg-primary-strong text-ink rounded-lg text-[11px] font-bold shadow-xs transition-colors"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
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
                    <span className="font-mono font-bold text-success">{userProfile.clearanceLevel}</span>
                  </div>
                </div>
              )}
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
