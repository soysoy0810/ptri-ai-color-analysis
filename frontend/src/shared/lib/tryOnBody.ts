import type { FaceLandmark, FaceRegion } from './types';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read the capture.'));
    img.src = src;
  });
}

export function remapFaceToCoverCrop(
  box: FaceRegion | null,
  videoW: number,
  videoH: number,
  aspect = 4 / 5,
): FaceRegion | null {
  if (!box || !videoW || !videoH) return box;
  const videoAspect = videoW / videoH;
  if (videoAspect > aspect) {
    const visible = aspect / videoAspect;
    const offset = (1 - visible) / 2;
    return {
      x: (box.x - offset) / visible,
      y: box.y,
      width: box.width / visible,
      height: box.height,
    };
  }
  const visible = videoAspect / aspect;
  const offset = (1 - visible) / 2;
  return {
    x: box.x,
    y: (box.y - offset) / visible,
    width: box.width,
    height: box.height / visible,
  };
}

export function remapLandmarksToCoverCrop(
  landmarks: FaceLandmark[] | null,
  videoW: number,
  videoH: number,
  aspect = 4 / 5,
): FaceLandmark[] | null {
  if (!landmarks?.length || !videoW || !videoH) return landmarks;
  const videoAspect = videoW / videoH;
  if (videoAspect > aspect) {
    const visible = aspect / videoAspect;
    const offset = (1 - visible) / 2;
    return landmarks.map(([x, y]) => [(x - offset) / visible, y]);
  }
  const visible = videoAspect / aspect;
  const offset = (1 - visible) / 2;
  return landmarks.map(([x, y]) => [x, (y - offset) / visible]);
}

/** Fit the session face capture into IDM-VTON's 3:4 frame. Never letterbox with beige. */
export async function preparePersonForTryOn(dataUrl: string): Promise<string> {
  const img = await loadImage(dataUrl);
  const srcW = img.naturalWidth;
  const srcH = img.naturalHeight;
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;
  const scale = Math.max(768 / srcW, 1024 / srcH);
  const w = Math.round(srcW * scale);
  const h = Math.round(srcH * scale);
  const x = Math.round((768 - w) / 2);
  const y = Math.round((1024 - h) / 2);
  ctx.drawImage(img, x, y, w, h);
  return canvas.toDataURL('image/jpeg', 0.92);
}
