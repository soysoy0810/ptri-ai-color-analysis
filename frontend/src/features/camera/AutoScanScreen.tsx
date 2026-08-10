import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Glasses, Loader2, ScanFace, SunMedium, UserRound, Zap } from 'lucide-react';
import { useCamera } from '../../shared/hooks/useCamera';
import { useFaceDetection } from '../../shared/hooks/useFaceDetection';
import { assessLighting } from '../../shared/lib/colorEngine';
import type { FaceRegion, LightingInfo } from '../../shared/lib/types';

interface AutoScanScreenProps {
  onCapture: (
    dataUrl: string,
    canvas: HTMLCanvasElement,
    lighting: LightingInfo,
    faceBox: FaceRegion | null,
  ) => void;
}

const TIPS = [
  { icon: UserRound, label: 'Face forward' },
  { icon: SunMedium, label: 'Good lighting' },
  { icon: Glasses, label: 'No glasses' },
  { icon: Zap, label: 'No backlight' },
] as const;

type ScanStatus = 'searching' | 'locked' | 'analyzing';

/**
 * Kiosk-style automatic scan: full square camera view. The visitor just
 * stands in front of the screen — the face is detected, captured and the
 * app moves straight into AI analysis. No buttons.
 */
export function AutoScanScreen({ onCapture }: AutoScanScreenProps) {
  const { videoRef, ready, error, captureFrame } = useCamera(true);
  const { face, isStable } = useFaceDetection(videoRef, ready && !error);
  const [status, setStatus] = useState<ScanStatus>('searching');
  const capturedRef = useRef(false);

  useEffect(() => {
    if (!face) {
      if (!capturedRef.current) setStatus('searching');
      return;
    }
    if (isStable && !capturedRef.current) {
      capturedRef.current = true;
      setStatus('analyzing');
      const faceBox = face;
      // scheduled once; not cleared on re-render so the capture always fires
      window.setTimeout(() => {
        const frame = captureFrame();
        if (frame) {
          const lighting = assessLighting(frame.canvas);
          onCapture(frame.dataUrl, frame.canvas, lighting, faceBox);
        } else {
          capturedRef.current = false;
        }
      }, 350);
      return;
    }
    if (!capturedRef.current) setStatus('locked');
  }, [face, isStable, captureFrame, onCapture]);

  return (
    <section className="screen">
      <h1 className="screen-title text-center">Just stand in front of the camera</h1>
      <p className="screen-sub text-center">
        Your face is detected automatically — no buttons, no positioning needed.
      </p>

      {/* Full-width square camera view, like the kiosk screen */}
      <div className="relative mx-auto w-full max-w-[380px] overflow-hidden rounded-3xl bg-navy-ink shadow-kiosk">
        <div className="relative aspect-[4/5]">
          {error ? (
            <div className="grid h-full place-items-center px-6 text-center text-sm font-semibold text-white">
              {error}
            </div>
          ) : (
            <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
          )}

          {!error ? (
            <>
              {/* corner brackets */}
              <div className="pointer-events-none absolute inset-[6%]">
                <span className="absolute left-0 top-0 h-9 w-9 border-l-4 border-t-4 border-white/90" />
                <span className="absolute right-0 top-0 h-9 w-9 border-r-4 border-t-4 border-white/90" />
                <span className="absolute bottom-0 left-0 h-9 w-9 border-b-4 border-l-4 border-white/90" />
                <span className="absolute bottom-0 right-0 h-9 w-9 border-b-4 border-r-4 border-white/90" />
              </div>

              {/* scanning beam */}
              <motion.div
                className="pointer-events-none absolute inset-x-0 h-16 bg-gradient-to-b from-transparent via-sky-300/30 to-transparent"
                animate={{ top: ['2%', '84%', '2%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              />

              {/* face lock box */}
              {face && status !== 'analyzing' ? (
                <div
                  className="pointer-events-none absolute rounded-[26%] border-[3px] border-sky-300 shadow-[0_0_24px_rgba(125,211,252,0.45)] transition-all duration-200"
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
              ) : null}

              {/* the instant the face is captured, cover the camera with the analyzing loader */}
              <AnimatePresence>
                {status === 'analyzing' ? (
                  <motion.div
                    className="absolute inset-0 z-[2] grid place-items-center bg-navy/92 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <div className="flex flex-col items-center gap-4 text-white">
                      <div className="relative h-24 w-24">
                        <motion.div
                          className="absolute inset-0 rounded-full border-4 border-sky-300/25 border-t-sky-300"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        />
                        <div className="absolute inset-4 grid place-items-center rounded-full bg-gradient-to-br from-accent to-navy">
                          <span className="text-lg font-extrabold">AI</span>
                        </div>
                      </div>
                      <p className="text-sm font-bold">Face captured — analyzing…</p>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              {/* status bar inside the camera view */}
              <div className="absolute inset-x-3 bottom-3 rounded-2xl bg-navy/85 px-4 py-3 text-white backdrop-blur">
                <div className="flex items-center justify-center gap-2 text-sm font-bold">
                  {status === 'searching' ? (
                    <>
                      <ScanFace className="h-4 w-4 animate-pulse" />
                      Stand in front of the camera…
                    </>
                  ) : status === 'locked' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-sky-300" />
                      Face detected — hold still
                    </>
                  ) : (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-emerald-300" />
                      Analyzing your colors…
                    </>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Tips row */}
      <div className="mt-6 grid grid-cols-4 gap-2">
        {TIPS.map((tip, i) => (
          <motion.div
            key={tip.label}
            className="flex flex-col items-center gap-2 text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.1 }}
          >
            <span className="grid h-14 w-14 place-items-center rounded-2xl border border-line bg-white text-navy shadow-sm">
              <tip.icon className="h-5 w-5" strokeWidth={2} />
            </span>
            <span className="text-[11px] font-bold leading-tight text-navy">{tip.label}</span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
