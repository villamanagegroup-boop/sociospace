type Props = {
  current: number;       // 1-indexed
  total: number;
  labels?: string[];
};

export default function ProgressBar({ current, total, labels }: Props) {
  const pct = Math.min(100, Math.max(0, ((current - 1) / Math.max(1, total - 1)) * 100));
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-ink-3 font-semibold mb-2">
        <span>Step {current} of {total}</span>
        <span>{Math.round((current / total) * 100)}%</span>
      </div>
      <div className="relative h-2 bg-cream-2 rounded-pill overflow-hidden border border-ink/10">
        <div
          className="absolute inset-y-0 left-0 bg-yellow rounded-pill transition-all duration-300"
          style={{ width: `${(current / total) * 100}%` }}
        />
      </div>
      {labels && (
        <div className="grid mt-2 text-[10px] uppercase tracking-wider text-ink-4 font-semibold" style={{ gridTemplateColumns: `repeat(${total}, 1fr)` }}>
          {labels.map((l, i) => (
            <span key={i} className={`text-center ${i + 1 === current ? 'text-ink' : ''}`}>{l}</span>
          ))}
        </div>
      )}
    </div>
  );
}
