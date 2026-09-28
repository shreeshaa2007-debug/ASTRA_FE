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
  Users,
  Factory,
  Ship,
  TrendingUp,
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
    selectedIncident,
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
        <div className="p-4 bg-success-soft border-2 border-success/50 rounded-xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-start gap-3">
            <span className="p-2 bg-success text-white rounded-lg flex-shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-success text-sm">
                  PLAN OFFICIALLY AUTHORIZED FOR EXECUTION
                </span>
                <span className="px-2 py-0.5 rounded bg-success-soft text-success font-mono text-[10px] font-bold">
                  ERP WORK ORDERS DISPATCHED
                </span>
              </div>
              <p className="text-xs text-success mt-0.5">
                Authorized by <strong>{selectedRecoveryOption.approvedBy || userProfile.name}</strong> at{' '}
                {selectedRecoveryOption.approvedAt || 'Immediate'}. Notes: "{selectedRecoveryOption.approvalNotes || 'Operational sign-off granted.'}"
              </p>
            </div>
          </div>

          <button
            onClick={() => setCurrentView('audit')}
            className="px-3 py-1.5 bg-success hover:opacity-90 text-white rounded-lg text-xs font-bold transition-colors whitespace-nowrap self-end md:self-center"
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

      {/* Stakeholder Impact Split: who is exposed if unresolved (left) vs who benefits from the AI-proposed plan (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        {/* LEFT: Stakeholders facing the alert / threat from the live disruption */}
        <div className="bg-white rounded-xl border-2 border-red-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 bg-red-50 border-b border-red-200 flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5">
              <span className="p-1.5 bg-red-600 text-white rounded-lg flex-shrink-0 mt-0.5">
                <AlertTriangle className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-red-900">Stakeholders Facing Impact</h3>
                <p className="text-[11px] text-red-700 mt-0.5">
                  {selectedIncident.type} at {selectedIncident.location} — exposure if left unresolved
                </p>
              </div>
            </div>
            <StatusBadge status={selectedIncident.severity} size="sm" />
          </div>

          <div className="p-4 space-y-3 flex-1">
            {/* Exposure Metrics */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 bg-red-50/70 rounded-lg border border-red-100">
                <span className="text-[9px] text-red-600 font-bold uppercase block">Exposure</span>
                <span className="font-mono font-bold text-sm text-red-800 block mt-0.5">
                  ${(selectedIncident.estimatedExposureValueUsd / 1000).toFixed(0)}k
                </span>
              </div>
              <div className="p-2.5 bg-red-50/70 rounded-lg border border-red-100">
                <span className="text-[9px] text-red-600 font-bold uppercase block">Barrels at Risk</span>
                <span className="font-mono font-bold text-sm text-red-800 block mt-0.5">
                  {selectedIncident.totalNetworkExposureBarrels.toLocaleString()}
                </span>
              </div>
              <div className="p-2.5 bg-red-50/70 rounded-lg border border-red-100">
                <span className="text-[9px] text-red-600 font-bold uppercase block">Delay</span>
                <span className="font-mono font-bold text-sm text-red-800 block mt-0.5">
                  +{selectedIncident.estimatedDelayHours}h
                </span>
              </div>
            </div>

            {/* Affected Stakeholders */}
            <div className="space-y-2">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                  <Users className="w-3.5 h-3.5 text-red-500" />
                  <span>Offtake Customer</span>
                </div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">{selectedIncident.affectedCustomer}</div>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                  Awaiting {selectedIncident.quantityBarrels.toLocaleString()} bbl {selectedIncident.product}. {selectedIncident.berthDelayTrend}
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                  <Factory className="w-3.5 h-3.5 text-red-500" />
                  <span>Downstream Refinery</span>
                </div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">{selectedIncident.affectedRefinery}</div>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{selectedIncident.rootCause}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                  <span>Fleet / Network Operator</span>
                </div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  {selectedIncident.affectedShipmentCount} shipment{selectedIncident.affectedShipmentCount === 1 ? '' : 's'} affected
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                  {selectedIncident.totalNetworkExposureBarrels.toLocaleString()} bbl network-wide exposure while disruption persists.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Stakeholders benefiting from the agentic AI's proposed recovery plan */}
        <div className="bg-white rounded-xl border-2 border-success/40 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 bg-success-soft border-b border-success/30 flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5">
              <span className="p-1.5 bg-success text-white rounded-lg flex-shrink-0 mt-0.5">
                <TrendingUp className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-success">Stakeholders Benefiting From Recovery Plan</h3>
                <p className="text-[11px] text-success/80 mt-0.5">{selectedRecoveryOption.title}</p>
              </div>
            </div>
            <StatusBadge status={selectedRecoveryOption.complianceStatus} size="sm" />
          </div>

          <div className="p-4 space-y-3 flex-1">
            {/* Benefit Metrics */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 bg-success-soft/70 rounded-lg border border-success/20">
                <span className="text-[9px] text-success font-bold uppercase block">Recovered</span>
                <span className="font-mono font-bold text-sm text-success block mt-0.5">
                  {selectedRecoveryOption.quantityBarrels.toLocaleString()} bbl
                </span>
              </div>
              <div className="p-2.5 bg-success-soft/70 rounded-lg border border-success/20">
                <span className="text-[9px] text-success font-bold uppercase block">Spend</span>
                <span className="font-mono font-bold text-sm text-success block mt-0.5">
                  ${(selectedRecoveryOption.costUsd / 1000).toFixed(0)}k
                </span>
              </div>
              <div className="p-2.5 bg-success-soft/70 rounded-lg border border-success/20">
                <span className="text-[9px] text-success font-bold uppercase block">Feasibility</span>
                <span className="font-mono font-bold text-sm text-success block mt-0.5">
                  {selectedRecoveryOption.feasibilityScore}%
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-relaxed">
              {selectedRecoveryOption.operationalSummary}
            </p>

            {/* Benefiting Stakeholders — same real-world entities as the left column, now protected */}
            <div className="space-y-2">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                  <Users className="w-3.5 h-3.5 text-success" />
                  <span>Offtake Customer — Protected</span>
                </div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">{selectedIncident.affectedCustomer}</div>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{selectedRecoveryOption.customerImpact}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                  <Factory className="w-3.5 h-3.5 text-success" />
                  <span>Downstream Refinery — Secured</span>
                </div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">{selectedIncident.affectedRefinery}</div>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{selectedRecoveryOption.inventoryImpact}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                  <Ship className="w-3.5 h-3.5 text-success" />
                  <span>Recovery Supplier</span>
                </div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">{selectedRecoveryOption.supplier}</div>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                  {selectedRecoveryOption.quantityBarrels.toLocaleString()} bbl via {selectedRecoveryOption.route} → {selectedRecoveryOption.destination} (+{selectedRecoveryOption.etaDeltaHours}h)
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Compliance Checks — full width, below the stakeholder comparison */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-3">
        <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-success" />
            <span>Compliance Checks</span>
          </h3>
          <StatusBadge status={selectedRecoveryOption.complianceStatus} size="sm" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
          {selectedRecoveryOption.complianceChecks.map((chk, idx) => (
            <div key={idx} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">{chk.name}</span>
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                    chk.status === 'PASS'
                      ? 'bg-success-soft text-success'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {chk.status}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">{chk.detail}</p>
            </div>
          ))}
        </div>

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

      {/* Human Authorization Actions — full width action bar, below both stakeholder columns and compliance */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Human Authorization Actions
          </span>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setIsRejectModalOpen(true)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 rounded-lg text-xs font-bold transition-colors border border-slate-200 flex items-center justify-center gap-1.5"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Reject</span>
            </button>

            <button
              onClick={() => setIsModifyModalOpen(true)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors border border-slate-200 flex items-center justify-center gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Modify</span>
            </button>

            <button
              onClick={() => setIsApproveModalOpen(true)}
              disabled={isApproved}
              className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 ${
                isApproved
                  ? 'bg-success-soft text-success cursor-not-allowed border border-success/30'
                  : 'bg-success hover:opacity-90 text-white'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isApproved ? 'Plan Already Authorized' : 'Approve & Execute Action'}</span>
            </button>
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
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-accent focus:ring-1 focus:ring-accent/20"
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
                className="px-4 py-1.5 bg-success hover:opacity-90 text-white rounded-lg text-xs font-bold shadow-xs"
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
                className="px-4 py-1.5 bg-primary hover:bg-primary-strong text-ink rounded-lg text-xs font-bold shadow-xs"
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
