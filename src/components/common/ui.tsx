import React, { useState } from 'react';

// The dashboard's building blocks: white rounded cards on the grey canvas, pastel icon chips, a segmented ring and a
// stacked meter. Colour comes from the theme tokens in index.css (never a hex here), and status colours always travel
// with an icon and a label so a reader who cannot tell red from green loses nothing.

export type Tone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

export const TONES: Record<Tone, { chip: string; text: string; dot: string; bar: string; icon: string }> = {
  primary: { chip: 'bg-primary-soft text-primary', text: 'text-primary', dot: 'bg-primary', bar: 'bg-primary', icon: 'insights' },
  success: { chip: 'bg-success-soft text-success', text: 'text-success', dot: 'bg-success', bar: 'bg-success', icon: 'check_circle' },
  warning: { chip: 'bg-warning-soft text-warning', text: 'text-warning', dot: 'bg-warning', bar: 'bg-warning', icon: 'warning' },
  danger: { chip: 'bg-danger-soft text-danger', text: 'text-danger', dot: 'bg-danger', bar: 'bg-danger', icon: 'error' },
  neutral: { chip: 'bg-raised text-ink-2', text: 'text-ink-2', dot: 'bg-muted', bar: 'bg-muted', icon: 'remove' },
};

// SVG marks cannot take a Tailwind class for `stroke`, so the ring reads the same theme variables.
const TONE_VAR: Record<Tone, string> = {
  primary: 'var(--color-primary)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  danger: 'var(--color-danger)',
  neutral: 'var(--color-muted)',
};

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', ...rest }) => (
  <div className={`bg-card rounded-2xl shadow-card ${className}`} {...rest} />
);

export const CardTitle: React.FC<{ title: string; hint?: React.ReactNode; right?: React.ReactNode }> = ({ title, hint, right }) => (
  <div className="flex items-start justify-between gap-3">
    <div className="min-w-0">
      <h2 className="font-headline text-[15px] font-bold text-ink leading-tight">{title}</h2>
      {hint && <div className="text-[11px] text-muted mt-0.5">{hint}</div>}
    </div>
    {right}
  </div>
);

export const IconChip: React.FC<{ icon: string; tone?: Tone; size?: 'md' | 'lg' }> = ({ icon, tone = 'primary', size = 'md' }) => (
  <span className={`${TONES[tone].chip} ${size === 'lg' ? 'h-11 w-11 rounded-2xl' : 'h-9 w-9 rounded-xl'} inline-flex items-center justify-center flex-shrink-0`}>
    <span className={`material-symbols-outlined ${size === 'lg' ? 'text-[22px]' : 'text-[19px]'}`}>{icon}</span>
  </span>
);

