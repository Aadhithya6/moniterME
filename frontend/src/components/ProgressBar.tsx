type Props = {
  value: number;
  max: number;
  label: string;
  color?: 'emerald' | 'blue' | 'amber';
};

export default function ProgressBar({ value, max, label, color = 'emerald' }: Props) {
  const percent = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const colorClass =
    color === 'emerald'
      ? 'bg-emerald-500'
      : color === 'blue'
        ? 'bg-blue-500'
        : 'bg-amber-500';

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="text-slate-500">
          {value} / {max}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full transition-all ${colorClass}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
