import { useCallback, useEffect, useRef, useState } from 'react';

export function useCamera(active = true, video?: MediaTrackConstraints) {
  const videoRef = useRef<HTMLVideoElement>(null!);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!active) return undefined;
    let cancelled = false;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: video || {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setReady(true);
        }
      } catch {
        setError('Camera access is required. Please allow the camera and try again.');
      }
    }

    start();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setReady(false);
    };
  }, [active, video]);

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video) return null;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 960;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return {
      canvas,
      dataUrl: canvas.toDataURL('image/jpeg', 0.9),
    };
  }, []);

  /** Same crop the visitor sees (object-cover in a 4:5 frame). */
  const captureCoverFrame = useCallback((aspect = 4 / 5, maxWidth?: number) => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const videoAspect = vw / vh;
    let sx = 0;
    let sy = 0;
    let sw = vw;
    let sh = vh;
    if (videoAspect > aspect) {
      sw = Math.round(vh * aspect);
      sx = Math.round((vw - sw) / 2);
    } else {
      sh = Math.round(vw / aspect);
      sy = Math.round((vh - sh) / 2);
    }
    let dw = sw;
    let dh = sh;
    if (maxWidth && sw > maxWidth) {
      const scale = maxWidth / sw;
      dw = maxWidth;
      dh = Math.round(sh * scale);
    }
    const canvas = document.createElement('canvas');
    canvas.width = dw;
    canvas.height = dh;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, dw, dh);
    return {
      canvas,
      dataUrl: canvas.toDataURL('image/jpeg', maxWidth ? 0.82 : 0.9),
      crop: { sx, sy, sw, sh, vw, vh },
    };
  }, []);

  return { videoRef, ready, error, captureFrame, captureCoverFrame };
}
