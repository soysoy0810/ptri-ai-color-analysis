interface AiNetworkFaceProps {
  className?: string;
}

/** Profile silhouette + geometric mesh — matches the approved kiosk board */
export function AiNetworkFace({ className = '' }: AiNetworkFaceProps) {
  return (
    <svg className={className} viewBox="0 0 220 280" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="aiFaceFill" x1="40" y1="20" x2="200" y2="260" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5AA8FF" />
          <stop offset="0.5" stopColor="#2F80ED" />
          <stop offset="1" stopColor="#0B1F3A" />
        </linearGradient>
        <clipPath id="faceClip">
          <path d="M210 20 C150 8 95 35 78 95 C60 160 78 215 118 255 C145 278 175 278 210 260 Z" />
        </clipPath>
      </defs>

      {/* Soft glow */}
      <ellipse cx="155" cy="150" rx="78" ry="110" fill="#2F80ED" opacity="0.12" />

      {/* Face silhouette (facing left, flat right edge like board) */}
      <path
        d="M210 18
           C155 6 100 30 82 90
           C62 155 80 212 122 252
           C148 275 180 275 210 258
           Z"
        fill="url(#aiFaceFill)"
      />

      {/* Mesh overlay clipped to face */}
      <g clipPath="url(#faceClip)" stroke="white" strokeWidth="1.6" opacity="0.9">
        <path d="M105 85 L135 60 L165 82 L155 120 L118 118 Z" fill="none" />
        <path d="M165 82 L190 110 L170 155 L155 120" fill="none" />
        <path d="M118 118 L130 165 L170 155" fill="none" />
        <path d="M130 165 L148 210 L170 155" fill="none" />
        <path d="M190 110 L200 145 L170 155" fill="none" />
        <path d="M148 210 L165 245 L185 200 L170 155" fill="none" />
        {[
          [105, 85],
          [135, 60],
          [165, 82],
          [155, 120],
          [118, 118],
          [190, 110],
          [170, 155],
          [130, 165],
          [200, 145],
          [148, 210],
          [165, 245],
          [185, 200],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="3.8" fill="white" stroke="none" />
        ))}
      </g>
    </svg>
  );
}
