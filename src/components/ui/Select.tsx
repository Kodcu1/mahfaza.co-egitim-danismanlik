import React from 'react';

interface Option {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Option[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className = '', id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-xs font-semibold text-slate-700 tracking-wide">
            {label}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={`w-full bg-white text-slate-900 border ${
            error
              ? 'border-rose-400 focus:ring-rose-500/20 focus:border-rose-500'
              : 'border-slate-200 focus:border-amber-500 focus:ring-amber-500/20'
          } rounded-xl px-3.5 py-2 text-sm transition-all shadow-xs focus:outline-none focus:ring-2 disabled:opacity-50 disabled:bg-slate-50 ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-white text-slate-900">
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-rose-600 mt-0.5">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
