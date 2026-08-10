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
      <h1 className="screen-title text-center">Position your face within the frame</h1>

      <div className="mt-2">
        <CameraFrame videoRef={videoRef} error={error} className="mx-auto max-w-[340px]" />
      </div>

      <div className="mt-5 grid grid-cols-4 gap-2">
        {CAMERA_GUIDE.map((item) => {
          const Icon = GUIDE_ICONS[item.id];
          return (
            <div key={item.id} className="flex flex-col items-center gap-2 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-2xl border border-line bg-white text-navy shadow-sm">
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-[11px] font-bold leading-tight text-navy">{item.label}</span>
            </div>
          );
        })}
      </div>

      <button type="button" className="btn btn-primary mt-6 w-full" onClick={onContinue}>
        CONTINUE
      </button>
    </section>
  );
}
