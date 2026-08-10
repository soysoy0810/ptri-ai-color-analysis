interface ProgressRingProps {
  value: number;
  size?: number;
  stroke?: number;
}

export function ProgressRing({ value, size = 168, stroke = 12 }: ProgressRingProps) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E8F1FF"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#2F80ED"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-300 ease-out"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="text-4xl font-extrabold text-navy">{Math.round(value)}%</span>
      </div>
    </div>
  );
}
