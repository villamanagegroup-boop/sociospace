'use client';

import { useState } from 'react';

type Props = {
  name: string;          // hidden input name (comma-joined values)
  options: { value: string; label: string }[];
  defaultValue?: string[];
  className?: string;
};

export default function ChipSelector({ name, options, defaultValue = [], className }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set(defaultValue));

  function toggle(v: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(v)) next.delete(v); else next.add(v);
      return next;
    });
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => {
          const on = selected.has(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              className={`px-3.5 py-1.5 rounded-pill text-sm font-semibold border-2 transition-all
                ${on
                  ? 'bg-ink text-cream border-ink shadow-ink-2 -translate-x-px -translate-y-px'
                  : 'bg-white border-ink/20 text-ink-3 hover:border-ink/50 hover:text-ink'}`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      <input type="hidden" name={name} value={Array.from(selected).join(',')} />
    </div>
  );
}
