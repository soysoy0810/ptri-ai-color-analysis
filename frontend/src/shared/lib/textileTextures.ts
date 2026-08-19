import { TEXTILE_SRC, type TextileId } from '../../data/textiles';

const cache = new Map<string, HTMLImageElement>();
let allReady: Promise<void> | null = null;

function loadImage(src: string): Promise<HTMLImageElement> {
  const hit = cache.get(src);
  if (hit) return Promise.resolve(hit);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      cache.set(src, img);
      resolve(img);
    };
    img.onerror = reject;
    img.src = src;
  });
}

/** Load every textile photo once so compositing can paint real cloth. */
export function preloadTextileTextures(): Promise<void> {
  if (!allReady) {
    allReady = Promise.all(
      Object.values(TEXTILE_SRC).map((src) => loadImage(src).catch(() => null)),
    ).then(() => undefined);
  }
  return allReady;
}

export function getTextileImage(id: TextileId | undefined | null): HTMLImageElement | null {
  if (!id) return null;
  const src = TEXTILE_SRC[id];
  return src ? cache.get(src) ?? null : null;
}

export function getCachedImage(src: string | undefined | null): HTMLImageElement | null {
  if (!src) return null;
  return cache.get(src) ?? null;
}

export function preloadImages(srcs: Array<string | undefined | null>): Promise<void> {
  return Promise.all(srcs.filter((s): s is string => Boolean(s)).map((src) => loadImage(src).catch(() => null))).then(
    () => undefined,
  );
}
