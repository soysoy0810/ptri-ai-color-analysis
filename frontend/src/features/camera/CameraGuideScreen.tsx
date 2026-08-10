import { useEffect } from 'react';
import { Glasses, SunMedium, UserRound, Pause } from 'lucide-react';
import { CAMERA_GUIDE } from '../../data/catalog';
import { useCamera } from '../../shared/hooks/useCamera';
import { useFaceDetection } from '../../shared/hooks/useFaceDetection';
import { CameraFrame } from '../../shared/ui/CameraFrame';

interface CameraGuideScreenProps {
  onContinue: () => void;
}

const GUIDE_ICONS = {
  glasses: Glasses,
  still: Pause,
  forward: UserRound,
  light: SunMedium,
} as const;

export function CameraGuideScreen({ onContinue }: CameraGuideScreenProps) {
  const { videoRef, ready, error } = useCamera(true);
  const { face, isStable } = useFaceDetection(videoRef, ready && !error);

  // Auto-advance once a face is stably detected
  useEffect(() => {
    if (!isStable) return undefined;
    const t = window.setTimeout(onContinue, 700);
    return () => window.clearTimeout(t);
  }, [isStable, onContinue]);

  return (
    <section className="screen">
      <h1 className="screen-title text-center">Stand in front of the camera</h1>
      <p className="screen-sub text-center">
        We&apos;ll detect your face automatically — no need to line up with a guide.
      </p>

      <div className="mt-3">
        <CameraFrame
          videoRef={videoRef}
          error={error}
          className="mx-auto max-w-[340px]"
          brackets={false}
          overlay={
            <>
              {face ? (
                <div
                  className="pointer-events-none absolute rounded-[28%] border-[3px] border-emerald-300 transition-all duration-200"
                  style={{
                    left: `${face.x * 100}%`,
                    top: `${face.y * 100}%`,
                    width: `${face.width * 100}%`,
                    height: `${face.height * 100}%`,
                  }}
                />
              ) : null}
              <div className="absolute inset-x-4 bottom-4 rounded-2xl bg-navy/85 px-4 py-3 text-center text-sm font-bold text-white">
                {face ? 'Face found — continuing…' : 'Waiting for a face…'}
              </div>
            </>
          }
        />
      </div>

      <div className="mt-5 grid grid-cols-4 gap-2">
        {CAMERA_GUIDE.map((item) => {
          const Icon = GUIDE_ICONS[item.id as keyof typeof GUIDE_ICONS] || UserRound;
          return (
            <div key={item.id} className="flex flex-col items-center gap-2 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-2xl border border-line bg-white text-navy shadow-sm">
                <Icon className="h-5 w-5" strokeWidth={2.1} />
              </span>
              <span className="text-[11px] font-bold leading-tight text-navy">{item.label}</span>
            </div>
          );
        })}
      </div>

      <button type="button" className="btn btn-secondary mt-6 w-full" onClick={onContinue}>
        SKIP / CONTINUE
      </button>
    </section>
  );
}
