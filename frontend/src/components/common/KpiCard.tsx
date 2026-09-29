import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  tone: 'danger' | 'warning' | 'success' | 'info' | 'primary';
  icon: LucideIcon;
  onClick?: () => void;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  unit,
  subtitle,
  trend,
  trendDirection,
  tone,
  icon: Icon,
  onClick,
}) => {
  const toneStyles = {
    danger: {
      border: 'border-red-100 hover:border-red-300',
      iconBg: 'bg-red-50 text-red-600',
      badge: 'bg-red-50 text-red-700',
      accent: 'text-red-600',
    },
    warning: {
      border: 'border-amber-100 hover:border-amber-300',
      iconBg: 'bg-amber-50 text-amber-600',
      badge: 'bg-amber-50 text-amber-700',
      accent: 'text-amber-600',
    },
    success: {
      border: 'border-success-soft hover:border-success/60',
      iconBg: 'bg-success-soft text-success',
      badge: 'bg-success-soft text-success',
      accent: 'text-success',
    },
    info: {
      border: 'border-slate-200 hover:border-slate-300',
      iconBg: 'bg-slate-100 text-slate-700',
      badge: 'bg-slate-100 text-slate-700',
      accent: 'text-slate-800',
    },
    primary: {
      border: 'border-slate-200 hover:border-accent/40',
      iconBg: 'bg-primary-soft text-accent',
      badge: 'bg-primary-soft text-accent',
      accent: 'text-accent',
    },
  }[tone];

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl p-4 border shadow-sm transition-all duration-150 ${toneStyles.border} ${
        onClick ? 'cursor-pointer hover:shadow-md' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {title}
          </p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              {value}
            </span>
            {unit && <span className="text-xs font-medium text-slate-500">{unit}</span>}
          </div>
        </div>

        <div className={`p-2.5 rounded-lg ${toneStyles.iconBg} flex-shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {(subtitle || trend) && (
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
          {subtitle && (
            <span className="text-slate-500 truncate max-w-[200px]" title={subtitle}>
              {subtitle}
            </span>
          )}
          {trend && (
            <span
              className={`font-medium ml-auto ${
                trendDirection === 'up'
                  ? 'text-red-600'
                  : trendDirection === 'down'
                  ? 'text-success'
                  : 'text-slate-600'
              }`}
            >
              {trend}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
