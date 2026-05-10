'use client';

import { useState } from 'react';

export default function ExtraRatesField() {
  const [rows, setRows] = useState<Array<{ id: number }>>([]);
  let nextId = rows.length;

  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.id} className="grid grid-cols-[1fr_120px_auto] gap-2 items-center">
          <input
            type="text"
            name="extra_type[]"
            placeholder="e.g. Brand whitelisting"
            className="border-2 border-ink/20 rounded-lg px-3 py-2 text-sm focus:border-ink"
          />
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 text-sm">$</span>
            <input
              type="number"
              name="extra_rate[]"
              min="0"
              step="1"
              placeholder="0"
              className="w-full pl-7 pr-3 py-2 border-2 border-ink/20 rounded-lg text-sm focus:border-ink"
            />
          </div>
          <button
            type="button"
            onClick={() => setRows(prev => prev.filter(x => x.id !== r.id))}
            className="text-ink-3 hover:text-pink-bright text-xl px-2"
            aria-label="Remove"
          >×</button>
          {/* sibling description input goes on a new line below for compactness */}
          <input
            type="text"
            name="extra_desc[]"
            placeholder="Short description (optional)"
            className="col-span-3 border-2 border-ink/10 rounded-lg px-3 py-1.5 text-xs focus:border-ink"
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() => setRows(prev => [...prev, { id: nextId++ }])}
        className="text-sm font-semibold text-pink-bright hover:text-ink"
      >
        + Add custom rate
      </button>
    </div>
  );
}