// A KPI: the number is the chart, so it is a tile and not a plot. Proportional digits (not tabular): they are read as one figure.
export const StatTile: React.FC<{
  icon: string;
  label: string;
  value: string;
  tone: Tone;
  line1: string;
  line2?: string;
}> = ({ icon, label, value, tone, line1, line2 }) => (
  <Card className="p-4 flex flex-col gap-3">
    <div className="flex items-center justify-between">
      <IconChip icon={icon} tone={tone} />
      {(tone === 'danger' || tone === 'warning') && (
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${TONES[tone].text}`}>
          <span className="material-symbols-outlined text-[14px]">{TONES[tone].icon}</span>
          {tone === 'danger' ? 'Critical' : 'Watch'}
        </span>
      )}
    </div>
    <div>
      <div className="text-[12px] font-semibold text-ink-2">{label}</div>
      <div className="font-headline text-[26px] leading-tight font-bold text-ink mt-0.5">{value}</div>
    </div>
    <div className="space-y-0.5">
      <div className="text-[11px] font-medium text-ink-2 leading-snug">{line1}</div>
      {line2 && <div className="text-[10px] text-muted leading-snug">{line2}</div>}
    </div>
  </Card>
);

export interface Segment {
  key: string;
  label: string;
  value: number;
  tone: Tone;
  icon: string;
}

// Part-to-whole in one ring (three or four segments at most): a 2px gap of surface between segments, hover or focus on a
// segment or its legend row reads it out in the middle. The legend is the table view, so nothing is only in the tooltip.
export const Donut: React.FC<{ segments: Segment[]; centerValue: string; centerLabel: string; ariaLabel: string }> = ({ segments, centerValue, centerLabel, ariaLabel }) => {
  const [active, setActive] = useState<string | null>(null);
  const total = segments.reduce((s, x) => s + x.value, 0);
  const R = 42;
  const C = 2 * Math.PI * R;
  const shown = segments.filter((s) => s.value > 0);
  const gap = shown.length > 1 ? 2.5 : 0;
  let offset = 0;
  const arcs = shown.map((s) => {
    const len = (s.value / total) * C;
    const arc = { ...s, dash: `${Math.max(len - gap, 0.5)} ${C}`, offset: -offset };
    offset += len;
    return arc;
  });
  const focus = segments.find((s) => s.key === active) ?? null;

  return (
    <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center gap-5">
      <div className="relative h-[148px] w-[148px] flex-shrink-0">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" role="img" aria-label={ariaLabel}>
          <circle cx="50" cy="50" r={R} fill="none" stroke="var(--color-raised)" strokeWidth="11" />
          {arcs.map((a) => (
            <g key={a.key}>
              <circle
                cx="50"
                cy="50"
                r={R}
                fill="none"
                stroke={TONE_VAR[a.tone]}
                strokeWidth={active === a.key ? 13 : 11}
                strokeDasharray={a.dash}
                strokeDashoffset={a.offset}
                opacity={active && active !== a.key ? 0.3 : 1}
                style={{ transition: 'opacity 150ms, stroke-width 150ms' }}
              />
              {/* a wider invisible copy: the thing you point at, so a thin ring is easy to hit */}
              <circle
                cx="50"
                cy="50"
                r={R}
                fill="none"
                stroke="transparent"
                strokeWidth="22"
                strokeDasharray={a.dash}
                strokeDashoffset={a.offset}
                onMouseEnter={() => setActive(a.key)}
                onMouseLeave={() => setActive(null)}
              />
            </g>
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="font-headline text-[22px] leading-none font-bold text-ink">{focus ? focus.value : centerValue}</span>
          <span className="text-[10px] font-medium text-muted mt-1 max-w-[80px] leading-tight">{focus ? focus.label : centerLabel}</span>
        </div>
      </div>

      <ul className="w-full space-y-1">
        {segments.map((s) => (
          <li
            key={s.key}
            tabIndex={0}
            onMouseEnter={() => setActive(s.key)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(s.key)}
            onBlur={() => setActive(null)}
            className={`flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-[12px] outline-hidden transition-colors ${active === s.key ? 'bg-inset' : ''} focus-visible:ring-2 focus-visible:ring-primary/40`}
          >
            <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${TONES[s.tone].dot}`}></span>
            <span className="material-symbols-outlined text-[15px] text-ink-2">{s.icon}</span>
            <span className="flex-1 font-medium text-ink-2">{s.label}</span>
            <span className="font-bold text-ink">{s.value}</span>
            <span className="w-10 text-right text-[11px] text-muted">{total > 0 ? `${Math.round((s.value / total) * 100)}%` : '—'}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

// One bar per row, split into what is fine and what is not: a 2px gap between the parts, rounded ends, a track behind.
export const StackedMeter: React.FC<{ parts: { value: number; tone: Tone; label: string }[]; total: number }> = ({ parts, total }) => (
  <div className="flex h-2 w-full gap-[2px] overflow-hidden rounded-full bg-raised" role="img" aria-label={parts.map((p) => `${p.label} ${p.value} of ${total}`).join(', ')}>
    {parts
      .filter((p) => p.value > 0)
      .map((p) => (
        <span key={p.label} className={`${TONES[p.tone].bar} h-full rounded-full`} style={{ width: `${total > 0 ? (p.value / total) * 100 : 0}%` }} title={`${p.label}: ${p.value} of ${total}`}></span>
      ))}
  </div>
);

// One ratio against its whole (a meter, wrapped): the track is the same hue family as the surface, the value sits in the middle.
export const MiniRing: React.FC<{ fraction: number; tone: Tone; value: string; label: string }> = ({ fraction, tone, value, label }) => {
  const pct = Math.max(0, Math.min(1, fraction)) * 100;
  return (
    <div className="relative h-[84px] w-[84px] flex-shrink-0" role="img" aria-label={`${label}: ${value}`}>
      <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
        <circle cx="18" cy="18" r="15.9155" fill="none" stroke="var(--color-raised)" strokeWidth="3.6" />
        <circle cx="18" cy="18" r="15.9155" fill="none" stroke={TONE_VAR[tone]} strokeWidth="3.6" strokeLinecap="round" strokeDasharray={`${pct} 100`} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-headline text-[15px] leading-none font-bold text-ink">{value}</span>
        <span className="text-[9px] font-semibold text-muted mt-0.5 uppercase tracking-wide">{label}</span>
      </div>
    </div>
  );
};
