import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Normalized (0..1) landmark point */
export type NormPoint = [number, number];

const MODEL_URL = `${import.meta.env.BASE_URL}mediapipe/face_landmarker.task`;
const WASM_URL = `${import.meta.env.BASE_URL}mediapipe/wasm`;

/** Consecutive detections with a still box before the scan may fire. */
const STABLE_FRAMES = 12;

// Self-hosted (no CDN dependency at runtime — this is a public kiosk).
let landmarkerPromise: Promise<FaceLandmarker> | null = null;

function createLandmarker(fileset: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>, delegate: 'GPU' | 'CPU') {
  return FaceLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate },
    runningMode: 'VIDEO',
    numFaces: 1,
  });
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('landmarker timeout')), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        window.clearTimeout(timer);
        reject(err);
      },
    );
  });
}

function getLandmarker(): Promise<FaceLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = FilesetResolver.forVisionTasks(WASM_URL).then(async (fileset) => {
      try {
        return await withTimeout(createLandmarker(fileset, 'GPU'), 4000);
      } catch {
        return createLandmarker(fileset, 'CPU');
      }
    });
  }
  return landmarkerPromise;
}

/** Warm the WASM model during welcome/profile so the camera step is ready. */
export function preloadFaceLandmarker(): void {
  void getLandmarker();
}

let imageLandmarkerPromise: Promise<FaceLandmarker> | null = null;

function getImageLandmarker(): Promise<FaceLandmarker> {
  if (!imageLandmarkerPromise) {
    imageLandmarkerPromise = FilesetResolver.forVisionTasks(WASM_URL).then(async (fileset) => {
      const opts = (delegate: 'GPU' | 'CPU') =>
        FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate },
          runningMode: 'IMAGE',
          numFaces: 1,
        });
      try {
        return await withTimeout(opts('GPU'), 4000);
      } catch {
        return opts('CPU');
      }
    });
  }
  return imageLandmarkerPromise;
}

/** Landmarks on a still (the VTON output), not the original webcam frame. */
export async function detectFaceOnDataUrl(dataUrl: string): Promise<{
  face: FaceBox | null;
  landmarks: NormPoint[] | null;
}> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.crossOrigin = 'anonymous';
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Could not read the generated portrait.'));
    el.src = dataUrl;
  });
  const lm = await getImageLandmarker();
  const result = lm.detect(img);
  const pts = result.faceLandmarks?.[0];
  if (!pts?.length) return { face: null, landmarks: null };
  return {
    face: boxFromLandmarks(pts),
    landmarks: pts.map((p) => [p.x, p.y] as NormPoint),
  };
}

function boxFromLandmarks(points: Array<{ x: number; y: number }>): FaceBox {
  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Real face landmark detection (MediaPipe FaceLandmarker, 478 points) —
 * replaces the old browser-Shape-Detection-API / RGB-skin-heuristic
 * fallback, which was too crude to reliably locate a face or drive an
 * accurate skin sample.
 */
export function useFaceLandmarker(videoRef: RefObject<HTMLVideoElement | null>, active: boolean) {
  const [face, setFace] = useState<FaceBox | null>(null);
  const [landmarks, setLandmarks] = useState<NormPoint[] | null>(null);
  const [isStable, setIsStable] = useState(false);
  const [ready, setReady] = useState(false);
  const lastBox = useRef<FaceBox | null>(null);
  const lastVideoTime = useRef(-1);
  const lastDotsUpdate = useRef(0);
  const lastFacePublish = useRef(0);
  const stableCount = useRef(0);
  const isStableRef = useRef(false);
  const hasFaceRef = useRef(false);
  /** Updated every detected frame (unthrottled) so a capture always uses the freshest points */
  const latestLandmarks = useRef<NormPoint[] | null>(null);

  useEffect(() => {
    if (!active) return undefined;
    let cancelled = false;
    let raf = 0;
    let landmarker: FaceLandmarker | null = null;

    getLandmarker()
      .then((lm) => {
        if (cancelled) return;
        landmarker = lm;
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(false);
      });

    const tick = () => {
      if (cancelled) return;
      const video = videoRef.current;
      if (
        landmarker &&
        video &&
        video.readyState >= 2 &&
        video.videoWidth > 0 &&
        video.currentTime !== lastVideoTime.current
      ) {
        lastVideoTime.current = video.currentTime;
        try {
          const result = landmarker.detectForVideo(video, performance.now());
          const pts = result.faceLandmarks?.[0];
          if (pts && pts.length) {
            const next = boxFromLandmarks(pts);
            const prev = lastBox.current;
            const moved =
              !prev ||
              Math.abs(prev.x - next.x) > 0.028 ||
              Math.abs(prev.y - next.y) > 0.028 ||
              Math.abs(prev.width - next.width) > 0.032;
            lastBox.current = next;
            stableCount.current = moved ? 1 : stableCount.current + 1;
            const nextStable = stableCount.current >= STABLE_FRAMES;
            if (nextStable !== isStableRef.current) {
              isStableRef.current = nextStable;
              setIsStable(nextStable);
            }
            const points = pts.map((p) => [p.x, p.y] as NormPoint);
            latestLandmarks.current = points;
            const now = performance.now();
            // Overlay + React state at ~12fps — detection itself stays full-rate.
            if (now - lastFacePublish.current > 80) {
              lastFacePublish.current = now;
              hasFaceRef.current = true;
              setFace(next);
            }
            if (now - lastDotsUpdate.current > 120) {
              lastDotsUpdate.current = now;
              setLandmarks(points);
            }
          } else if (hasFaceRef.current) {
            lastBox.current = null;
            latestLandmarks.current = null;
            stableCount.current = 0;
            hasFaceRef.current = false;
            isStableRef.current = false;
            setFace(null);
            setLandmarks(null);
            setIsStable(false);
          }
        } catch {
          // transient detection hiccup — keep prior state, try again next frame
        }
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [active, videoRef]);

  const getLatestLandmarks = useCallback(() => latestLandmarks.current, []);

  return {
    face,
    landmarks,
    isStable,
    ready,
    getLatestLandmarks,
  };
}
