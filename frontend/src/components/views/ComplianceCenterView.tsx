import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Lock,
  ArrowRight,
  FileCheck,
  ShieldAlert,
  Search,
  Filter,
  Info,
} from 'lucide-react';
import { useOilShield } from '../../context/OilShieldContext';
import { ComplianceCheckRule, ScenarioCompliance } from '../../types/oilshield';
import { StatusBadge } from '../common/StatusBadge';

export const ComplianceCenterView: React.FC = () => {
  const { complianceRules, complianceRationale, scenarios, setCurrentView, selectedIncident } = useOilShield();

  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredRules = complianceRules.filter((r) => {
    const matchesCat = categoryFilter === 'ALL' || r.category === categoryFilter;
    const matchesStat = statusFilter === 'ALL' || r.status === statusFilter;
    return matchesCat && matchesStat;
  });

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Compliance Center & Governance Guardrails
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-xs font-bold font-mono">
              Agent 6 Policy Validator
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated verification against SAP Purchasing policies, IMO maritime safety, financial spending authorities, and international sanctions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentView('decisions')}
            className="px-4 py-2 bg-[#154734] hover:bg-[#1b5941] text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-2"
          >
            <span>Go to Human Decision Center</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Strict Compliance Enforcement Banner */}
      <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="p-2.5 bg-[#154734] text-white rounded-xl flex-shrink-0">
            <Lock className="w-5 h-5" />
          </span>
          <div className="space-y-1">
            <div className="font-bold text-sm text-slate-100 flex items-center gap-2">
              <span>Autonomous AI Execution Locked</span>
              <span className="px-2 py-0.5 bg-red-900/60 text-red-200 border border-red-700 text-[10px] font-mono rounded">
                RESTRICTION ENFORCED
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
              Compliance Agent policies strictly forbid direct autonomous execution by AI agents. Any scenario flagged as <strong>RESTRICTED</strong> is blocked entirely. Scenarios marked <strong>REQUIRES REVIEW</strong> require explicit human executive counter-signature.
            </p>
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <span className="text-xs font-mono font-bold text-emerald-400 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 block">
            GRC Audit Status: ACTIVE
          </span>
        </div>
      </div>

      {/* AI-generated plain-English narration of the current verdict — never decides it, only explains
          the rules engine's own result (backend/agents/compliance/llm.py); absent with no GROQ_API_KEY */}
      {complianceRationale && (
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-start gap-3">
          <span className="p-2 bg-slate-100 text-slate-600 rounded-xl flex-shrink-0">
            <Info className="w-4 h-4" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-slate-900">AI Explanation of the Verdict</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200 text-[9px] font-mono font-bold">
                GROQ · NARRATES ONLY, NEVER DECIDES
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">{complianceRationale}</p>
          </div>
        </div>
      )}

      {/* Scenario Compliance Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {scenarios.map((sc) => {
          const isCompliant = sc.complianceStatus === 'COMPLIANT';
          const isRequiresReview = sc.complianceStatus === 'REQUIRES_REVIEW';
          const isRestricted = sc.complianceStatus === 'RESTRICTED';

          return (
            <div
              key={sc.id}
              className={`p-4 rounded-xl border bg-white shadow-xs space-y-2 ${
                isCompliant
                  ? 'border-emerald-200'
                  : isRequiresReview
                  ? 'border-amber-200'
                  : 'border-red-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-slate-900">
                  {sc.code}
                </span>
                <StatusBadge status={sc.complianceStatus} size="sm" />
              </div>

              <h4 className="font-bold text-xs text-slate-900 leading-snug">
                {sc.name}
              </h4>

              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                {isCompliant ? (
                  <span className="text-emerald-700 font-medium">
                    ✓ Pre-audited supplier & approved port terminal.
                  </span>
                ) : isRequiresReview ? (
                  <span className="text-amber-800 font-medium">
                    ⚠ Financial or buffer threshold requires manager sign-off.
                  </span>
                ) : (
                  <span className="text-red-700 font-medium">
                    ✕ Blocked: Unapproved or sanctioned entities.
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 font-medium">Category:</span>
          {['ALL', 'Supplier Eligibility', 'Maritime Safety', 'Financial Threshold', 'Sanctions & ESG'].map((c) => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                categoryFilter === c
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {c === 'ALL' ? 'All Categories' : c}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 font-medium">Status:</span>
          {['ALL', 'COMPLIANT', 'REQUIRES_REVIEW', 'RESTRICTED'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === s
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s === 'ALL' ? 'All' : s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Detailed Compliance Rules Table (Exact items requested in Section 5) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">
            Configured Governance Rules, Sanction Checks & Audit Findings
          </h3>
          <span className="text-xs text-slate-500 font-mono">
            Verified by Agent 6 at 14:38:50 UTC
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Rule Code</th>
                <th className="py-3 px-3">Rule Name & Scope</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Applies To</th>
                <th className="py-3 px-3">Compliance Result</th>
                <th className="py-3 px-3">Evidence Summary</th>
                <th className="py-3 px-4">Required Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRules.map((rule) => {
                const isRestricted = rule.status === 'RESTRICTED';
                return (
                  <tr
                    key={rule.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isRestricted ? 'bg-red-50/30' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {rule.ruleCode}
                    </td>

                    <td className="py-3 px-3 font-semibold text-slate-800">
                      {rule.ruleName}
                    </td>

                    <td className="py-3 px-3 text-slate-600">
                      {rule.category}
                    </td>

                    <td className="py-3 px-3 font-mono font-medium text-slate-700">
                      {rule.appliesToScenario}
                    </td>

                    <td className="py-3 px-3">
                      <StatusBadge status={rule.status} size="sm" />
                    </td>

                    <td className="py-3 px-3 text-slate-600 leading-relaxed max-w-xs">
                      {rule.evidenceSummary}
                    </td>

                    <td className="py-3 px-4 text-slate-800 font-medium">
                      {rule.requiredAction}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
