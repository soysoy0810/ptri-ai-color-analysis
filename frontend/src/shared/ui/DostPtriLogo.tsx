interface DostPtriLogoProps {
  className?: string;
}

const LOGO_SRC = `${import.meta.env.BASE_URL}brand/ptri-logo-navy.png`;

/** Official DOST–PTRI mark (from PTRI brand assets) */
export function DostPtriLogo({ className = '' }: DostPtriLogoProps) {
  return (
    <img
      src={LOGO_SRC}
      alt="DOST–PTRI"
      className={`object-contain ${className}`}
      draggable={false}
    />
  );
}
