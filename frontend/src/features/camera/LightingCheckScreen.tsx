import { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { useCamera } from '../../shared/hooks/useCamera';
import { assessLighting } from '../../shared/lib/colorEngine';
import type { LightingInfo } from '../../shared/lib/types';
import { CameraFrame } from '../../shared/ui/CameraFrame';

interface LightingCheckScreenProps {
  onComplete: (lighting: LightingInfo) => void;
}

export function LightingCheckScreen({ onComplete }: LightingCheckScreenProps) {
  const { videoRef, ready, error, captureFrame } = useCamera(true);
  const [lighting, setLighting] = useState<LightingInfo | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!ready || error) return undefined;

    const timer = window.setTimeout(() => {
      const frame = captureFrame();
      if (!frame) {
        const fallback: LightingInfo = { mean_luma: 120, contrast: 28, status: 'fair' };
        setLighting(fallback);
        setChecking(false);
        return;
      }
      const result = assessLighting(frame.canvas);
      setLighting(result);
      setChecking(false);
    }, 1600);

    return () => window.clearTimeout(timer);
  }, [ready, error, captureFrame]);

  const status = lighting?.status ?? 'checking';
  const statusLabel =
    status === 'good' ? 'Lighting looks great' : status === 'poor' ? 'Lighting needs improvement' : 'Lighting is acceptable';

  return (
    <section className="screen">
      <h1 className="screen-title">Lighting & Quality Check</h1>
      <p className="screen-sub">We&apos;re checking brightness and contrast for accurate color analysis.</p>

      <CameraFrame
        videoRef={videoRef}
        error={error}
        overlay={
          <div className="absolute inset-x-4 bottom-4 rounded-2xl bg-navy/85 px-4 py-3 text-white backdrop-blur">
            <div className="flex items-center gap-2 text-sm font-bold">
              {checking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : status === 'good' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-300" />
              )}
              {checking ? 'Checking quality…' : statusLabel}
            </div>
            {lighting ? (
              <p className="mt-1 text-xs text-white/80">
                Brightness {lighting.mean_luma} · Contrast {lighting.contrast}
              </p>
            ) : null}
          </div>
        }
      />

      <button
        type="button"
        className="btn btn-primary mt-5 w-full"
        disabled={checking || !!error}
        onClick={() => lighting && onComplete(lighting)}
      >
        {checking ? 'Please wait…' : status === 'poor' ? 'CONTINUE ANYWAY' : 'PROCEED TO SCAN'}
      </button>
    </section>
  );
}
