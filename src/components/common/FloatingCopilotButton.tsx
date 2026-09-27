import React from 'react';
import { useHumanize } from '../../context/HumanizeContext';

export const FloatingCopilotButton: React.FC = () => {
  const { toggleCopilot, copilotOpen } = useHumanize();

  if (copilotOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <button
        onClick={toggleCopilot}
        className="group flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary-strong hover:to-indigo-700 text-white rounded-full shadow-xl hover:shadow-2xl shadow-primary/30 transition-all active:scale-95 border border-white/20"
        title="Open AI Resilience Copilot"
      >
        <span className="text-xl group-hover:scale-110 transition-transform">🤖</span>
        <div className="text-left hidden sm:block">
          <div className="text-xs font-bold font-headline leading-tight">Ask Copilot</div>
          <div className="text-[10px] text-blue-200 leading-tight">Plain English Agent Chat</div>
        </div>
        <span className="relative flex h-2 w-2 ml-0.5">
          <span className="radar-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
        </span>
      </button>
    </div>
  );
};
