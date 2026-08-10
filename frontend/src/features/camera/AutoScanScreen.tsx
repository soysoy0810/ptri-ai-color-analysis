import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Glasses, ScanFace, SunMedium, UserRound, Zap } from 'lucide-react';
import { useCamera } from '../../shared/hooks/useCamera';
import { useFaceDetection } from '../../shared/hooks/useFaceDetection';
import { assessLighting } from '../../shared/lib/colorEngine';
import type { LightingInfo } from '../../shared/lib/types';

interface AutoScanScreenProps {
  onCapture: (dataUrl: string, canvas: HTMLCanvasElement, lighting: LightingInfo) => void;
}

const TIPS = [
  { icon: UserRound, label: 'Face forward' },
  { icon: SunMedium, label: 'Good lighting' },
  { icon: Glasses, label: 'Remove glasses & face mask' },
  { icon: Zap, label: 'Avoid strong backlight' },
] as const;

type ScanStatus = 'searching' | 'locked' | 'capturing';

/**
 * Fully automatic scan: the visitor just stands in front of the kiosk.
 * Face detection locks on, lighting is checked from the same frame,
 * and capture + analysis start on their own. No buttons.
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
      setStatus('capturing');
      // schedule once; deliberately not cleared on re-render so the capture always fires
      window.setTimeout(() => {
        const frame = captureFrame();
        if (frame) {
          const lighting = assessLighting(frame.canvas);
          onCapture(frame.dataUrl, frame.canvas, lighting);
        } else {
          capturedRef.current = false;
        }
      }, 600);
      return;
    }
    if (!capturedRef.current) setStatus('locked');
  }, [face, isStable, captureFrame, onCapture]);

  const statusText =
    status === 'searching'
      ? 'Stand in front of the camera…'
      : status === 'locked'
        ? 'Face detected — hold still'
        : 'Capturing — starting AI analysis…';

  return (
    <section className="screen">
      <h1 className="screen-title text-center">Just stand in front of the camera</h1>
      <p className="screen-sub text-center">
        Your face is detected automatically — no buttons, no positioning needed.
      </p>

      {/* Circular live camera with animated scan ring */}
      <div className="relative mx-auto mt-1 h-[300px] w-[300px]">
        {/* rotating dashed detection ring */}
        <motion.div
          className="absolute -inset-3 rounded-full border-2 border-dashed border-accent/50"
          animate={{ rotate: 360 }}
          transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className={`absolute -inset-1.5 rounded-full border-[3px] ${
            status === 'searching' ? 'border-line' : 'border-accent'
          }`}
          animate={status !== 'searching' ? { scale: [1, 1.03, 1] } : {}}
          transition={{ duration: 1.4, repeat: Infinity }}
        />

        <div className="absolute inset-0 overflow-hidden rounded-full bg-navy-ink shadow-kiosk">
          {error ? (
            <div className="grid h-full place-items-center px-6 text-center text-sm font-semibold text-white">
              {error}
            </div>
          ) : (
            <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
          )}

          {/* face lock box */}
          {face && !error ? (
            <div
              className="pointer-events-none absolute rounded-[30%] border-2 border-sky-300 transition-all duration-200"
              style={{
                left: `${face.x * 100}%`,
                top: `${face.y * 100}%`,
                width: `${face.width * 100}%`,
                height: `${face.height * 100}%`,
              }}
            />
          ) : null}

          {/* scanning beam */}
          {!error ? (
            <motion.div
              className="pointer-events-none absolute inset-x-0 h-14 bg-gradient-to-b from-transparent via-sky-300/35 to-transparent"
              animate={{ top: ['4%', '82%', '4%'] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
            />
          ) : null}
        </div>
      </div>

      {/* Live status chip */}
      <motion.div
        className="mx-auto mt-5 flex items-center gap-2 rounded-full bg-navy px-5 py-2.5 text-sm font-bold text-white shadow-kiosk"
        animate={{ opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 1.6, repeat: Infinity }}
      >
        <ScanFace className={`h-4 w-4 ${status === 'searching' ? 'animate-pulse' : 'text-sky-300'}`} />
        {statusText}
      </motion.div>

      {/* Tips row */}
      <div className="mt-7 grid grid-cols-4 gap-2">
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
