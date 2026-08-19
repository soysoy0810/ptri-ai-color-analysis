import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RotateCcw, Sparkles } from 'lucide-react';
import type { AccessoryItem } from '../../data/catalog';
import { api, type TryOnResponse } from '../api/client';
import { preparePersonForTryOn } from '../lib/tryOnBody';
import { finishGeneratedTryOn } from '../lib/tryOnFinish';
import type { PortraitLighting } from '../lib/types';

export interface TryOnStageStatus {
  garment: 'succeeded' | 'failed' | 'skipped';
  textile: 'applied' | 'skipped';
  color: 'applied' | 'skipped';
  background: 'composited' | 'failed' | 'skipped';
  lighting: 'graded' | 'skipped';
  accessories: 'fitted' | 'skipped';
  model: string;
  summary: string;
}

interface VirtualTryOnProps {
  captureDataUrl: string | null;
  garmentUrl: string | null;
  garmentName: string;
  category?: 'upper_body' | 'lower_body' | 'dresses';
  fabricHex?: string;
  textileName?: string;
  textileUrl?: string | null;
  accessoryItems?: AccessoryItem[];
  backgroundId?: string;
  lighting?: PortraitLighting;
  className?: string;
  onGenerated?: (imageDataUrl: string, status: TryOnStageStatus) => void;
  onFailed?: () => void;
}

type Status = 'idle' | 'generating' | 'finishing' | 'done' | 'error';

function dataUrlToObjectUrl(dataUrl: string): string {
  const comma = dataUrl.indexOf(',');
  const header = comma >= 0 ? dataUrl.slice(0, comma) : 'data:image/jpeg;base64';
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const mime = /data:([^;]+)/.exec(header)?.[1] || 'image/jpeg';
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: mime }));
}

