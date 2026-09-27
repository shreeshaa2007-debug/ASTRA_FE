import React, { useState } from 'react';
import { useHumanize } from '../../context/HumanizeContext';
import { ViewMode } from '../../types';

interface GuidedTourModalProps {
  onNavigate: (view: ViewMode) => void;
}

interface TourStep {
  title: string;
  agent: string;
  avatar: string;
  tagline: string;
  story: string;
  humanImpact: string;
  viewTarget: ViewMode;
  stats: { label: string; value: string }[];
}

const TOUR_STEPS: TourStep[] = [
  {
    title: '1. The Crisis: Suez Canal Blockade',
    agent: 'Sarah Chen (Sensing Specialist)',
    avatar: '👁️',
    tagline: 'Early warning sensors catch live maritime disruption',
    story:
      'A container vessel breakdown and regional security warnings have abruptly closed the Suez Canal. Sarah ingests live satellite data, news alerts, and real-time port telemetry showing 95 vessels stalled at Port Said and Suez.',
    humanImpact: 'Without intervention, 4 critical Asian shipping lanes are severed, threatening 12,000 electronics shipments.',
    viewTarget: 'ports',
    stats: [
      { label: 'Anchorage Queue', value: '95 Vessels' },
      { label: 'Wait Time Surge', value: '+191 Hours' },
      { label: 'Global Trade At Risk', value: '12.0%' },
    ],
  },
  {
    title: '2. The Ripple Effect: Warehouse Stockouts',
    agent: 'Ian Morales (Inventory Strategist)',
    avatar: '📦',
    tagline: 'XGBoost models project customer stock depletion',
    story:
      'Ian immediately correlates the delayed shipments with customer demand forecasts across European fulfillment centers. The warehouse inventory buffer will deplete in 14 days if fresh replenishment is not dispatched immediately.',
    humanImpact: '45,000 consumer orders and vital hospital hardware would face cancellation or indefinite backorder.',
    viewTarget: 'inventory',
    stats: [
      { label: 'Warehouse Buffer', value: '14 Days Left' },
      { label: 'Demand Surge', value: '482 Units/Day' },
      { label: 'Risk Classification', value: 'HIGH Risk' },
    ],
  },
  {
    title: '3. Exploring Solutions: Multimodal Detours',
    agent: 'Leo Rossi & Samira Patel (Logistics & Sourcing)',
    avatar: '🚢',
    tagline: 'Evaluating Cape of Good Hope, Air freight, and China-Europe Rail',
    story:
      'Leo maps alternative trade routes: flying everything by air costs $822/unit (+$10M total). Sailing around the Cape of Good Hope takes +12 days but costs only $271/unit. Samira activates backup supplier capacity in Malaysia and Taiwan to support the reroute.',
    humanImpact: 'Finding a balanced hybrid routing prevents catastrophic freight price inflation for end consumers.',
    viewTarget: 'logistics',
    stats: [
      { label: 'Cape Detour Transit', value: '28.3 Days' },
      { label: 'Air Bridge Capacity', value: '5,000 Units' },
      { label: 'Landed Tariff Check', value: 'Zero Tariffs' },
    ],
  },
  {
    title: '4. Autonomous Mathematical Optimization',
    agent: 'Joint MIP Solver (HiGHS / Scipy Optimization)',
    avatar: '⚡',
    tagline: 'Computing the globally optimal allocation in 2.4 seconds',
    story:
      'Rather than relying on human guesswork, the optimization engine solves a mixed-integer program balancing freight spend, transit delays, and safety stocks. It recommends sending 7,500 units via sea around the Cape and expediting 5,000 critical units via Malaysian air.',
    humanImpact: 'Saves $184,550 compared to inaction while keeping European store shelves 98.4% filled on time.',
    viewTarget: 'simulator',
    stats: [
      { label: 'Decision Speed', value: '2.4 Seconds' },
      { label: 'Mitigated Spend', value: '$42,450' },
      { label: 'Net Cost Avoidance', value: '$184,550' },
    ],
  },
  {
    title: '5. Executive Sign-Off: SAP SBPA Governance',
    agent: 'Claire Dupont (Compliance & Governance)',
    avatar: '⚖️',
    tagline: 'Human-in-the-loop approval ensures enterprise trust',
    story:
      'Because total response spend exceeds the automated $30,000 threshold, Claire halts automated dispatch and routes an urgent approval task to executive leadership via SAP Build Process Automation and the built-in Approval Portal. One click confirms the order.',
    humanImpact: 'Executives retain complete control and auditability while AI does 99% of the analytical heavy lifting.',
    viewTarget: 'compliance',
    stats: [
      { label: 'Policy Adherence', value: '100% Passed' },
      { label: 'Sanctions Check', value: 'Zero Violations' },
      { label: 'Human Governance', value: 'Required & Verified' },
    ],
  },
];

