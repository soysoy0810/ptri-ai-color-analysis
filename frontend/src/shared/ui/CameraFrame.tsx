import type { ReactNode, Ref } from 'react';

interface CameraFrameProps {
  videoRef?: Ref<HTMLVideoElement>;
  error?: string;
  overlay?: ReactNode;
  brackets?: boolean;
  className?: string;
}

export function CameraFrame({
  videoRef,
  error,
  overlay,
  brackets = true,
  className = '',
}: CameraFrameProps) {
  return (
    <div
      className={`relative aspect-[3/4] overflow-hidden rounded-3xl bg-navy-ink shadow-kiosk ${className}`}
    >
      {error ? (
        <div className="grid h-full place-items-center px-6 text-center text-white">{error}</div>
      ) : (
        <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
      )}

      {brackets ? (
        <div className="pointer-events-none absolute inset-[10%] border border-white/20">
          <span className="absolute left-0 top-0 h-8 w-8 border-l-4 border-t-4 border-white" />
          <span className="absolute right-0 top-0 h-8 w-8 border-r-4 border-t-4 border-white" />
          <span className="absolute bottom-0 left-0 h-8 w-8 border-b-4 border-l-4 border-white" />
          <span className="absolute bottom-0 right-0 h-8 w-8 border-b-4 border-r-4 border-white" />
        </div>
      ) : null}

      {overlay}
    </div>
  );
}
