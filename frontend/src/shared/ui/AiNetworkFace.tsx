interface AiNetworkFaceProps {
  className?: string;
}

export function AiNetworkFace({ className = '' }: AiNetworkFaceProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 220 280"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="faceGrad" x1="40" y1="20" x2="180" y2="260" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2F80ED" />
          <stop offset="1" stopColor="#0B1F3A" />
        </linearGradient>
      </defs>
      <path
        d="M118 18C72 28 42 70 40 120c-2 52 22 96 58 122 18 13 36 20 54 22V40c-10-10-22-18-34-22Z"
        fill="url(#faceGrad)"
        opacity="0.95"
      />
      {[
        [78, 90],
        [102, 70],
        [126, 96],
        [90, 130],
        [118, 140],
        [148, 128],
        [100, 176],
        [132, 188],
        [156, 164],
        [114, 220],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="4" fill="white" opacity="0.9" />
      ))}
      <path
        d="M78 90 L102 70 L126 96 L118 140 L90 130 Z M126 96 L148 128 L132 188 L118 140 Z M90 130 L100 176 L132 188 L118 140 Z M100 176 L114 220 L132 188 Z M148 128 L156 164 L132 188 Z"
        stroke="white"
        strokeWidth="1.6"
        opacity="0.75"
      />
    </svg>
  );
}
