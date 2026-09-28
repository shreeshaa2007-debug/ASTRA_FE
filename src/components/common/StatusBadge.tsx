import React from 'react';
import {
  DisruptionSeverity,
  ScenarioCompliance,
  SupplierApprovalStatus,
  HumanApprovalStatus,
} from '../../types/oilshield';

interface StatusBadgeProps {
  status:
    | DisruptionSeverity
    | ScenarioCompliance
    | SupplierApprovalStatus
    | HumanApprovalStatus
    | 'ONLINE'
    | 'ACTIVE'
    | 'PROCESSING'
    | 'IDLE'
    | 'COMPLETED'
    | 'NORMAL'
    | 'AT_RISK'
    | 'DISRUPTED'
    | 'UNDER_ANALYSIS'
    | string;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showDot = true,
}) => {
  let bgClass = 'bg-slate-100 text-slate-700 border-slate-200';
  let dotClass = 'bg-slate-400';
  let label = status;

  switch (status) {
    // Critical / Danger / Disrupted
    case 'CRITICAL':
    case 'DISRUPTED':
    case 'RESTRICTED':
    case 'REJECTED':
      bgClass = 'bg-red-50 text-red-700 border-red-200';
      dotClass = 'bg-red-500';
      break;

    // High / Warning
    case 'HIGH':
    case 'REQUIRES_REVIEW':
    case 'PENDING_REVIEW':
    case 'AT_RISK':
    case 'WARNING':
    case 'ESCALATED':
      bgClass = 'bg-amber-50 text-amber-800 border-amber-200';
      dotClass = 'bg-amber-500';
      break;

    // Normal / Success / Compliant
    case 'LOW':
    case 'NORMAL':
    case 'APPROVED':
    case 'MODIFIED_APPROVED':
    case 'COMPLIANT':
    case 'COMPLETED':
    case 'ONLINE':
      bgClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      dotClass = 'bg-emerald-500';
      break;

    // Medium / Info / Processing
    case 'MEDIUM':
    case 'PROCESSING':
    case 'ACTIVE':
    case 'UNDER_ANALYSIS':
    case 'ACTIVE_ANALYZING':
    case 'AWAITING_APPROVAL':
    case 'ANALYSIS_REQUESTED':
    case 'INFO':
      bgClass = 'bg-slate-100 text-slate-700 border-slate-200';
      dotClass = 'bg-slate-500';
      break;

    case 'APPROVED_EXECUTING':
      bgClass = 'bg-emerald-50 text-emerald-800 border-emerald-300';
      dotClass = 'bg-emerald-600';
      label = 'Executing Approved Plan';
      break;

    default:
      break;
  }

  // Format label for display
  if (status === 'AWAITING_APPROVAL') label = 'Awaiting Human Approval';
  if (status === 'ACTIVE_ANALYZING') label = 'Active (Analyzing)';
  if (status === 'REQUIRES_REVIEW') label = 'Requires Review';
  if (status === 'MODIFIED_APPROVED') label = 'Approved with Modifications';
  if (status === 'UNDER_ANALYSIS') label = 'Under Analysis';
  if (status === 'PENDING_REVIEW') label = 'Pending Review';

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-semibold',
    lg: 'text-sm px-3 py-1.5 font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${bgClass} ${sizeClasses[size]} tracking-tight`}
    >
      {showDot && <span className={`h-1.5 w-1.5 rounded-full ${dotClass} flex-shrink-0`} />}
      <span>{label}</span>
    </span>
  );
};
