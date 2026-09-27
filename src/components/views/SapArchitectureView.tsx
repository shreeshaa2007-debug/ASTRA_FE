import React from 'react';
import { Card, CardTitle } from '../common/ui';
import { ViewMode } from '../../types';

interface SapArchitectureViewProps {
  onNavigate: (view: ViewMode) => void;
}

export const SapArchitectureView: React.FC<SapArchitectureViewProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="p-6 md:p-8 rounded-2xl bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 text-white shadow-xl border border-blue-700/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <span className="material-symbols-outlined text-[180px]">hub</span>
        </div>
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-[11px] font-mono font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            SAP Hackathon Enterprise Solution
          </div>
          <h1 className="text-2xl md:text-4xl font-headline font-bold tracking-tight text-white">
            ResilientSC: Enterprise Agentic AI on SAP BTP
          </h1>
          <p className="text-sm md:text-base text-blue-100/90 leading-relaxed font-body">
            Transforming vulnerable linear supply chains into autonomous, self-healing networks. Powered by SAP S/4HANA, SAP IBP, SAP Build Process Automation, and 5 coordinated AI agents.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('simulator')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-900/50 transition-all active:scale-95 flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">bolt</span>
              Launch Disruption Simulator
            </button>
            <a
              href="http://localhost:8000/approval"
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">verified_user</span>
              Open Built-in Approval Portal ↗
            </a>
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">api</span>
              Interactive OpenAPI Docs ↗
            </a>
          </div>
        </div>
      </div>

      {/* Value Proposition Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-card border border-line rounded-2xl shadow-card space-y-1">
          <span className="text-muted text-[11px] font-mono font-semibold uppercase">Decision Latency</span>
          <div className="text-2xl font-bold font-headline text-success">2.4 Seconds</div>
          <p className="text-[12px] text-ink-2">Down from 48-72 hours of manual committee meetings during disruptions.</p>
        </div>
        <div className="p-5 bg-card border border-line rounded-2xl shadow-card space-y-1">
          <span className="text-muted text-[11px] font-mono font-semibold uppercase">Cost Avoidance</span>
          <div className="text-2xl font-bold font-headline text-primary">-18.4% Net Spend</div>
          <p className="text-[12px] text-ink-2">Joint solver optimizes landed tariffs, freight expedites &amp; inventory buffers.</p>
        </div>
        <div className="p-5 bg-card border border-line rounded-2xl shadow-card space-y-1">
          <span className="text-muted text-[11px] font-mono font-semibold uppercase">Compliance Governance</span>
          <div className="text-2xl font-bold font-headline text-ink">100% Policy Adherence</div>
          <p className="text-[12px] text-ink-2">Sanctions, ESG limits, and budget thresholds strictly enforced before human signoff.</p>
        </div>
        <div className="p-5 bg-card border border-line rounded-2xl shadow-card space-y-1">
          <span className="text-muted text-[11px] font-mono font-semibold uppercase">SAP Integration</span>
          <div className="text-2xl font-bold font-headline text-warning">Zero Cloud Lock-in</div>
          <p className="text-[12px] text-ink-2">Seamless dual-mode: direct SAP BTP (SBPA/HANA) or standalone Python fallback.</p>
        </div>
      </div>

      {/* SAP BTP Integration Architecture Map */}
      <Card className="p-6">
        <CardTitle
          title="SAP BTP &amp; Agentic AI Solution Architecture"
          hint="How ResilientSC layers Autonomous Agents over SAP Enterprise systems"
        />

        <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: SAP Core Enterprise */}
          <div className="p-5 rounded-xl bg-inset border border-line space-y-4">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-blue-500/10 text-blue-600 font-bold material-symbols-outlined text-[20px]">
                database
              </span>
              <div>
                <h3 className="font-headline font-bold text-sm text-ink">1. SAP Core Systems</h3>
                <span className="text-[11px] text-muted font-mono">System of Record &amp; Master Data</span>
              </div>
            </div>

            <ul className="space-y-3 text-[12px]">
              <li className="p-3 bg-card rounded-lg border border-line space-y-1">
                <strong className="text-ink font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> SAP S/4HANA &amp; HANA Cloud
                </strong>
                <p className="text-ink-2 text-[11px]">
                  Stores supplier master catalogs, purchase order ledgers, and multi-warehouse inventory levels in in-memory columnar tables.
                </p>
              </li>
              <li className="p-3 bg-card rounded-lg border border-line space-y-1">
                <strong className="text-ink font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> SAP Integrated Business Planning (IBP)
                </strong>
                <p className="text-ink-2 text-[11px]">
                  Provides baseline demand forecasts, capacity constraints, and sales &amp; operations planning (S&amp;OP) targets.
                </p>
              </li>
              <li className="p-3 bg-card rounded-lg border border-line space-y-1">
                <strong className="text-ink font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> SAP Event Mesh
                </strong>
                <p className="text-ink-2 text-[11px]">
                  Standardized CloudEvents pub/sub distributing disruption signals across enterprise boundaries asynchronously.
                </p>
              </li>
            </ul>
          </div>

          {/* Column 2: Multi-Agent AI Orchestration */}
          <div className="p-5 rounded-xl bg-inset border border-primary/30 space-y-4 relative">
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-primary text-white">
              CORE INNOVATION
            </div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-primary/10 text-primary font-bold material-symbols-outlined text-[20px]">
                smart_toy
              </span>
              <div>
                <h3 className="font-headline font-bold text-sm text-ink">2. Multi-Agent AI Mesh</h3>
                <span className="text-[11px] text-muted font-mono">Autonomous Sensing &amp; Mitigation</span>
              </div>
            </div>

            <ul className="space-y-2.5 text-[11px]">
              <li className="p-2.5 bg-card rounded-lg border border-line flex items-start gap-2">
                <span className="font-mono font-bold text-primary">01</span>
                <div>
                  <strong className="text-ink">Sensing Agent (Gemini 2.5 Flash):</strong>
                  <p className="text-ink-2">Ingests real-time port delays, NOAA storms &amp; news into structured events.</p>
                </div>
              </li>
              <li className="p-2.5 bg-card rounded-lg border border-line flex items-start gap-2">
                <span className="font-mono font-bold text-primary">02</span>
                <div>
                  <strong className="text-ink">Inventory Agent (XGBoost ML):</strong>
                  <p className="text-ink-2">Calculates dynamic safety stock and identifies warehouse stockout risks.</p>
                </div>
              </li>
              <li className="p-2.5 bg-card rounded-lg border border-line flex items-start gap-2">
                <span className="font-mono font-bold text-primary">03</span>
                <div>
                  <strong className="text-ink">Sourcing Agent (Greedy Landed-Cost):</strong>
                  <p className="text-ink-2">Explores alternative Tier-1/Tier-2 suppliers and calculates tariff impacts.</p>
                </div>
              </li>
              <li className="p-2.5 bg-card rounded-lg border border-line flex items-start gap-2">
                <span className="font-mono font-bold text-primary">04</span>
                <div>
                  <strong className="text-ink">Logistics Agent (Route Optimization):</strong>
                  <p className="text-ink-2">Reroutes shipments around choked maritime bottlenecks (Cape/Rail/Air).</p>
                </div>
              </li>
              <li className="p-2.5 bg-card rounded-lg border border-line flex items-start gap-2">
                <span className="font-mono font-bold text-primary">05</span>
                <div>
                  <strong className="text-ink">Compliance Agent (Deterministic Policy):</strong>
                  <p className="text-ink-2">Audits budget tolerances, trade sanctions &amp; ESG limits before committing.</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Column 3: Governance & Human Task */}
          <div className="p-5 rounded-xl bg-inset border border-line space-y-4">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 font-bold material-symbols-outlined text-[20px]">
                verified_user
              </span>
              <div>
                <h3 className="font-headline font-bold text-sm text-ink">3. Human Governance</h3>
                <span className="text-[11px] text-muted font-mono">SAP SBPA &amp; Approval Portal</span>
              </div>
            </div>

            <ul className="space-y-3 text-[12px]">
              <li className="p-3 bg-card rounded-lg border border-line space-y-1">
                <strong className="text-ink font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> SAP Build Process Automation
                </strong>
                <p className="text-ink-2 text-[11px]">
                  Routes high-budget or high-risk disruptions to executive approvers with full explainability trace and rollback safeguards.
                </p>
              </li>
              <li className="p-3 bg-card rounded-lg border border-line space-y-1">
                <strong className="text-ink font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Built-in HTML Approval Portal
                </strong>
                <p className="text-ink-2 text-[11px]">
                  Self-contained inbox allowing one-click decisions and automated SMTP notifications without requiring external cloud accounts.
                </p>
              </li>
              <li className="p-3 bg-card rounded-lg border border-line space-y-1">
                <strong className="text-ink font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Complete Audit Trail
                </strong>
                <p className="text-ink-2 text-[11px]">
                  Immutable ledger storing the disruption snapshot, agent reasoning steps, solver metrics, and human sign-off timestamps.
                </p>
              </li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Multi-Agent Collaboration Workflow */}
      <Card className="p-6">
        <CardTitle
          title="End-to-End Autonomous Pipeline Flow"
          hint="From Real-Time Port Disruption to Final Order Dispatch"
        />

        <div className="mt-4 p-4 bg-inset rounded-xl font-mono text-[11px] text-ink overflow-x-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-center">
            <div className="p-3 bg-card rounded-lg border border-line flex-1">
              <div className="text-danger font-bold">1. SENSORY INGESTION</div>
              <div className="text-muted text-[10px] mt-1">Real-time Port Delay / Canal Blockade</div>
            </div>
            <span className="text-muted font-bold">→</span>
            <div className="p-3 bg-card rounded-lg border border-line flex-1">
              <div className="text-warning font-bold">2. AGENT ASSESSMENTS</div>
              <div className="text-muted text-[10px] mt-1">Stockout Risk + Supplier Capacity</div>
            </div>
            <span className="text-muted font-bold">→</span>
            <div className="p-3 bg-card rounded-lg border border-line flex-1">
              <div className="text-primary font-bold">3. JOINT OPTIMIZATION</div>
              <div className="text-muted text-[10px] mt-1">Mathematical MIP (Spend vs ETA)</div>
            </div>
            <span className="text-muted font-bold">→</span>
            <div className="p-3 bg-card rounded-lg border border-line flex-1">
              <div className="text-emerald-600 font-bold">4. SAP SBPA APPROVAL</div>
              <div className="text-muted text-[10px] mt-1">Executive Signoff / Fast-Track</div>
            </div>
            <span className="text-muted font-bold">→</span>
            <div className="p-3 bg-card rounded-lg border border-line flex-1">
              <div className="text-ink font-bold">5. SAP S/4HANA PO EXECUTION</div>
              <div className="text-muted text-[10px] mt-1">PO Dispatch &amp; Booking</div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
