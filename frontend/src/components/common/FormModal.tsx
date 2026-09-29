import React from 'react';
import { X } from 'lucide-react';

interface FormModalProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel?: string;
  children: React.ReactNode;
}

export const FormModal: React.FC<FormModalProps> = ({
  title,
  subtitle,
  onClose,
  onSubmit,
  submitLabel = 'Add',
  children,
}) => {
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="w-full max-w-xl max-h-[85vh] bg-white rounded-2xl shadow-pop border border-slate-200 flex flex-col overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-start justify-between gap-3 flex-shrink-0">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-5 space-y-4 overflow-y-auto">{children}</div>

          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary hover:bg-primary-strong text-ink rounded-xl text-xs font-bold transition-colors shadow-xs"
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface FieldProps {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const Field: React.FC<FieldProps> = ({ label, required, className, children }) => (
  <label className={`block ${className ?? ''}`}>
    <span className="block text-[11px] font-semibold text-slate-600 mb-1">
      {label}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </span>
    {children}
  </label>
);

const inputClass =
  'w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:bg-white focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all';

export const TextInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input {...props} className={`${inputClass} ${props.className ?? ''}`} />
);

export const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => (
  <textarea
    {...props}
    rows={props.rows ?? 2}
    className={`${inputClass} h-auto py-2 resize-none ${props.className ?? ''}`}
  />
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
  <select {...props} className={`${inputClass} ${props.className ?? ''}`} />
);

export const FieldRow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="grid grid-cols-2 gap-3">{children}</div>
);
