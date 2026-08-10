import { useEffect, useRef, useState } from 'react';
import { Loader2, ScanFace } from 'lucide-react';
import { CameraFrame } from '../../shared/ui/CameraFrame';
import { useCamera } from '../../shared/hooks/useCamera';
import { useFaceDetection } from '../../shared/hooks/useFaceDetection';

interface LiveScanScreenProps {
  onCapture: (dataUrl: string, canvas: HTMLCanvasElement) => void;
}

export function LiveScanScreen({ onCapture }: LiveScanScreenProps) {
  const { videoRef, ready, error, captureFrame } = useCamera(true);
  const { face, isStable } = useFaceDetection(videoRef, ready && !error);
  const [status, setStatus] = useState<'searching' | 'locked' | 'capturing'>('searching');
  const capturedRef = useRef(false);

  useEffect(() => {
    if (!face) {
      setStatus('searching');
      return;
    }
    if (isStable && !capturedRef.current) {
      setStatus('capturing');
      capturedRef.current = true;
      const timer = window.setTimeout(() => {
        const frame = captureFrame();
        if (frame) onCapture(frame.dataUrl, frame.canvas);
      }, 450);
      return () => window.clearTimeout(timer);
    }
    setStatus('locked');
    return undefined;
  }, [face, isStable, captureFrame, onCapture]);

  return (
    <section className="screen">
      <h1 className="screen-title">Live Face Scanning</h1>
      <p className="screen-sub">
        Just stand in front of the camera. We&apos;ll detect your face automatically and start the
        analysis.
      </p>

      <CameraFrame
        videoRef={videoRef}
        error={error}
        brackets={false}
        overlay={
          <>
            {face ? (
              <div
                className="pointer-events-none absolute rounded-[28%] border-[3px] border-sky-300 shadow-[0_0_0_9999px_rgba(7,21,38,0.28)] transition-all duration-200"
                style={{
                  left: `${face.x * 100}%`,
                  top: `${face.y * 100}%`,
                  width: `${face.width * 100}%`,
                  height: `${face.height * 100}%`,
                }}
              >
                <span className="absolute left-0 top-0 h-5 w-5 border-l-[3px] border-t-[3px] border-white" />
                <span className="absolute right-0 top-0 h-5 w-5 border-r-[3px] border-t-[3px] border-white" />
                <span className="absolute bottom-0 left-0 h-5 w-5 border-b-[3px] border-l-[3px] border-white" />
                <span className="absolute bottom-0 right-0 h-5 w-5 border-b-[3px] border-r-[3px] border-white" />
              </div>
            ) : (
              <div className="pointer-events-none absolute inset-[12%] border border-dashed border-white/35" />
            )}

            <div className="absolute inset-x-4 bottom-4 rounded-2xl bg-navy/88 px-4 py-3 text-white backdrop-blur">
              <div className="flex items-center gap-2 text-sm font-bold">
                {status === 'searching' ? (
                  <>
                    <ScanFace className="h-4 w-4 animate-pulse" />
                    Looking for a face…
                  </>
                ) : status === 'locked' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-sky-300" />
                    Face detected — hold still
                  </>
                ) : (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-300" />
                    Capturing for AI analysis…
                  </>
                )}
              </div>
            </div>
          </>
        }
      />

      <p className="mt-4 text-center text-xs font-semibold text-muted">
        No need to align to a guide — detection locks onto your face automatically.
      </p>
    </section>
  );
}
