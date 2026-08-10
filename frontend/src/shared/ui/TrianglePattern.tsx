interface TrianglePatternProps {
  className?: string;
}

export function TrianglePattern({ className = '' }: TrianglePatternProps) {
  return (
    <svg
      className={`pointer-events-none ${className}`}
      viewBox="0 0 220 180"
      fill="none"
      aria-hidden="true"
    >
      <path d="M40 160 L90 40 L140 160 Z" fill="#0B1F3A" opacity="0.9" />
      <path d="M90 160 L140 55 L190 160 Z" fill="#2F80ED" opacity="0.85" />
      <path d="M10 160 L55 95 L100 160 Z" fill="#93C5FD" opacity="0.7" />
      <path d="M120 160 L165 90 L210 160 Z" fill="#0A2540" opacity="0.75" />
      <path d="M70 160 L115 110 L160 160 Z" fill="#E8F1FF" opacity="0.9" />
    </svg>
  );
}
