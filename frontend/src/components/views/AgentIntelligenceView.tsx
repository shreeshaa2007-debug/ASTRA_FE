import React, { useState } from 'react';
import {
  Bot,
  AlertOctagon,
  Building2,
  Compass,
  Database,
  Workflow,
  ShieldCheck,
  Code,
  ArrowRight,
  CheckCircle2,
  Clock,
  Zap,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Layers,
  Network,
  Share2,
} from 'lucide-react';
import { useOilShield } from '../../context/OilShieldContext';
import { StatusBadge } from '../common/StatusBadge';
import { SpecializedAgent } from '../../types/oilshield';

export const AgentIntelligenceView: React.FC = () => {
  const { agents, setCurrentView, selectedIncident } = useOilShield();
  const [selectedAgentId, setSelectedAgentId] = useState<string>('agent-1');
  const [expandedJsonAgentId, setExpandedJsonAgentId] = useState<string | null>(null);

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) || agents[0];

  const agentIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    'agent-1': AlertOctagon,
    'agent-2': Building2,
    'agent-3': Compass,
    'agent-4': Database,
    'agent-5': Workflow,
    'agent-6': ShieldCheck,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Agent Intelligence Command
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-primary-soft text-accent-strong border border-primary-border text-xs font-bold font-mono">
              6 Specialized AI Agents
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Decentralized agentic architecture: specialized domain agents collaborate via structured schema exchange without generic chatbots.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentView('decisions')}
            className="px-4 py-2 bg-primary hover:bg-primary-strong text-ink rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-2"
          >
            <span>Go to Human Decision Center</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* SECTION 6: MULTI-AGENT RECOVERY WORKFLOW (VISUAL PIPELINE GRAPH) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Share2 className="w-4 h-4 text-accent" />
              <span>Multi-Agent Recovery Workflow Architecture</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Strict acyclic coordination protocol: Disruption Sensing → Impact Topology → Parallel Domain Specialists → Recovery Synthesis → Compliance Gate → Human Authority.
            </p>
          </div>
          <div className="text-xs font-mono text-success bg-success-soft px-2.5 py-1 rounded-md border border-success/30">
            Pipeline Latency: 2,852ms
          </div>
        </div>

        {/* Visual Workflow Steps diagram (Full 8 Stages: Disruption Detected -> Impact Agent -> Parallel Specialists -> Scenario Agent -> Compliance Agent -> Human Decision Center -> Approved Recovery Action -> Execution Monitoring) */}
        <div className="relative py-2 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 items-stretch">
            {/* Step 1: Disruption Detected */}
            <div className="p-3 bg-red-50/90 border border-red-200 rounded-xl text-center flex flex-col justify-between space-y-1 shadow-xs">
              <span className="text-[9px] font-bold text-red-600 uppercase font-mono tracking-wider">Stage 1</span>
              <div>
                <div className="text-xs font-bold text-red-950">Disruption Detected</div>
                <div className="text-[10px] text-red-700 mt-0.5">Chennai Berth 3 Valve</div>
              </div>
              <div className="text-[9px] text-slate-400 font-mono pt-1 border-t border-red-200/60">14:32:10 UTC</div>
            </div>

            {/* Step 2: Agent 1 - Disruption & Impact Agent */}
            <div
              onClick={() => setSelectedAgentId('agent-1')}
              className={`p-3 rounded-xl border text-center flex flex-col justify-between space-y-1 cursor-pointer transition-all ${
                selectedAgentId === 'agent-1'
                  ? 'bg-primary text-ink border-accent shadow-md ring-2 ring-accent/30'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[9px] font-bold uppercase font-mono ${selectedAgentId === 'agent-1' ? 'text-ink/70' : 'text-accent'}`}>Agent 1</span>
                <span className={`h-1.5 w-1.5 rounded-full ${selectedAgentId === 'agent-1' ? 'bg-ink' : 'bg-success'}`} />
              </div>
              <div>
                <div className="text-xs font-bold truncate">Impact Agent</div>
                <div className={`text-[10px] truncate ${selectedAgentId === 'agent-1' ? 'text-ink/70' : 'text-slate-500'}`}>18,000 bbl exp.</div>
              </div>
              <div className={`text-[9px] font-mono pt-1 border-t ${selectedAgentId === 'agent-1' ? 'border-ink/15 text-ink/60' : 'border-slate-200 text-slate-400'}`}>14:33:12 UTC</div>
            </div>

            {/* Step 3: Parallel Domain Specialists (Agents 2, 3, 4) */}
            <div className="lg:col-span-2 p-2 bg-slate-100/90 rounded-xl border border-dashed border-slate-300 flex flex-col justify-between space-y-1">
              <div className="flex items-center justify-between px-1">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Stage 3: Parallel Specialists</span>
                <span className="text-[9px] text-accent font-mono font-bold">3 Agents</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <button
                  onClick={() => setSelectedAgentId('agent-2')}
                  className={`p-1.5 rounded-lg text-center border transition-all ${
                    selectedAgentId === 'agent-2'
                      ? 'bg-primary text-ink border-accent shadow-xs'
                      : 'bg-white hover:bg-primary-soft/50 text-slate-800 border-slate-200'
                  }`}
                  title="Supplier Agent: Evaluates alternative approved crude sources"
                >
                  <div className="text-[10px] font-bold">Supplier</div>
                  <div className={`text-[9px] ${selectedAgentId === 'agent-2' ? 'text-ink/70' : 'text-slate-400'}`}>Agent 2</div>
                </button>
                <button
                  onClick={() => setSelectedAgentId('agent-3')}
                  className={`p-1.5 rounded-lg text-center border transition-all ${
                    selectedAgentId === 'agent-3'
                      ? 'bg-primary text-ink border-accent shadow-xs'
                      : 'bg-white hover:bg-primary-soft/50 text-slate-800 border-slate-200'
                  }`}
                  title="Logistics Agent: Evaluates Ennore diversion & pipeline routing"
                >
                  <div className="text-[10px] font-bold">Logistics</div>
                  <div className={`text-[9px] ${selectedAgentId === 'agent-3' ? 'text-ink/70' : 'text-slate-400'}`}>Agent 3</div>
                </button>
                <button
                  onClick={() => setSelectedAgentId('agent-4')}
                  className={`p-1.5 rounded-lg text-center border transition-all ${
                    selectedAgentId === 'agent-4'
                      ? 'bg-primary text-ink border-accent shadow-xs'
                      : 'bg-white hover:bg-primary-soft/50 text-slate-800 border-slate-200'
                  }`}
                  title="Inventory Agent: Calculates facility buffers & transfer feasibility"
                >
                  <div className="text-[10px] font-bold">Inventory</div>
                  <div className={`text-[9px] ${selectedAgentId === 'agent-4' ? 'text-ink/70' : 'text-slate-400'}`}>Agent 4</div>
                </button>
              </div>
              <div className="text-[9px] text-center text-slate-400 font-mono">14:34:05 - 14:36:22 UTC</div>
            </div>

            {/* Step 4: Agent 5 - Scenario Planning Agent */}
            <div
              onClick={() => setSelectedAgentId('agent-5')}
              className={`p-3 rounded-xl border text-center flex flex-col justify-between space-y-1 cursor-pointer transition-all ${
                selectedAgentId === 'agent-5'
                  ? 'bg-primary text-ink border-accent shadow-md ring-2 ring-accent/20'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[9px] font-bold uppercase font-mono ${selectedAgentId === 'agent-5' ? 'text-ink/70' : 'text-accent'}`}>Agent 5</span>
                <span className={`h-1.5 w-1.5 rounded-full ${selectedAgentId === 'agent-5' ? 'bg-ink' : 'bg-success'}`} />
              </div>
              <div>
                <div className="text-xs font-bold truncate">Scenario Agent</div>
                <div className={`text-[10px] truncate ${selectedAgentId === 'agent-5' ? 'text-ink/70' : 'text-slate-500'}`}>4 Strategies</div>
              </div>
              <div className={`text-[9px] font-mono pt-1 border-t ${selectedAgentId === 'agent-5' ? 'border-accent/30 text-ink/70' : 'border-slate-200 text-slate-400'}`}>14:37:45 UTC</div>
            </div>

            {/* Step 5: Agent 6 - Compliance Agent */}
            <div
              onClick={() => setSelectedAgentId('agent-6')}
              className={`p-3 rounded-xl border text-center flex flex-col justify-between space-y-1 cursor-pointer transition-all ${
                selectedAgentId === 'agent-6'
                  ? 'bg-primary text-ink border-accent shadow-md ring-2 ring-accent/20'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[9px] font-bold uppercase font-mono ${selectedAgentId === 'agent-6' ? 'text-ink/70' : 'text-accent'}`}>Agent 6</span>
                <span className={`h-1.5 w-1.5 rounded-full ${selectedAgentId === 'agent-6' ? 'bg-ink' : 'bg-success'}`} />
              </div>
              <div>
                <div className="text-xs font-bold truncate">Compliance Agent</div>
                <div className={`text-[10px] truncate ${selectedAgentId === 'agent-6' ? 'text-ink/70' : 'text-slate-500'}`}>GRC Gatekeeper</div>
              </div>
              <div className={`text-[9px] font-mono pt-1 border-t ${selectedAgentId === 'agent-6' ? 'border-accent/30 text-ink/70' : 'border-slate-200 text-slate-400'}`}>14:38:50 UTC</div>
            </div>

            {/* Step 6: Human Decision Center */}
            <div
              onClick={() => setCurrentView('decisions')}
              className="p-3 bg-primary-soft hover:bg-primary-border/30 border border-primary-border rounded-xl text-center flex flex-col justify-between space-y-1 cursor-pointer transition-all ring-1 ring-primary-border/50"
            >
              <span className="text-[9px] font-bold text-accent-strong uppercase font-mono">Stage 6</span>
              <div>
                <div className="text-xs font-bold text-accent-strong">Human Decision</div>
                <div className="text-[10px] text-accent-strong font-semibold">Review & Sign-Off</div>
              </div>
              <div className="text-[9px] text-accent font-mono pt-1 border-t border-primary-border">Awaiting Human</div>
            </div>

            {/* Step 7 & 8: Approved Action & Execution Monitoring */}
            <div className="p-3 bg-slate-100/80 border border-slate-200 rounded-xl text-center flex flex-col justify-between space-y-1">
              <span className="text-[9px] font-bold text-slate-700 uppercase font-mono">Stage 7 & 8</span>
              <div>
                <div className="text-xs font-bold text-slate-900">Execution Monitor</div>
                <div className="text-[10px] text-slate-600 font-medium">Audit & ERP Sync</div>
              </div>
              <div className="text-[9px] text-slate-500 font-mono pt-1 border-t border-slate-200">Continuous AIS</div>
            </div>
          </div>

          {/* Structured Information Exchange Schema Payload Banner */}
          <div className="p-4 bg-slate-900 text-slate-200 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Structured Information Exchange Schema (Cross-Agent Contract)
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary font-mono border border-primary/30">
                  JSON REST API
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                No hidden chain-of-thought • Zero hallucinations
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[11px] font-mono text-primary overflow-x-auto">
              <pre>{`{
  "incident_id": "${selectedIncident.id}",
  "affected_location": "${selectedIncident.location}",
  "supply_exposure": ${selectedIncident.totalNetworkExposureBarrels || 18000},
  "alternative_suppliers": 2,
  "available_routes": 3,
  "inventory_transfer_possible": true,
  "compliance_status": "REQUIRES_REVIEW"
}`}</pre>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 5: SIX INDIVIDUAL SPECIALIZED AGENT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => {
          const Icon = agentIcons[agent.id] || Bot;
          const isSelected = agent.id === selectedAgentId;
          const isJsonExpanded = expandedJsonAgentId === agent.id;

          return (
            <div
              key={agent.id}
              className={`bg-white rounded-2xl border transition-all duration-200 p-5 flex flex-col justify-between shadow-xs ${
                isSelected
                  ? 'border-accent shadow-md ring-2 ring-accent/20'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="space-y-3">
                {/* Agent Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-xl bg-primary-soft text-accent border border-primary-border">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {agent.code}
                        </span>
                        <StatusBadge status={agent.status} size="sm" />
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm leading-tight">
                        {agent.name}
                      </h3>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-mono text-success font-bold block">
                      {agent.confidenceScore}% conf
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {agent.latencyMs}ms
                    </span>
                  </div>
                </div>

                {/* Role and Responsibility */}
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="font-semibold text-slate-800">Role:</span> {agent.responsibility}
                </p>

                {/* Latest Finding Callout */}
                <div className="p-3 rounded-xl bg-primary-soft/60 border border-primary-border text-xs text-accent-strong space-y-1">
                  <div className="font-bold flex items-center gap-1 text-[11px] text-accent-strong uppercase tracking-wider">
                    <Zap className="w-3 h-3 text-accent" />
                    <span>Key Agent Finding</span>
                  </div>
                  <p className="leading-relaxed font-medium">
                    "{agent.latestFinding}"
                  </p>
                </div>

                {/* Structured Output Preview Drawer Toggle */}
                <div>
                  <button
                    onClick={() =>
                      setExpandedJsonAgentId(isJsonExpanded ? null : agent.id)
                    }
                    className="w-full flex items-center justify-between px-3 py-2 bg-slate-100 hover:bg-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <Code className="w-3.5 h-3.5 text-slate-500" />
                      <span>Structured Schema Payload</span>
                    </span>
                    {isJsonExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    )}
                  </button>

                  {isJsonExpanded && (
                    <div className="mt-2 p-3 bg-slate-900 text-primary rounded-xl font-mono text-[11px] overflow-x-auto max-h-48 border border-slate-800">
                      <pre>{JSON.stringify(agent.structuredOutput, null, 2)}</pre>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Card Footer */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>{agent.evidenceCount} evidence items verified</span>
                <button
                  onClick={() => {
                    setSelectedAgentId(agent.id);
                    if (agent.id === 'agent-2') setCurrentView('suppliers');
                    if (agent.id === 'agent-3') setCurrentView('logistics');
                    if (agent.id === 'agent-4') setCurrentView('inventory');
                    if (agent.id === 'agent-5') setCurrentView('scenarios');
                    if (agent.id === 'agent-6') setCurrentView('compliance');
                  }}
                  className="font-bold text-accent hover:text-accent-strong flex items-center gap-1"
                >
                  <span>Open Deep Dive</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* SELECTED AGENT DEEP DIVE & NETWORK TOPOLOGY DIAGRAM FOR AGENT 1 */}
      {selectedAgent.id === 'agent-1' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-red-100 text-red-700">
                  <AlertOctagon className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-slate-900 text-base">
                  Agent 1: Disruption & Impact Comprehensive Analysis Dossier
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Exact parameters traced across shipments, marine berths, distillation units, and storage buffers for Incident OIL-1042.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-md border border-red-200 self-start sm:self-auto">
              Severity: HIGH • 18,000 bbl At Risk
            </span>
          </div>

          {/* Prompt Section 5 Display Items for Agent 1 */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Incident ID</span>
              <span className="font-mono font-bold text-slate-900 text-sm">OIL-1042</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Disruption Type</span>
              <span className="font-bold text-slate-900 text-sm">Port Congestion</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Affected Port</span>
              <span className="font-bold text-slate-900 text-sm">Chennai Port (Berth 3)</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Affected Shipment IDs</span>
              <span className="font-mono font-bold text-slate-900 text-xs">SHP-1042, 1048, 1051</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Affected Refinery</span>
              <span className="font-bold text-slate-900 text-xs">Chennai CPCL (CDU-2)</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Affected Inventory Locations</span>
              <span className="font-bold text-slate-900 text-xs">CPCL Farm, Coimbatore Buffer</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Estimated Supply Exposure</span>
              <span className="font-mono font-bold text-red-600 text-sm">18,000 barrels</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Estimated Delay</span>
              <span className="font-mono font-bold text-slate-900 text-sm">+18.0 hours</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Impact Severity</span>
              <span className="font-bold text-red-600 text-sm flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500" /> HIGH
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Attention Components</span>
              <span className="font-bold text-slate-900 text-[11px] leading-tight block">Berth 3 Valve, CDU-2, C104 Line</span>
            </div>
          </div>

          {/* Example Finding Callout */}
          <div className="p-3.5 bg-primary-soft/70 border border-primary-border rounded-xl text-xs text-accent-strong flex items-start gap-3">
            <span className="p-1.5 bg-primary text-ink rounded-lg flex-shrink-0">
              <Zap className="w-3.5 h-3.5" />
            </span>
            <div>
              <div className="font-bold text-accent">
                Agent 1 Certified Impact Assessment Finding:
              </div>
              <p className="mt-0.5 text-accent-strong font-medium">
                "Port congestion at Chennai Port is affecting 3 shipments and exposing approximately 18,000 barrels of supply."
              </p>
            </div>
          </div>

          {/* Visual Affected-Network Topology Diagram */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800">
                Visual Affected-Network Topology Tracing (Incident OIL-1042)
              </span>
              <span className="text-slate-400 font-mono">
                Propagated via Agent 1 Telemetry Graph
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
              {/* Disrupted Port */}
              <div className="p-3.5 bg-red-100 border-2 border-red-400 rounded-xl text-center space-y-1">
                <div className="text-[10px] font-bold text-red-700 uppercase font-mono">Disruption Epicenter</div>
                <div className="font-bold text-xs text-red-950">Chennai Port Berth 3</div>
                <div className="text-[11px] text-red-800">Crane Valve Failure (+18h)</div>
              </div>

              {/* Trapped Vessel */}
              <div className="p-3.5 bg-amber-100 border-2 border-amber-400 rounded-xl text-center space-y-1">
                <div className="text-[10px] font-bold text-amber-700 uppercase font-mono">Affected Shipment</div>
                <div className="font-bold text-xs text-amber-950">SHP-1042 (MT Ocean Vanguard)</div>
                <div className="text-[11px] text-amber-800">20,000 bbl Arab Light</div>
              </div>

              {/* Impacted Refinery */}
              <div className="p-3.5 bg-orange-100 border-2 border-orange-400 rounded-xl text-center space-y-1">
                <div className="text-[10px] font-bold text-orange-700 uppercase font-mono">Affected Refinery</div>
                <div className="font-bold text-xs text-orange-950">Chennai CPCL (CDU-2)</div>
                <div className="text-[11px] text-orange-800">Buffer: 2.1 days remaining</div>
              </div>

              {/* Downstream Customer */}
              <div className="p-3.5 bg-purple-100 border-2 border-purple-400 rounded-xl text-center space-y-1">
                <div className="text-[10px] font-bold text-purple-700 uppercase font-mono">Exposed Customer</div>
                <div className="font-bold text-xs text-purple-950">Customer C104 (Petrochem)</div>
                <div className="text-[11px] text-purple-800">Continuous feed requirement</div>
              </div>
            </div>

            <div className="mt-3 p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-700 flex items-center justify-between">
              <span>
                <strong>Agent 1 Recommendation to Dispatch:</strong> Reroute signals emitted to Supplier Agent for spot backup and Logistics Agent for Kamarajar Ennore deepwater diversion.
              </span>
              <button
                onClick={() => setCurrentView('logistics')}
                className="text-xs font-bold text-accent hover:text-accent-strong whitespace-nowrap ml-3"
              >
                Inspect Logistics Routes →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
