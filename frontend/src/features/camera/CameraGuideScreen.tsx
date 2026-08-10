import { Glasses, SunMedium, UserRound, Wind } from 'lucide-react';
import { CAMERA_GUIDE } from '../../data/catalog';
import { useCamera } from '../../shared/hooks/useCamera';
import { CameraFrame } from '../../shared/ui/CameraFrame';

interface CameraGuideScreenProps {
  onContinue: () => void;
}

const GUIDE_ICONS = {
  glasses: Glasses,
  forward: UserRound,
  hair: Wind,
  light: SunMedium,
} as const;

export function CameraGuideScreen({ onContinue }: CameraGuideScreenProps) {
  const { videoRef, error } = useCamera(true);

  return (
    <section className="screen">
      <h1 className="screen-title">Camera Guide</h1>
      <p className="screen-sub">Position your face within the frame</p>

      <CameraFrame videoRef={videoRef} error={error} />

      <div className="mt-4 grid grid-cols-4 gap-2">
        {CAMERA_GUIDE.map((item) => {
          const Icon = GUIDE_ICONS[item.id];
          return (
            <div
              key={item.id}
              className="flex flex-col items-center gap-1.5 rounded-2xl bg-accent-soft px-1 py-3 text-center"
            >
              <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-navy shadow-sm">
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-[10px] font-bold leading-tight text-navy">{item.label}</span>
            </div>
          );
        })}
      </div>

      <button type="button" className="btn btn-primary mt-5 w-full" onClick={onContinue}>
        I&apos;M READY
      </button>
    </section>
  );
}
