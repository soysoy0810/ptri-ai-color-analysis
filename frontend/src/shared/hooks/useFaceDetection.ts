import { useEffect, useRef, useState, type RefObject } from 'react';

export interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FaceDetectorLike {
  detect: (source: HTMLVideoElement) => Promise<Array<{ boundingBox: DOMRectReadOnly }>>;
}

declare global {
  interface Window {
    FaceDetector?: new (options?: { fastMode?: boolean; maxDetectedFaces?: number }) => FaceDetectorLike;
  }
}

function scoreSkinRegion(
  data: Uint8ClampedArray,
  width: number,
  _height: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
) {
  let skin = 0;
  let total = 0;
  for (let y = y0; y < y1; y += 4) {
    for (let x = x0; x < x1; x += 4) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      total += 1;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      if (r > 95 && g > 40 && b > 20 && r > g && r > b && max - min > 15 && Math.abs(r - g) > 15) {
        skin += 1;
      }
    }
  }
  return total ? skin / total : 0;
}

/** Lightweight fallback when browser FaceDetector is unavailable */
function detectFaceFallback(video: HTMLVideoElement, canvas: HTMLCanvasElement): FaceBox | null {
  const w = 160;
  const h = Math.round((video.videoHeight / Math.max(video.videoWidth, 1)) * w) || 120;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx || !video.videoWidth) return null;
  ctx.drawImage(video, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);

  let best: FaceBox | null = null;
  let bestScore = 0.18;

  const boxW = Math.round(w * 0.42);
  const boxH = Math.round(h * 0.48);
  for (let y = Math.round(h * 0.08); y < h - boxH; y += 6) {
    for (let x = Math.round(w * 0.12); x < w - boxW; x += 6) {
      const score = scoreSkinRegion(data, w, h, x, y, x + boxW, y + boxH);
      if (score > bestScore) {
        bestScore = score;
        best = {
          x: x / w,
          y: y / h,
          width: boxW / w,
          height: boxH / h,
        };
      }
    }
  }
  return best;
}

export function useFaceDetection(videoRef: RefObject<HTMLVideoElement | null>, active: boolean) {
  const [face, setFace] = useState<FaceBox | null>(null);
  const [stableCount, setStableCount] = useState(0);
  const [engine, setEngine] = useState<'native' | 'fallback' | 'none'>('none');
  const detectorRef = useRef<FaceDetectorLike | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastBox = useRef<FaceBox | null>(null);

  useEffect(() => {
    if (!active) return undefined;

    if (typeof window !== 'undefined' && window.FaceDetector) {
      try {
        detectorRef.current = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
        setEngine('native');
      } catch {
        detectorRef.current = null;
        setEngine('fallback');
      }
    } else {
      setEngine('fallback');
    }

    canvasRef.current = document.createElement('canvas');
    let cancelled = false;
    let raf = 0;

    const tick = async () => {
      if (cancelled) return;
      const video = videoRef.current;
      if (video && video.readyState >= 2 && video.videoWidth > 0) {
        let next: FaceBox | null = null;
        try {
          if (detectorRef.current) {
            const faces = await detectorRef.current.detect(video);
            if (faces[0]) {
              const b = faces[0].boundingBox;
              next = {
                x: b.x / video.videoWidth,
                y: b.y / video.videoHeight,
                width: b.width / video.videoWidth,
                height: b.height / video.videoHeight,
              };
            }
          } else if (canvasRef.current) {
            next = detectFaceFallback(video, canvasRef.current);
          }
        } catch {
          if (canvasRef.current) next = detectFaceFallback(video, canvasRef.current);
        }

        if (next) {
          const prev = lastBox.current;
          const moved =
            !prev ||
            Math.abs(prev.x - next.x) > 0.04 ||
            Math.abs(prev.y - next.y) > 0.04 ||
            Math.abs(prev.width - next.width) > 0.05;
          lastBox.current = next;
          setFace(next);
          setStableCount((c) => (moved ? 1 : c + 1));
        } else {
          lastBox.current = null;
          setFace(null);
          setStableCount(0);
        }
      }
      raf = window.setTimeout(tick, 180) as unknown as number;
    };

    tick();
    return () => {
      cancelled = true;
      window.clearTimeout(raf);
    };
  }, [active, videoRef]);

  const isStable = !!face && stableCount >= 6; // ~1.1s of stable detection

  return { face, isStable, engine, stableCount };
}
