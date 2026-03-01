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
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-gray-300">{label}</span>
        <span className="text-gray-500">
          {value} / {max}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