export const GuidedTourModal: React.FC<GuidedTourModalProps> = ({ onNavigate }) => {
  const { guidedTourOpen, closeGuidedTour } = useHumanize();
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  if (!guidedTourOpen) return null;

  const step = TOUR_STEPS[currentStepIndex];
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === TOUR_STEPS.length - 1;

  const handleNext = () => {
    if (!isLast) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      closeGuidedTour();
      onNavigate('simulator');
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleJumpToScreen = () => {
    closeGuidedTour();
    onNavigate(step.viewTarget);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-2xl bg-card rounded-2xl shadow-2xl border border-line overflow-hidden flex flex-col animate-scale-up">
        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{step.avatar}</span>
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-blue-300 font-bold">
                Step {currentStepIndex + 1} of {TOUR_STEPS.length} · Guided Hackathon Tour
              </div>
              <h2 className="text-xl font-headline font-bold text-white mt-0.5">{step.title}</h2>
            </div>
          </div>
          <button
            onClick={closeGuidedTour}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            title="Close Tour"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-1.5 bg-inset flex">
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              className={`flex-1 transition-all duration-300 ${
                i <= currentStepIndex ? 'bg-primary' : 'bg-line'
              }`}
            />
          ))}
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 flex-1 overflow-y-auto">
          {/* Agent Lead */}
          <div className="flex items-center gap-2 text-ink font-semibold text-sm">
            <span className="text-muted">Specialist on duty:</span>
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-mono text-xs font-bold">
              {step.agent}
            </span>
          </div>

          {/* Story Narrative */}
          <div className="p-4 bg-inset rounded-xl border border-line/70 space-y-2">
            <div className="text-xs font-bold text-primary uppercase font-mono tracking-wide">
              {step.tagline}
            </div>
            <p className="text-sm text-ink-2 leading-relaxed font-body">{step.story}</p>
          </div>

          {/* Human Impact Callout */}
          <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200/60 flex items-start gap-3">
            <span className="text-xl">🤝</span>
            <div>
              <span className="text-xs font-bold text-emerald-900 block">Why this matters to real people:</span>
              <p className="text-xs text-emerald-800 leading-snug mt-0.5">{step.humanImpact}</p>
            </div>
          </div>

          {/* Key Facts / Metric Tiles */}
          <div className="grid grid-cols-3 gap-3">
            {step.stats.map((s, i) => (
              <div key={i} className="p-3 bg-card border border-line rounded-xl text-center space-y-1">
                <span className="text-[10px] text-muted font-mono font-semibold uppercase block truncate">
                  {s.label}
                </span>
                <span className="text-base font-headline font-bold text-ink block">{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-inset border-t border-line flex items-center justify-between">
          <button
            onClick={handleJumpToScreen}
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
          >
            <span>View this in Command Center</span>
            <span className="material-symbols-outlined text-[14px]">arrow_outward</span>
          </button>

          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                onClick={handlePrev}
                className="px-4 py-2 bg-card hover:bg-raised text-ink-2 border border-line rounded-xl text-xs font-bold transition-all"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-5 py-2 bg-primary hover:bg-primary-strong text-white rounded-xl text-xs font-bold shadow-md shadow-primary/20 transition-all active:scale-95 flex items-center gap-1.5"
            >
              <span>{isLast ? 'Complete & Run Simulation' : 'Next Step'}</span>
              <span className="material-symbols-outlined text-[15px]">
                {isLast ? 'bolt' : 'arrow_forward'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
