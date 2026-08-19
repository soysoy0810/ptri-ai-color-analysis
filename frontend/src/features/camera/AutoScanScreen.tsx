import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Glasses, ImageOff, Loader2, RotateCcw, ScanFace, SunMedium, Wind } from 'lucide-react';
import { useCamera } from '../../shared/hooks/useCamera';
import { useFaceLandmarker, type NormPoint } from '../../shared/hooks/useFaceLandmarker';
import { assessLighting } from '../../shared/lib/colorEngine';
import { assessCapture, type CaptureQuality } from '../../shared/lib/captureQuality';
import { remapFaceToCoverCrop, remapLandmarksToCoverCrop } from '../../shared/lib/tryOnBody';
import { sampleLiveSkinRegions, type LiveSkinSample } from '../../shared/lib/liveSkinSample';
import type { FaceRegion, LightingInfo } from '../../shared/lib/types';

interface AutoScanScreenProps {
  onCapture: (
    dataUrl: string,
    canvas: HTMLCanvasElement,
    lighting: LightingInfo,
    faceBox: FaceRegion | null,
    landmarks: NormPoint[] | null,
    analysisFrames: string[],
  ) => void;
  /** Set when the backend AI analysis call failed — shown instead of the analyzing spinner, no silent fallback */
  errorMessage?: string | null;
  onRetry?: () => void;
}

/** Sparser than the full 478 points — reads as a real face mesh without the render cost */
function sampleDisplayLandmarks(landmarks: NormPoint[] | null): NormPoint[] | null {
  if (!landmarks) return null;
  return landmarks.filter((_, i) => i % 5 === 0);
}

/** Must match the camera frame's Tailwind `aspect-[4/5]` class below */
const CONTAINER_ASPECT = 4 / 5;

/**
 * The <video> renders with object-cover inside a 4:5 box, so it's cropped
 * on one axis whenever the camera's native aspect isn't also 4:5 (it never
 * is — cameras are ~16:9). Landmarks come back normalized to the *raw*
 * video frame, so without this they'd drift off wherever the actual face
 * is once the crop kicks in.
 */
function mapVideoPointToContainer(
  nx: number,
  ny: number,
  videoW: number,
  videoH: number,
): { x: number; y: number } {
  if (!videoW || !videoH) return { x: nx, y: ny };
  const videoAspect = videoW / videoH;
  if (videoAspect > CONTAINER_ASPECT) {
    // video is relatively wider — cropped left/right
    const visibleFrac = CONTAINER_ASPECT / videoAspect;
    const offset = (1 - visibleFrac) / 2;
    return { x: (nx - offset) / visibleFrac, y: ny };
  }
  // video is relatively taller — cropped top/bottom
  const visibleFrac = videoAspect / CONTAINER_ASPECT;
  const offset = (1 - visibleFrac) / 2;
  return { x: nx, y: (ny - offset) / visibleFrac };
}

const TIPS = [
  { icon: SunMedium, label: 'Good Lighting' },
  { icon: Glasses, label: 'Remove Glasses' },
  { icon: Wind, label: 'Pull Hair Back' },
  { icon: ImageOff, label: 'No Filter' },
] as const;

type ScanStatus = 'searching' | 'locked' | 'sampling' | 'analyzing';

/** Hold while several valid frames are collected for median Lab analysis. */
const SKIN_HOLD_MS = 1800;
const MIN_ANALYSIS_FRAMES = 4;
const ANALYSIS_FRAME_MS = 280;

/**
 * Kiosk-style automatic face scan. The visitor looks at the camera —
 * the face is detected, captured once, and used for every outfit.
 */
