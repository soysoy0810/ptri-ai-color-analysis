import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { AccessoryItem } from '../../data/catalog';
import { compositeAccessoriesOnImage } from '../lib/accessoryCompositor';
import type { FaceLandmark, FaceRegion } from '../lib/types';

interface AccessoryOverlayProps {
  baseImage: string | null;
  accessories: AccessoryItem[];
  faceLandmarks: FaceLandmark[] | null;
  faceBox: FaceRegion | null;
  alt: string;
  className?: string;
}

/**
 * Layers landmark-placed accessories on top of a base photo (try-on result,
 * capture, etc.). Runs on-device — no extra API call.
 */
export function AccessoryOverlay({
  baseImage,
  accessories,
  faceLandmarks,
  faceBox,
  alt,
  className = '',
}: AccessoryOverlayProps) {
  const [composed, setComposed] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!baseImage || !accessories.length) {
      setComposed(baseImage);
      return undefined;
    }

    compositeAccessoriesOnImage(
      baseImage,
      accessories,
      faceLandmarks as FaceLandmark[] | null,
      faceBox,
    )
      .then((url) => {
        if (!cancelled) setComposed(url);
      })
      .catch(() => {
        if (!cancelled) setComposed(baseImage);
      });

    return () => {
      cancelled = true;
    };
  }, [baseImage, accessories, faceLandmarks, faceBox]);

  if (!composed) {
    return (
      <div className={`grid place-items-center bg-slate-200 ${className}`}>
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <motion.img
      src={composed}
      alt={alt}
      className={`h-full w-full object-contain ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      draggable={false}
    />
  );
}
