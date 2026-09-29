import React, { useState } from 'react';
import {
  Play,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useOilShield } from '../../context/OilShieldContext';
import { HACKATHON_DEMO_STEPS } from '../../data/mockOilShieldData';

export const TourBar: React.FC = () => {
  const { currentTourStep, goToNextTourStep, goToPrevTourStep, goToTourStep } = useOilShield();
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  const activeStep = HACKATHON_DEMO_STEPS[currentTourStep - 1] || HACKATHON_DEMO_STEPS[0];

  return (
    <div className="bg-[#111827] text-white rounded-xl shadow-sm border border-slate-800 overflow-hidden mb-5 select-none transition-all">
      {/* Top Banner Bar */}
      <div className="px-4 py-2.5 flex items-center justify-between gap-3 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex items-center justify-center w-6 h-6 rounded-md bg-[#154734] text-emerald-300 flex-shrink-0 text-xs font-bold ring-1 ring-emerald-600/30">
            <Sparkles className="w-3.5 h-3.5" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                SAP Hackathon Demo Sequence
              </span>
              <span className="text-[11px] px-1.5 py-0.2 bg-emerald-950/70 text-emerald-200 rounded border border-emerald-800/60 font-mono">
                Step {currentTourStep} of {HACKATHON_DEMO_STEPS.length}
              </span>
            </div>
            <div className="text-xs font-semibold text-slate-100 truncate">
              {activeStep.subtitle}
            </div>
          </div>
        </div>

        {/* Step Controls */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={goToPrevTourStep}
            disabled={currentTourStep === 1}
            className={`p-1.5 rounded-lg border transition-colors ${
              currentTourStep === 1
                ? 'border-slate-800 text-slate-600 cursor-not-allowed'
                : 'border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200'
            }`}
            title="Previous Demo Step"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={goToNextTourStep}
            disabled={currentTourStep === HACKATHON_DEMO_STEPS.length}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
              currentTourStep === HACKATHON_DEMO_STEPS.length
                ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                : 'bg-[#154734] hover:bg-[#1b5941] text-white shadow-xs'
            }`}
          >
            <span>Next Step</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors ml-1"
            title={isExpanded ? 'Collapse Tour Steps' : 'Expand All Steps'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expandable Step Navigation Pill Rail */}
      {isExpanded && (
        <div className="px-4 py-2.5 bg-slate-900/95 border-t border-slate-800 overflow-x-auto">
          <div className="flex items-center gap-1.5 min-w-max">
            {HACKATHON_DEMO_STEPS.map((s) => {
              const isActive = s.step === currentTourStep;
              const isPast = s.step < currentTourStep;

              return (
                <button
                  key={s.step}
                  onClick={() => goToTourStep(s.step)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[#154734] text-white shadow-sm font-bold ring-1 ring-emerald-500/60'
                      : isPast
                      ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700/60'
                      : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 border border-slate-800'
                  }`}
                  title={`${s.step}. ${s.title}: ${s.instructions}`}
                >
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-mono font-bold ${
                      isActive
                        ? 'bg-white text-[#154734]'
                        : isPast
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {s.step}
                  </span>
                  <span className="truncate max-w-[130px]">{s.title}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-2 text-[11px] text-slate-300 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <span>{activeStep.instructions}</span>
          </div>
        </div>
      )}
    </div>
  );
};
