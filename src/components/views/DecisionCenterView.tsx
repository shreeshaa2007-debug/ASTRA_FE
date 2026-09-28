import React, { useState } from 'react';
import {
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  ArrowRight,
  ShieldAlert,
  Edit3,
  XCircle,
  FileCheck,
  Hash,
} from 'lucide-react';
import { useOilShield } from '../../context/OilShieldContext';
import { StatusBadge } from '../common/StatusBadge';

export const DecisionCenterView: React.FC = () => {
  const {
    operationalShipments,
    selectedShipment,
    selectedShipmentId,
    setSelectedShipmentId,
    dynamicRecoveryOptions,
    selectedRecoveryOption,
    selectedRecoveryOptionId,
    setSelectedRecoveryOptionId,
    approveRecoveryOption,
    rejectRecoveryOption,
    modifyRecoveryOption,
    userProfile,
    setCurrentView,
    emergencySpendLimit,
  } = useOilShield();

  // Modals
  const [isApproveModalOpen, setIsApproveModalOpen] = useState<boolean>(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState<boolean>(false);
  const [isModifyModalOpen, setIsModifyModalOpen] = useState<boolean>(false);

  // Form states
  const [approvalNotes, setApprovalNotes] = useState<string>(
    'Authorized for immediate execution. All maritime, quality, and financial criteria confirmed.'
  );
  const [rejectReason, setRejectReason] = useState<string>('Cost exceeds emergency tolerance threshold');
  const [rejectNotes, setRejectNotes] = useState<string>('');
  const [modifyNotes, setModifyNotes] = useState<string>('Adjusted dispatch schedule for port berth clearance.');
  const [modifyQuantity, setModifyQuantity] = useState<number>(selectedRecoveryOption.quantityBarrels);

  const isApproved =
    selectedRecoveryOption.humanApprovalStatus === 'APPROVED' ||
    selectedRecoveryOption.humanApprovalStatus === 'MODIFIED_APPROVED';
  const isRejected = selectedRecoveryOption.humanApprovalStatus === 'REJECTED';

  const handleConfirmApprove = () => {
    approveRecoveryOption(selectedRecoveryOption.id, userProfile.name, approvalNotes);
    setIsApproveModalOpen(false);
  };

  const handleConfirmReject = () => {
    rejectRecoveryOption(selectedRecoveryOption.id, rejectReason, rejectNotes);
    setIsRejectModalOpen(false);
  };

  const handleConfirmModify = () => {
    modifyRecoveryOption(
      selectedRecoveryOption.id,
      { quantityBarrels: modifyQuantity },
      modifyNotes
    );
    setIsModifyModalOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Approvals & Decision Center
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational human-in-the-loop authorization checkpoint. Consequential actions require approval.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentView('audit')}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors border border-slate-200 flex items-center gap-1.5"
          >
            <span>View Audit Trail</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Shipment & Option Selector Strip */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-700">Shipment:</span>
          <select
            value={selectedShipmentId}
            onChange={(e) => setSelectedShipmentId(e.target.value)}
            className="bg-slate-50 border border-slate-300 text-xs font-bold rounded-lg px-2.5 py-1 text-slate-900 focus:outline-hidden"
          >
            {operationalShipments.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id} — {s.vesselName} ({s.delayHours > 0 ? `+${s.delayHours}h` : 'OK'})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-700">Recovery Plan:</span>
          <select
            value={selectedRecoveryOptionId}
            onChange={(e) => setSelectedRecoveryOptionId(e.target.value)}
            className="bg-slate-50 border border-slate-300 text-xs font-bold rounded-lg px-2.5 py-1 text-slate-900 focus:outline-hidden max-w-xs truncate"
          >
            {dynamicRecoveryOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.title} (+{opt.etaDeltaHours}h, ${(opt.costUsd / 1000).toFixed(0)}k)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Official Approval Status Banner if Authorized */}
      {isApproved && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-400 rounded-xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-start gap-3">
            <span className="p-2 bg-emerald-600 text-white rounded-lg flex-shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-emerald-950 text-sm">
                  PLAN OFFICIALLY AUTHORIZED FOR EXECUTION
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 font-mono text-[10px] font-bold">
                  ERP WORK ORDERS DISPATCHED
                </span>
              </div>
              <p className="text-xs text-emerald-800 mt-0.5">
                Authorized by <strong>{selectedRecoveryOption.approvedBy || userProfile.name}</strong> at{' '}
                {selectedRecoveryOption.approvedAt || 'Immediate'}. Notes: "{selectedRecoveryOption.approvalNotes || 'Operational sign-off granted.'}"
              </p>
            </div>
          </div>

          <button
            onClick={() => setCurrentView('audit')}
            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors whitespace-nowrap self-end md:self-center"
          >
            Inspect Audit Entry →
          </button>
        </div>
      )}

      {/* Rejection Banner if Rejected */}
      {isRejected && (
        <div className="p-3.5 bg-red-50 border border-red-300 rounded-xl text-xs text-red-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>
              <strong>Plan Rejected:</strong> {selectedRecoveryOption.rejectionReason || 'Declined by operator.'}
            </span>
          </div>
          <button
            onClick={() => setCurrentView('scenarios')}
            className="text-xs font-bold text-red-700 hover:text-red-900 underline whitespace-nowrap"
          >
            Select Alternative Plan →
          </button>
        </div>
      )}

      {/* Main Grid: Plan Details (Left) + Integrated Compliance & Approvals (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: Selected Recovery Action Details */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="border-b border-slate-100 pb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">
                {selectedRecoveryOption.category}
              </span>
              <h2 className="text-lg font-bold text-slate-900 leading-snug">
                {selectedRecoveryOption.title}
              </h2>
            </div>
            <div className="flex items-center gap-1.5">
              <StatusBadge status={selectedRecoveryOption.complianceStatus} size="sm" />
              <StatusBadge status={selectedRecoveryOption.humanApprovalStatus} size="sm" />
            </div>
          </div>

          {/* Key Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Recovered Cargo</span>
              <span className="font-mono font-bold text-sm text-slate-900 block mt-0.5">
                {selectedRecoveryOption.quantityBarrels.toLocaleString()} bbl
              </span>
              <span className="text-[10px] text-slate-500 block">100% of cargo</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Recovery Delay</span>
              <span className="font-mono font-bold text-sm text-slate-900 block mt-0.5">
                +{selectedRecoveryOption.etaDeltaHours}h
              </span>
              <span className="text-[10px] text-emerald-700 font-semibold block">
                {selectedShipment.delayHours > selectedRecoveryOption.etaDeltaHours
                  ? `-${selectedShipment.delayHours - selectedRecoveryOption.etaDeltaHours}h saved`
                  : 'Baseline'}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Approved Spend</span>
              <span className="font-mono font-bold text-sm text-slate-900 block mt-0.5">
                ${(selectedRecoveryOption.costUsd / 1000).toFixed(0)}k
              </span>
              <span className="text-[10px] text-slate-500 font-mono block">
                ${selectedRecoveryOption.costPerBbl.toFixed(2)}/bbl
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Feasibility</span>
              <span className="font-mono font-bold text-sm text-emerald-600 block mt-0.5">
                {selectedRecoveryOption.feasibilityScore}%
              </span>
              <span className="text-[10px] text-slate-500 block">Validated</span>
            </div>
          </div>

          {/* Operational Scope */}
          <div className="space-y-2 text-xs">
            <span className="font-bold text-slate-800 block">Operational Execution Summary</span>
            <p className="text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 leading-relaxed">
              {selectedRecoveryOption.operationalSummary}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 block text-[11px]">Route & Destination:</span>
                <span className="font-semibold text-slate-800 block mt-0.5">{selectedRecoveryOption.route}</span>
                <span className="text-slate-600 text-[11px] block mt-0.5">→ {selectedRecoveryOption.destination}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 block text-[11px]">Downstream Impact:</span>
                <span className="font-semibold text-slate-800 block mt-0.5">{selectedRecoveryOption.inventoryImpact}</span>
                <span className="text-slate-600 text-[11px] block mt-0.5">{selectedRecoveryOption.customerImpact}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Integrated Compliance & Action Buttons (Section 12 Requirement) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3.5">
            {/* Compliance Header */}
            <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Compliance Checks</span>
              </h3>
              <StatusBadge status={selectedRecoveryOption.complianceStatus} size="sm" />
            </div>

            {/* Compliance Checks List (Only for this specific option) */}
            <div className="space-y-2 text-xs">
              {selectedRecoveryOption.complianceChecks.map((chk, idx) => (
                <div key={idx} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">{chk.name}</span>
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                        chk.status === 'PASS'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {chk.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    {chk.detail}
                  </p>
                </div>
              ))}

              {/* Warning/Blocker Banner if spending exceeds limit */}
              {selectedRecoveryOption.costUsd > emergencySpendLimit && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-300 text-amber-900 space-y-1">
                  <div className="font-bold text-xs flex items-center gap-1 text-amber-800">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Delegation Threshold Warning</span>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    Cost of ${(selectedRecoveryOption.costUsd / 1000).toFixed(0)}k exceeds single-operator delegated spending limit of ${(emergencySpendLimit / 1000).toFixed(0)}k. Secondary executive sign-off recorded.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons Together on this page (Approve, Modify, Reject) */}
          <div className="space-y-2 pt-3 border-t border-slate-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block text-center">
              Human Authorization Actions
            </span>

            <button
              onClick={() => setIsApproveModalOpen(true)}
              disabled={isApproved}
              className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 ${
                isApproved
                  ? 'bg-emerald-100 text-emerald-800 cursor-not-allowed border border-emerald-300'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isApproved ? 'Plan Already Authorized' : 'Approve & Execute Action'}</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setIsModifyModalOpen(true)}
                className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors border border-slate-200 flex items-center justify-center gap-1"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Modify</span>
              </button>

              <button
                onClick={() => setIsRejectModalOpen(true)}
                className="py-2 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 rounded-lg text-xs font-bold transition-colors border border-slate-200 flex items-center justify-center gap-1"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Reject</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* APPROVAL MODAL */}
      {isApproveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-5 space-y-4 shadow-pop border border-slate-200">
            <div className="border-b border-slate-100 pb-2.5">
              <h3 className="font-bold text-base text-slate-900">
                Authorize Recovery Execution
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Confirm formal human sign-off for {selectedRecoveryOption.title}.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Shipment:</span>
                <span className="font-bold text-slate-900">{selectedShipment.id}</span>
              </div>
              <div className="flex justify-between">
                <span>Approved Spend:</span>
                <span className="font-bold text-slate-900">${(selectedRecoveryOption.costUsd / 1000).toFixed(0)}k</span>
              </div>
              <div className="flex justify-between">
                <span>Approver:</span>
                <span className="font-bold text-slate-900">{userProfile.name} ({userProfile.role})</span>
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <label className="font-semibold text-slate-700">Approval Remarks / Notes:</label>
              <textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                rows={3}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-[#154734] focus:ring-1 focus:ring-[#154734]/20"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsApproveModalOpen(false)}
                className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmApprove}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs"
              >
                Sign & Dispatch Orders
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-5 space-y-4 shadow-pop border border-slate-200">
            <div className="border-b border-slate-100 pb-2.5">
              <h3 className="font-bold text-base text-slate-900">
                Reject Recovery Plan
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Specify reason for rejecting {selectedRecoveryOption.title}.
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <label className="font-semibold text-slate-700">Rejection Reason:</label>
              <select
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden"
              >
                <option>Cost exceeds emergency tolerance threshold</option>
                <option>Alternative logistics corridor preferred</option>
                <option>Refinery turnaround schedule changed</option>
                <option>Commercial negotiation in progress</option>
              </select>

              <label className="font-semibold text-slate-700 mt-2 block">Additional Remarks:</label>
              <textarea
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                placeholder="Optional explanation for audit records..."
                rows={2}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsRejectModalOpen(false)}
                className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-xs"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODIFY MODAL */}
      {isModifyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-5 space-y-4 shadow-pop border border-slate-200">
            <div className="border-b border-slate-100 pb-2.5">
              <h3 className="font-bold text-base text-slate-900">
                Modify & Approve Parameters
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Adjust operational parameters before human sign-off.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Adjust Recovered Volume (Barrels):
                </label>
                <input
                  type="number"
                  value={modifyQuantity}
                  onChange={(e) => setModifyQuantity(Number(e.target.value))}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Modification Justification:
                </label>
                <textarea
                  value={modifyNotes}
                  onChange={(e) => setModifyNotes(e.target.value)}
                  rows={2}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsModifyModalOpen(false)}
                className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmModify}
                className="px-4 py-1.5 bg-[#154734] hover:bg-[#1b5941] text-white rounded-lg text-xs font-bold shadow-xs"
              >
                Save & Authorize
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
