interface SegmentedTabsProps<T extends string> {
  options: readonly { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  ariaLabel: string;
  size?: 'md' | 'sm';
  className?: string;
}

/** แถบสลับหมวดทรง pill: พื้นของตัวที่เลือกเลื่อนตามไปยังแท็บใหม่ */
export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  size = 'md',
  className = 'bg-cream-200',
}: SegmentedTabsProps<T>) {
  const index = Math.max(0, options.findIndex((o) => o.id === value));
  const n = options.length;
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`relative grid p-1 rounded-full ${className}`}
      style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden="true"
        className="seg-thumb absolute top-1 bottom-1 left-1 rounded-full bg-cream-50 shadow-[0_1px_2px_rgba(42,34,27,0.12)]"
        style={{ width: `calc((100% - 0.5rem) / ${n})`, transform: `translateX(${index * 100}%)` }}
      />
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={value === o.id}
          onClick={() => onChange(o.id)}
          className={`relative rounded-full transition-colors duration-200 ${
            size === 'sm' ? 'h-8 text-xs font-bold' : 'h-9 text-sm font-semibold'
          } ${value === o.id ? 'text-ink-900' : 'text-ink-500'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
