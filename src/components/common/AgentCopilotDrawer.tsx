import React, { useState } from 'react';
import { useHumanize, AGENT_PERSONAS, AgentPersona } from '../../context/HumanizeContext';
import { useSimulation } from '../../context/SimulationContext';

interface CopilotMessage {
  id: string;
  sender: 'user' | 'copilot' | 'sarah' | 'ian' | 'leo' | 'sam' | 'claire';
  senderName: string;
  avatar: string;
  text: string;
  timestamp: string;
  badge?: string;
}

const PRESET_QUESTIONS = [
  'Explain this disruption like I am 5 years old',
  'Why did the AI reroute around South Africa instead of air freight?',
  'How many customer orders and hospital shipments are protected?',
  'What is the financial cost comparison vs doing nothing?',
  'What decision is required from executive leadership right now?',
];

export const AgentCopilotDrawer: React.FC = () => {
  const { copilotOpen, closeCopilot, selectedPersona, selectPersona } = useHumanize();
  const { status, simulationId } = useSimulation();

  const [input, setInput] = useState<string>('');
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'm1',
      sender: 'copilot',
      senderName: 'Resilience Copilot',
      avatar: '🤖',
      text: "Hello! I am your AI Resilience Copilot. I translate complex mathematical supply chain models, port delays, and multi-agent deliberations into clear, human-understandable insights. Pick a question below or ask me anything about what our agents are doing!",
      timestamp: 'Just now',
    },
  ]);

  const handleAsk = (questionText: string) => {
    const q = questionText.trim();
    if (!q) return;

    const userMsg: CopilotMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      senderName: 'You',
      avatar: '👤',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    // Generate intelligent, empathetic plain-English answer based on the query & current state
    setTimeout(() => {
      let reply: CopilotMessage;
      const lower = q.toLowerCase();

      if (lower.includes('like i am 5') || lower.includes('5 years old') || lower.includes('simple')) {
        reply = {
          id: `c-${Date.now()}`,
          sender: 'sarah',
          senderName: 'Sarah (Sensing Agent)',
          avatar: '👁️',
          badge: 'Plain English Summary',
          text: "Imagine a big highway where all the toy trucks drive. Suddenly, a giant sandcastle fell on the narrow tunnel in Suez, so trucks cannot pass! Our team didn't panic: Leo the navigator sent our boats on a slightly longer, beautiful road around South Africa. That way, the toys still arrive before customer birthdays, and nobody cries!",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
      } else if (lower.includes('why') && (lower.includes('africa') || lower.includes('cape') || lower.includes('air'))) {
        reply = {
          id: `c-${Date.now()}`,
          sender: 'leo',
          senderName: 'Leo (Logistics) & Sam (Sourcing)',
          avatar: '🚢',
          badge: 'Cost vs Time Optimization',
          text: "Great question! Air freight would deliver 2 days faster, but costs 600% more ($822/unit vs $271/unit). Flying all 12,500 units would have cost over $10.2 Million! Instead, our joint optimizer chose the maritime Cape route: it adds 12 days of transit, but our European warehouse safety stock (managed by Ian) has 16 days of buffer. So zero customers stock out, and we save $6.8 Million!",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
      } else if (lower.includes('order') || lower.includes('hospital') || lower.includes('customer') || lower.includes('people')) {
        reply = {
          id: `c-${Date.now()}`,
          sender: 'ian',
          senderName: 'Ian (Inventory Strategist)',
          avatar: '📦',
          badge: 'Human Impact Score',
          text: "This rerouting plan directly protects 45,000 retail orders and 2,400 priority medical devices from European hospital backorders. By proactively expediting 5,000 units via our Malaysian air bridge, no warehouse drops below critical safety threshold.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
      } else if (lower.includes('cost') || lower.includes('money') || lower.includes('financial') || lower.includes('nothing')) {
        reply = {
          id: `c-${Date.now()}`,
          sender: 'sam',
          senderName: 'Samira (Sourcing Director)',
          avatar: '🏭',
          badge: 'ROI Analysis',
          text: "If we did nothing, port congestion fees and cancelled contracts would cost an estimated $227,000 in penalties plus lost customer trust. The AI's mitigation response costs $42,450 — delivering a net cost avoidance of $184,550 (+81% efficiency) while preserving our delivery promises.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
      } else if (lower.includes('decision') || lower.includes('executive') || lower.includes('approval') || lower.includes('require')) {
        reply = {
          id: `c-${Date.now()}`,
          sender: 'claire',
          senderName: 'Claire (Compliance Lead)',
          avatar: '⚖️',
          badge: 'Executive Governance',
          text: "The multi-agent system has generated a feasible, optimized mitigation plan. Because total disruption spend ($42,450) exceeds our automated $30,000 budget threshold, SAP SBPA requires human approval. As executive, you can review the plan and click 'Approve' in the Approval Portal with one tap to authorize purchase order dispatch.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
      } else {
        reply = {
          id: `c-${Date.now()}`,
          sender: 'copilot',
          senderName: 'Resilience Copilot',
          avatar: '🤖',
          text: `Regarding "${q}": The 5 agents are actively tracking simulation ${simulationId ?? 'sim-suez-001'}. Real-time port queues show Suez at 95 ships at anchor (wait time ~191 hours). Our logistics agent has already rerouted shipments via the Cape of Good Hope, keeping warehouse fill rates at 98.4%.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
      }

      setMessages((prev) => [...prev, reply]);
    }, 600);
  };

  if (!copilotOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity animate-fade-in">
      <div className="w-full max-w-lg bg-card h-full shadow-2xl flex flex-col border-l border-line animate-slide-left">
        {/* Drawer Header */}
        <div className="p-4 bg-gradient-to-r from-primary to-primary-strong text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl">
              🤖
            </div>
            <div>
              <h2 className="font-headline font-bold text-base text-white">AI Resilience Copilot</h2>
              <p className="text-[11px] text-blue-100 font-body">Humanized Multi-Agent Intelligence</p>
            </div>
          </div>
          <button
            onClick={closeCopilot}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            title="Close Copilot"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Persona Team Strip */}
        <div className="px-4 py-2.5 bg-inset border-b border-line flex items-center gap-2 overflow-x-auto">
          <span className="text-[10px] font-mono font-bold text-muted uppercase tracking-wider whitespace-nowrap">
            Agents on Call:
          </span>
          {Object.values(AGENT_PERSONAS).map((p: AgentPersona) => (
            <button
              key={p.id}
              onClick={() => {
                selectPersona(p);
                handleAsk(`Tell me about your role, ${p.name}`);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-card hover:bg-raised border border-line shadow-xs transition-all whitespace-nowrap"
              title={`${p.name} - ${p.role}`}
            >
              <span>{p.avatar}</span>
              <span className="font-semibold text-ink">{p.name.split(' ')[0]}</span>
            </button>
          ))}
        </div>

        {/* Messages Feed */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map((m) => {
            const isUser = m.sender === 'user';

            return (
              <div
                key={m.id}
                className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 shadow-xs ${
                    isUser ? 'bg-primary text-white' : 'bg-inset border border-line'
                  }`}
                >
                  {m.avatar}
                </div>

                <div className={`max-w-[82%] space-y-1 ${isUser ? 'items-end text-right' : ''}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-ink">{m.senderName}</span>
                    {m.badge && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-primary/10 text-primary font-mono font-semibold">
                        {m.badge}
                      </span>
                    )}
                    <span className="text-[10px] text-muted">{m.timestamp}</span>
                  </div>

                  <div
                    className={`p-3.5 rounded-2xl text-[12px] leading-relaxed font-body ${
                      isUser
                        ? 'bg-primary text-white rounded-tr-none'
                        : 'bg-inset text-ink-2 border border-line rounded-tl-none shadow-xs'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Suggestion Chips */}
        <div className="p-3 bg-inset/50 border-t border-line space-y-2">
          <span className="text-[11px] font-semibold text-muted block">💡 Suggested Explanations:</span>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_QUESTIONS.map((q, i) => (
              <button
                key={i}
                onClick={() => handleAsk(q)}
                className="text-[11px] text-left px-2.5 py-1 bg-card hover:bg-raised text-ink-2 hover:text-primary rounded-lg border border-line transition-all"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-card border-t border-line flex items-center gap-2">
          <input
            type="text"
            placeholder="Ask anything about the plan or disruption..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAsk(input);
            }}
            className="flex-1 h-10 px-3.5 bg-inset text-[13px] text-ink placeholder-muted rounded-xl border border-line focus:outline-hidden focus:border-primary transition-colors"
          />
          <button
            onClick={() => handleAsk(input)}
            disabled={!input.trim()}
            className="h-10 px-4 bg-primary hover:bg-primary-strong disabled:opacity-40 text-white rounded-xl font-bold text-xs flex items-center gap-1 shadow-sm transition-all"
          >
            <span>Ask</span>
            <span className="material-symbols-outlined text-[15px]">send</span>
          </button>
        </div>
      </div>
    </div>
  );
};