export function AutoScanScreen({ onCapture, errorMessage, onRetry }: AutoScanScreenProps) {
  const { videoRef, ready, error, captureCoverFrame } = useCamera(true);
  const { face, landmarks, isStable, getLatestLandmarks } = useFaceLandmarker(videoRef, ready && !error);
  const [status, setStatus] = useState<ScanStatus>('searching');
  const [quality, setQuality] = useState<CaptureQuality | null>(null);
  const [holdMs, setHoldMs] = useState(0);
  const [skinSamples, setSkinSamples] = useState<LiveSkinSample[]>([]);
  const capturedRef = useRef(false);
  const qualityRef = useRef<CaptureQuality | null>(null);
  const sampleCanvas = useRef<HTMLCanvasElement | null>(null);
  const holdStarted = useRef<number | null>(null);
  const analysisFramesRef = useRef<string[]>([]);
  const lastAnalysisFrameAt = useRef(0);
  const isStableRef = useRef(isStable);
  const statusRef = useRef<ScanStatus>('searching');
  const landmarksRef = useRef(landmarks);
  isStableRef.current = isStable;
  landmarksRef.current = landmarks;

  // Keep the failed capture locked until the visitor taps Try Again.
  // Resetting capturedRef here was immediately re-firing analyze in a loop.
  useEffect(() => {
    if (errorMessage) {
      holdStarted.current = null;
      analysisFramesRef.current = [];
      lastAnalysisFrameAt.current = 0;
      setHoldMs(0);
      setSkinSamples([]);
    }
  }, [errorMessage]);

  // `face` updates every detected frame. Keeping it in a ref (rather than
  // in the interval's dependency array) stops the interval being town down
  // and rebuilt before it can ever fire — which previously left `quality`
  // permanently null and blocked capture entirely.
  const faceRef = useRef(face);
  faceRef.current = face;

  // Live capture-quality assessment from real pixels + real face geometry.
  useEffect(() => {
    if (!ready || error) return undefined;
    const measure = () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || !video.videoWidth) return;

      if (!sampleCanvas.current) sampleCanvas.current = document.createElement('canvas');
      const canvas = sampleCanvas.current;
      const w = 160;
      const h = Math.round((video.videoHeight / video.videoWidth) * w);
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, w, h);

      const next = assessCapture(faceRef.current, ctx.getImageData(0, 0, w, h), landmarksRef.current);
      qualityRef.current = next;
      setQuality(next);
    };
    measure();
    const id = window.setInterval(measure, 120);
    return () => window.clearInterval(id);
  }, [ready, error, videoRef]);

  const videoW = videoRef.current?.videoWidth || 0;
  const videoH = videoRef.current?.videoHeight || 0;
  const displayFace = face
    ? (() => {
        const tl = mapVideoPointToContainer(face.x, face.y, videoW, videoH);
        const br = mapVideoPointToContainer(face.x + face.width, face.y + face.height, videoW, videoH);
        return { x: tl.x, y: tl.y, width: br.x - tl.x, height: br.y - tl.y };
      })()
    : null;
  const displayDots = sampleDisplayLandmarks(landmarks);
  const holdPct = Math.min(100, Math.round((holdMs / SKIN_HOLD_MS) * 100));
  const sampledNames = new Set(skinSamples.map((s) => s.name));
  const samplingLabel =
    holdPct < 25
      ? 'Checking face'
      : holdPct < 50
        ? 'Face detected — checking lighting'
        : holdPct < 75
          ? 'Checking position and skin visibility'
          : 'Collecting frames for skin analysis…';

  useEffect(() => {
    if (errorMessage || capturedRef.current || !ready || error) return undefined;

    const setScanStatus = (next: ScanStatus) => {
      if (statusRef.current === next) return;
      statusRef.current = next;
      setStatus(next);
    };

    const id = window.setInterval(() => {
      if (capturedRef.current) return;
      const currentFace = faceRef.current;
      const video = videoRef.current;
      if (!currentFace) {
        if (holdStarted.current != null) {
          holdStarted.current = null;
          analysisFramesRef.current = [];
          lastAnalysisFrameAt.current = 0;
          setHoldMs(0);
          setSkinSamples([]);
        }
        setScanStatus('searching');
        return;
      }
      if (!isStableRef.current || !qualityRef.current?.ok) {
        if (holdStarted.current != null) {
          holdStarted.current = null;
          analysisFramesRef.current = [];
          lastAnalysisFrameAt.current = 0;
          setHoldMs(0);
        }
        setScanStatus('locked');
        return;
      }
      const mapped = mapVideoPointToContainer(
        currentFace.x + currentFace.width / 2,
        currentFace.y + currentFace.height / 2,
        video?.videoWidth || 0,
        video?.videoHeight || 0,
      );
      const inGuide =
        Math.abs(mapped.x - 0.5) < 0.16 && Math.abs(mapped.y - 0.42) < 0.16;
      if (!inGuide) {
        if (holdStarted.current != null) {
          holdStarted.current = null;
          analysisFramesRef.current = [];
          lastAnalysisFrameAt.current = 0;
          setHoldMs(0);
        }
        setScanStatus('locked');
        return;
      }

      if (holdStarted.current == null) holdStarted.current = performance.now();
      setScanStatus('sampling');
      if (!video || video.readyState < 2) return;

      if (!sampleCanvas.current) sampleCanvas.current = document.createElement('canvas');
      const canvas = sampleCanvas.current;
      const w = 240;
      const h = Math.round((video.videoHeight / video.videoWidth) * w);
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, w, h);
      const frame = ctx.getImageData(0, 0, w, h);
      const samples = sampleLiveSkinRegions(frame, getLatestLandmarks());
      setSkinSamples(samples);

      const now = performance.now();
      if (now - lastAnalysisFrameAt.current >= ANALYSIS_FRAME_MS && analysisFramesRef.current.length < 8) {
        const mini = captureCoverFrame(CONTAINER_ASPECT, 400);
        if (mini) {
          analysisFramesRef.current.push(mini.dataUrl);
          lastAnalysisFrameAt.current = now;
        }
      }

      const elapsed = now - holdStarted.current;
      setHoldMs(elapsed);

      const enoughSkin = samples.length >= 3;
      const enoughFrames = analysisFramesRef.current.length >= MIN_ANALYSIS_FRAMES;
      const heldLongEnough =
        elapsed >= SKIN_HOLD_MS && enoughSkin && enoughFrames && isStableRef.current && qualityRef.current?.ok;
      if (!heldLongEnough) return;

      capturedRef.current = true;
      setScanStatus('analyzing');
      window.clearInterval(id);
      const shot = captureCoverFrame();
      if (shot) {
        const lighting = assessLighting(shot.canvas);
        const vw = video.videoWidth || shot.crop.vw;
        const vh = video.videoHeight || shot.crop.vh;
        onCapture(
          shot.dataUrl,
          shot.canvas,
          lighting,
          remapFaceToCoverCrop(currentFace, vw, vh),
          remapLandmarksToCoverCrop(getLatestLandmarks(), vw, vh),
          analysisFramesRef.current.slice(),
        );
      } else {
        capturedRef.current = false;
        holdStarted.current = null;
        analysisFramesRef.current = [];
        lastAnalysisFrameAt.current = 0;
      }
    }, 80);

    return () => window.clearInterval(id);
  }, [ready, error, captureCoverFrame, onCapture, getLatestLandmarks, videoRef, errorMessage]);

  return (
    <section className="screen">
      <p className="screen-sub text-center">
        Look at the camera. We capture your face once — this photo is used for every outfit.
      </p>

      {/* Full-width camera view */}
      <div className="relative mx-auto w-full max-w-[380px] overflow-hidden rounded-3xl bg-navy-ink shadow-ai">
        <span className="ai-chip absolute left-3 top-3 z-[4] border-sky-300/30 bg-navy/70 text-sky-200">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
          AI live
        </span>
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
              <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 125" aria-hidden="true">
                <ellipse
                  cx="50"
                  cy="48"
                  rx="28"
                  ry="36"
                  fill="none"
                  stroke="#7dd3fc"
                  strokeWidth="1.4"
                  strokeDasharray="3 2.5"
                />
              </svg>

              {/* scanning beam */}
              <motion.div
                className="pointer-events-none absolute inset-x-0 h-16 bg-gradient-to-b from-transparent via-sky-300/30 to-transparent"
                animate={{ top: ['2%', '84%', '2%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              />

              {/* live landmark mesh — real detected points, not decoration */}
              {displayDots && status !== 'analyzing' ? (
                <svg
                  className="pointer-events-none absolute inset-0 h-full w-full"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  {displayDots.map(([nx, ny], i) => {
                    if (i % 2 !== 0 || i + 1 >= displayDots.length) return null;
                    const a = mapVideoPointToContainer(nx, ny, videoW, videoH);
                    const b = mapVideoPointToContainer(displayDots[i + 1][0], displayDots[i + 1][1], videoW, videoH);
                    const dx = a.x - b.x;
                    const dy = a.y - b.y;
                    if (dx * dx + dy * dy > 0.012) return null;
                    return (
                      <line
                        key={`l-${i}`}
                        x1={a.x * 100}
                        y1={a.y * 100}
                        x2={b.x * 100}
                        y2={b.y * 100}
                        stroke="#7dd3fc"
                        strokeOpacity={0.35}
                        strokeWidth={0.18}
                      />
                    );
                  })}
                  {displayDots.map(([nx, ny], i) => {
                    const p = mapVideoPointToContainer(nx, ny, videoW, videoH);
                    return <circle key={i} cx={p.x * 100} cy={p.y * 100} r={0.45} fill="#e0f2fe" fillOpacity={0.9} />;
                  })}
                </svg>
              ) : null}

              {/* face lock box */}
              {displayFace && status !== 'analyzing' ? (
                <div
                  className="pointer-events-none absolute rounded-[26%] border-[3px] border-sky-300 shadow-[0_0_24px_rgba(125,211,252,0.45)] transition-all duration-200"
                  style={{
                    left: `${displayFace.x * 100}%`,
                    top: `${displayFace.y * 100}%`,
                    width: `${displayFace.width * 100}%`,
                    height: `${displayFace.height * 100}%`,
                  }}
                >
                  <span className="absolute left-0 top-0 h-5 w-5 border-l-[3px] border-t-[3px] border-white" />
                  <span className="absolute right-0 top-0 h-5 w-5 border-r-[3px] border-t-[3px] border-white" />
                  <span className="absolute bottom-0 left-0 h-5 w-5 border-b-[3px] border-l-[3px] border-white" />
                  <span className="absolute bottom-0 right-0 h-5 w-5 border-b-[3px] border-r-[3px] border-white" />
                </div>
              ) : null}

              {/* Honest failure state — no silent fallback to different math, just a real retry */}
              <AnimatePresence>
                {errorMessage ? (
                  <motion.div
                    className="absolute inset-0 z-[3] grid place-items-center bg-navy/95 px-6 text-center backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <div className="flex flex-col items-center gap-3 text-white">
                      <AlertTriangle className="h-10 w-10 text-amber-300" />
                      <p className="text-sm font-bold">{errorMessage}</p>
                      <button
                        type="button"
                        onClick={() => {
                          capturedRef.current = false;
                          holdStarted.current = null;
                          analysisFramesRef.current = [];
                          lastAnalysisFrameAt.current = 0;
                          setHoldMs(0);
                          setSkinSamples([]);
                          statusRef.current = 'searching';
                          setStatus('searching');
                          onRetry?.();
                        }}
                        className="mt-1 flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-navy"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Try Again
                      </button>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              {/* the instant the face is captured, cover the camera with the analyzing loader */}
              <AnimatePresence>
                {status === 'analyzing' && !errorMessage ? (
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
                      <p className="text-sm font-bold">Analyzing skin tone…</p>
                      <p className="max-w-[220px] text-center text-[11px] font-medium text-white/70">
                        Detecting landmarks, sampling skin regions, then classifying undertone and depth.
                      </p>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              {/* status bar inside the camera view */}
              <div className="absolute inset-x-3 bottom-3 rounded-2xl bg-navy/85 px-4 py-3 text-white backdrop-blur">
                <div className="flex items-center justify-center gap-2 text-center text-sm font-bold">
                  {errorMessage ? (
                    <>
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" />
                      Analysis paused — tap Try Again
                    </>
                  ) : status === 'analyzing' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-emerald-300" />
                      Measuring skin tone — please wait.
                    </>
                  ) : status === 'sampling' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-emerald-300" />
                      {samplingLabel}
                    </>
                  ) : quality && !quality.ok ? (
                    // Real, measured guidance from the live frame
                    <>
                      <ScanFace className="h-4 w-4 shrink-0 animate-pulse text-amber-300" />
                      {quality.guidance}
                    </>
                  ) : status === 'locked' ? (
                    <>
                      <ScanFace className="h-4 w-4 shrink-0 animate-pulse text-amber-300" />
                      Align your face with the oval and hold still
                    </>
                  ) : quality?.ok ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-emerald-300" />
                      Good — hold still
                    </>
                  ) : (
                    <>
                      <ScanFace className="h-4 w-4 animate-pulse" />
                      Look into the oval…
                    </>
                  )}
                </div>

                {/* Live quality checklist — each item reflects a real measurement */}
                {status !== 'analyzing' && quality ? (
                  <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[9px] font-bold uppercase tracking-wide">
                    {[
                      {
                        label: 'Face detected',
                        ok: !quality.issues.includes('no_face'),
                      },
                      {
                        label: 'Lighting',
                        ok: !quality.issues.some(
                          (i) => i === 'too_dark' || i === 'too_bright' || i === 'harsh_shadow',
                        ),
                      },
                      {
                        label: 'Position',
                        ok: !quality.issues.some((i) => i === 'too_far' || i === 'too_close' || i === 'off_center'),
                      },
                      {
                        label: 'Skin visibility',
                        ok: sampledNames.size >= 3,
                      },
                      {
                        label: 'Image quality',
                        ok: !quality.issues.includes('blurry'),
                      },
                    ].map((row) => (
                      <span key={row.label} className={row.ok ? 'text-emerald-300' : 'text-white/40'}>
                        {row.ok ? '✓ ' : ''}
                        {row.label}
                      </span>
                    ))}
                  </div>
                ) : null}
                {status === 'sampling' || status === 'analyzing' || status === 'locked' ? (
                  <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/20">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-sky-300 to-accent"
                      animate={{
                        width:
                          status === 'analyzing'
                            ? '100%'
                            : status === 'sampling'
                              ? `${Math.max(12, holdPct)}%`
                              : '18%',
                      }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                    />
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Tips row */}
      <p className="mt-6 text-center text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">
        Tips
      </p>
      <div className="mt-2.5 grid grid-cols-4 gap-2">
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