async function urlToDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load the selected garment (${res.status}).`);
  const blob = await res.blob();
  if (!blob.type.startsWith('image/')) throw new Error('The selected garment file is not an image.');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function stageSummary(parts: TryOnStageStatus): string {
  const rows = [
    `Garment transfer: ${parts.garment} (${parts.model})`,
    `Textile: ${parts.textile}`,
    `Color: ${parts.color}`,
    `Background: ${parts.background}`,
    `Lighting: ${parts.lighting}`,
    `Accessories: ${parts.accessories}`,
  ];
  return rows.join(' · ');
}

function generationKey(parts: {
  person: string;
  garmentUrl: string;
  category: string;
  fabricHex?: string;
  textile: string;
}): string {
  return [parts.person.slice(-80), parts.garmentUrl, parts.category, parts.fabricHex || '', parts.textile].join('|');
}

export function VirtualTryOn({
  captureDataUrl,
  garmentUrl,
  garmentName,
  category = 'upper_body',
  fabricHex,
  textileName,
  textileUrl = null,
  accessoryItems = [],
  backgroundId = 'studio',
  lighting = 'neutral',
  className = '',
  onGenerated,
  onFailed,
}: VirtualTryOnProps) {
  const [status, setStatus] = useState<Status>('idle');
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [diagnostic, setDiagnostic] = useState('');
  const [stageLine, setStageLine] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [engineName, setEngineName] = useState('VTON');
  const [compositeBg, setCompositeBg] = useState(true);
  const lastGenKey = useRef('');
  const lastFinishKey = useRef('');
  const inFlightRef = useRef(false);
  const objectUrlRef = useRef<string | null>(null);
  const accessoryIds = accessoryItems.map((item) => item.id);
  const accessoryKey = accessoryIds.join(',');
  const setDisplayImage = useCallback((dataUrl: string | null) => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    if (!dataUrl) {
      setImage(null);
      return;
    }
    const url = dataUrlToObjectUrl(dataUrl);
    objectUrlRef.current = url;
    setImage(url);
  }, []);

  const generate = useCallback(async () => {
    if (!garmentUrl) return;
    if (!captureDataUrl) {
      setStatus('error');
      setError('No session photo is stored. Please start from the welcome screen.');
      setRawImage(null);
      setDisplayImage(null);
      onFailed?.();
      return;
    }

    const genKey = generationKey({
      person: captureDataUrl,
      garmentUrl,
      category,
      fabricHex,
      textile: textileUrl || textileName || '',
    });
    if (inFlightRef.current && lastGenKey.current === genKey) return;
    lastGenKey.current = genKey;
    lastFinishKey.current = '';
    inFlightRef.current = true;

    setStatus('generating');
    setError('');
    setDiagnostic('');
    setStageLine('');
    setElapsed(0);
    setRawImage(null);
    setDisplayImage(null);
    onFailed?.();
    const started = Date.now();
    const ticker = window.setInterval(() => setElapsed(Math.round((Date.now() - started) / 1000)), 1000);

    try {
      const [personImage, garmentDataUrl, textileImage] = await Promise.all([
        preparePersonForTryOn(captureDataUrl),
        urlToDataUrl(garmentUrl),
        textileUrl ? urlToDataUrl(textileUrl).catch(() => undefined) : Promise.resolve(undefined),
      ]);
      console.info('[tryon] accessories:', accessoryIds);
      const res: TryOnResponse = await api.tryon({
        personImage,
        garmentImage: garmentDataUrl,
        category,
        description: garmentName,
        fabricHex,
        textileName,
        textileImage,
        accessories: accessoryIds,
        backgroundId,
        lighting,
      });
      if (!res.ok || !res.image) {
        throw new Error(res.message || 'AI Try-On could not generate this look.');
      }
      if (res.image === captureDataUrl || res.image === personImage) {
        throw new Error('AI Try-On could not generate this look. The service returned the original photo.');
      }
      setEngineName(String(res.diagnostics?.model || res.provider || 'VTON'));
      setCompositeBg(res.provider === 'local' || res.diagnostics?.composited === true);
      setDiagnostic(
        [
          `provider=${res.provider || 'unknown'}`,
          `status=${res.status}`,
          res.diagnostics?.model ? `model=${res.diagnostics.model}` : '',
        ]
          .filter(Boolean)
          .join(' · '),
      );
      setRawImage(res.image);
      setStatus('finishing');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI Try-On could not generate this look.');
      setStatus('error');
      onFailed?.();
    } finally {
      inFlightRef.current = false;
      window.clearInterval(ticker);
    }
  }, [
    accessoryIds,
    backgroundId,
    captureDataUrl,
    category,
    fabricHex,
    garmentName,
    garmentUrl,
    lighting,
    onFailed,
    setDisplayImage,
    textileName,
    textileUrl,
  ]);

  useEffect(() => {
    if (!garmentUrl) return;
    if (!captureDataUrl) {
      lastGenKey.current = '';
      setStatus('error');
      setError('No session photo is stored. Please start from the welcome screen.');
      setRawImage(null);
      setDisplayImage(null);
      onFailed?.();
      return;
    }
    const genKey = generationKey({
      person: captureDataUrl,
      garmentUrl,
      category,
      fabricHex,
      textile: textileUrl || textileName || '',
    });
    if (genKey === lastGenKey.current && status !== 'idle' && status !== 'error') return;
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captureDataUrl, garmentUrl, category, fabricHex, textileUrl, textileName]);

  useEffect(() => {
    if (!rawImage) return;
    const finishKey = `${rawImage.slice(-40)}|${backgroundId}|${lighting}|${accessoryKey}`;
    if (finishKey === lastFinishKey.current) return;
    lastFinishKey.current = finishKey;
    let cancelled = false;
    setStatus((prev) => (prev === 'error' ? prev : 'finishing'));
    finishGeneratedTryOn({
      generatedDataUrl: rawImage,
      backgroundId,
      lighting,
      compositeBackground: compositeBg,
    })
      .then((finished) => {
        if (cancelled) return;
        const stages: TryOnStageStatus = {
          garment: 'succeeded',
          textile: textileName || textileUrl ? 'applied' : 'skipped',
          color: fabricHex ? 'applied' : 'skipped',
          background: finished.background,
          lighting: finished.lighting,
          accessories: finished.accessories,
          model: engineName,
          summary: '',
        };
        stages.summary = stageSummary(stages);
        setDisplayImage(finished.dataUrl);
        setStageLine(stages.summary);
        setStatus('done');
        onGenerated?.(finished.dataUrl, stages);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : 'AI Try-On could not generate this look. Finishing failed.',
        );
        setDisplayImage(null);
        setStatus('error');
        onFailed?.();
      });
    return () => {
      cancelled = true;
    };
  }, [accessoryItems, accessoryKey, backgroundId, compositeBg, engineName, fabricHex, lighting, onFailed, onGenerated, rawImage, setDisplayImage, textileName, textileUrl]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  return (
    <div className={`relative overflow-hidden bg-slate-900 ${className}`}>
      {status === 'done' && image ? (
        <>
          <motion.img
            src={image}
            alt={`You wearing ${garmentName}`}
            className="h-full w-full object-contain"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            draggable={false}
          />
          {stageLine ? (
            <p className="absolute inset-x-0 bottom-0 bg-navy/80 px-3 py-1.5 text-[9px] font-semibold leading-snug text-white/90">
              {stageLine}
            </p>
          ) : null}
        </>
      ) : status === 'generating' || status === 'finishing' ? (
        <div className="grid h-full place-items-center px-6 text-center">
          <div className="flex flex-col items-center gap-3 text-white">
            <div className="relative h-16 w-16">
              <motion.div
                className="absolute inset-0 rounded-full border-4 border-sky-300/25 border-t-sky-300"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
              <div className="absolute inset-3 grid place-items-center rounded-full bg-gradient-to-br from-accent to-navy">
                <Sparkles className="h-5 w-5" />
              </div>
            </div>
            <p className="text-sm font-bold">
              {status === 'finishing' ? 'Finishing your look…' : 'Generating your try-on…'}
            </p>
            <p className="text-[11px] text-white/70">
              {status === 'finishing'
                ? 'Keeping your face on the generated clothing.'
                : `Transferring the ${garmentName} onto your face scan from this session.`}
            </p>
            {status === 'generating' ? (
              <p className="text-[11px] font-semibold text-sky-300">{elapsed}s</p>
            ) : null}
          </div>
        </div>
      ) : status === 'error' ? (
        <div className="grid h-full place-items-center px-6 text-center">
          <div className="flex flex-col items-center gap-3 text-white">
            <AlertTriangle className="h-9 w-9 text-amber-300" />
            <p className="text-[11px] font-extrabold uppercase tracking-wide text-amber-300">
              AI Try-On could not be generated.
            </p>
            <p className="max-w-[300px] text-[11px] font-medium text-white/80">{error}</p>
            {diagnostic ? (
              <p className="max-w-[300px] font-mono text-[9px] text-white/45">Technical detail: {diagnostic}</p>
            ) : null}
            <button
              type="button"
              onClick={generate}
              className="mt-1 flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-navy"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Retry
            </button>
          </div>
        </div>
      ) : (
        <div className="grid h-full place-items-center px-6 text-center">
          <p className="text-[11px] font-semibold text-white/70">Select a garment to generate your try-on.</p>
        </div>
      )}
    </div>
  );
}
