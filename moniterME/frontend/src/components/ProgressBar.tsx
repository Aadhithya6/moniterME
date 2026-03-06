type Props = {
  value: number;
  max: number;
  label: string;
  color?: 'accent' | 'blue' | 'warning';
};

export default function ProgressBar({ value, max, label, color = 'accent' }: Props) {
  const percent = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  
  const colorHex = 
    color === 'accent' ? 'var(--accent)' : 
    color === 'blue' ? 'var(--signal-blue)' : 
    'var(--warning)';

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-baseline">
        <span className="performance-header">{label}</span>
        <span className="font-mono-numeric text-[0.7rem] text-[#8B949E]">
          {value.toLocaleString()} / {max.toLocaleString()}
        </span>
      </div>
      <div className="h-[3px] w-full bg-[#161B23]">
        <div
          className="h-full transition-all duration-700 ease-out fill-animation"
          style={{ 
            width: `${percent}%`,
            backgroundColor: colorHex,
            boxShadow: `0 0 10px ${colorHex}40`
          }}
        />
      </div>
    </div>
  );
}
