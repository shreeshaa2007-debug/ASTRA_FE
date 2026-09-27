import React, { createContext, useContext, useEffect, useState } from 'react';

export type AgentPersonaId = 'sarah' | 'ian' | 'leo' | 'sam' | 'claire';

export interface AgentPersona {
  id: AgentPersonaId;
  name: string;
  role: string;
  department: string;
  avatar: string;
  color: string;
  greeting: string;
  plainRole: string;
  bio: string;
}

export const AGENT_PERSONAS: Record<AgentPersonaId, AgentPersona> = {
  sarah: {
    id: 'sarah',
    name: 'Sarah Chen',
    role: 'Sensing Specialist',
    department: 'Threat Intelligence',
    avatar: '👁️',
    color: '#ef4444',
    greeting: "I monitor global port queues, satellite weather, and geopolitical events 24/7 so we're never caught off guard.",
    plainRole: 'Early Warning & Disruption Detector',
    bio: 'Scans news feeds, AIS vessel telemetry, and NOAA weather in real-time. Translates ambiguous chaos into clear risk alerts.',
  },
  ian: {
    id: 'ian',
    name: 'Ian Morales',
    role: 'Inventory Strategist',
    department: 'Demand & Supply Planning',
    avatar: '📦',
    color: '#f59e0b',
    greeting: "I look ahead using machine learning to predict stockouts weeks before empty shelves hit our customers.",
    plainRole: 'Demand Forecaster & Safety Stock Guardian',
    bio: 'Runs XGBoost demand models across European and Asian warehouses to protect critical buffer stock.',
  },
  leo: {
    id: 'leo',
    name: 'Leo Rossi',
    role: 'Logistics Navigator',
    department: 'Global Freight & Routing',
    avatar: '🚢',
    color: '#3b82f6',
    greeting: "When sea lanes or canals close, I find the smartest maritime detours, air bridges, and rail lanes.",
    plainRole: 'Multi-Modal Route Optimizer',
    bio: 'Calculates vessel speeds, bunker fuel consumption, port dwell times, and freight ETAs around the Cape of Good Hope.',
  },
  sam: {
    id: 'sam',
    name: 'Samira Patel',
    role: 'Sourcing Director',
    department: 'Strategic Procurement',
    avatar: '🏭',
    color: '#8b5cf6',
    greeting: "I balance supplier capacity, landed tariffs, and reliability to secure goods at the best total cost.",
    plainRole: 'Supplier Allocation & Tariff Manager',
    bio: 'Manages relations with factories in Malaysia, Vietnam, Taiwan, and Germany, optimizing tariff impact and lead times.',
  },
  claire: {
    id: 'claire',
    name: 'Claire Dupont',
    role: 'Compliance & Governance Lead',
    department: 'Corporate Policy & Trade Compliance',
    avatar: '⚖️',
    color: '#10b981',
    greeting: "I verify trade sanctions, ESG standards, and budget limits before any plan reaches executive signoff.",
    plainRole: 'Policy Guardian & Human Escalation Manager',
    bio: 'Ensures full regulatory compliance and passes critical high-spend decisions to executives via SAP SBPA.',
  },
};

interface HumanizeContextValue {
  isHumanized: boolean;
  toggleHumanized: () => void;
  guidedTourOpen: boolean;
  openGuidedTour: () => void;
  closeGuidedTour: () => void;
  copilotOpen: boolean;
  openCopilot: () => void;
  closeCopilot: () => void;
  toggleCopilot: () => void;
  selectedPersona: AgentPersona | null;
  selectPersona: (persona: AgentPersona | null) => void;
}

const HumanizeContext = createContext<HumanizeContextValue | null>(null);

const STORAGE_KEY = 'resilientsc:humanize_mode';

export const HumanizeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isHumanized, setIsHumanized] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved !== null ? saved === 'true' : true; // Default to true (humanized first!)
    } catch {
      return true;
    }
  });

  const [guidedTourOpen, setGuidedTourOpen] = useState<boolean>(false);
  const [copilotOpen, setCopilotOpen] = useState<boolean>(false);
  const [selectedPersona, setSelectedPersona] = useState<AgentPersona | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(isHumanized));
    } catch {
      // ignore storage failure
    }
  }, [isHumanized]);

  const toggleHumanized = () => setIsHumanized((prev) => !prev);
  const openGuidedTour = () => setGuidedTourOpen(true);
  const closeGuidedTour = () => setGuidedTourOpen(false);
  const openCopilot = () => setCopilotOpen(true);
  const closeCopilot = () => setCopilotOpen(false);
  const toggleCopilot = () => setCopilotOpen((prev) => !prev);

  return (
    <HumanizeContext.Provider
      value={{
        isHumanized,
        toggleHumanized,
        guidedTourOpen,
        openGuidedTour,
        closeGuidedTour,
        copilotOpen,
        openCopilot,
        closeCopilot,
        toggleCopilot,
        selectedPersona,
        selectPersona: setSelectedPersona,
      }}
    >
      {children}
    </HumanizeContext.Provider>
  );
};

export const useHumanize = (): HumanizeContextValue => {
  const ctx = useContext(HumanizeContext);
  if (!ctx) {
    throw new Error('useHumanize must be used within a HumanizeProvider');
  }
  return ctx;
};
