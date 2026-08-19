import type { FaceBox, NormPoint } from '../hooks/useFaceLandmarker';

export type QualityIssue =
  | 'no_face'
  | 'too_far'
  | 'too_close'
  | 'off_center'
  | 'too_dark'
  | 'too_bright'
  | 'harsh_shadow'
  | 'eyes_closed'
  | 'blurry';

export interface CaptureQuality {
  ok: boolean;
  issues: QualityIssue[];
  /** Single most important thing to tell the visitor right now */
  guidance: string;
  metrics: {
    faceWidthFraction: number;
    centerOffset: number;
    faceLuma: number;
    clippedFraction: number;
    leftRightRatio: number;
    blurScore: number;
    eyeOpenness: number;
  };
}

/** Face portrait: close enough to read identity, not clipped, centered. */
const FACE = {
  minFaceWidth: 0.16,
  maxFaceWidth: 0.52,
  maxCenterOffset: 0.16,
};

const MIN_LUMA = 70;
const MAX_LUMA = 205;
const MAX_CLIPPED = 0.14;
const MAX_LR_RATIO = 1.75;
const MIN_EYE_OPEN = 0.11;
const MIN_BLUR_SCORE = 18;

const GUIDANCE: Record<QualityIssue, string> = {
  no_face: 'Please face the camera.',
  too_far: 'Please move a little closer so your face is clear.',
  too_close: 'Please move back a little so your whole face is in the frame.',
  off_center: 'Please look into the centre of the frame.',
  too_dark: 'Lighting is low — please move toward the light.',
  too_bright: 'Too bright — please step out of direct light.',
  harsh_shadow: 'One side of your face is shadowed — please face the light evenly.',
  eyes_closed: 'Please open your eyes and look at the camera.',
  blurry: 'Image is blurry — please hold still.',
};

const ORDER: QualityIssue[] = [
  'no_face',
  'too_far',
  'too_close',
  'off_center',
  'eyes_closed',
  'too_dark',
  'too_bright',
  'harsh_shadow',
  'blurry',
];

function regionStats(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x0f: number,
  y0f: number,
  x1f: number,
  y1f: number,
): { luma: number; clipped: number } {
  const x0 = Math.max(0, Math.floor(x0f * width));
  const x1 = Math.min(width, Math.ceil(x1f * width));
  const y0 = Math.max(0, Math.floor(y0f * height));
  const y1 = Math.min(height, Math.ceil(y1f * height));
  let sum = 0;
  let clipped = 0;
  let n = 0;
  for (let y = y0; y < y1; y += 3) {
    for (let x = x0; x < x1; x += 3) {
      const i = (y * width + x) * 4;
      const l = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      sum += l;
      if (data[i] > 249 && data[i + 1] > 249 && data[i + 2] > 249) clipped += 1;
      n += 1;
    }
  }
  return { luma: n ? sum / n : 0, clipped: n ? clipped / n : 0 };
}

function blurScore(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  face: FaceBox,
): number {
  const x0 = Math.max(1, Math.floor(face.x * width));
  const x1 = Math.min(width - 1, Math.ceil((face.x + face.width) * width));
  const y0 = Math.max(1, Math.floor(face.y * height));
  const y1 = Math.min(height - 1, Math.ceil((face.y + face.height) * height));
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let y = y0; y < y1; y += 2) {
    for (let x = x0; x < x1; x += 2) {
      const i = (y * width + x) * 4;
      const l = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      const right = (y * width + (x + 1)) * 4;
      const down = ((y + 1) * width + x) * 4;
      const lr = 0.2126 * data[right] + 0.7152 * data[right + 1] + 0.0722 * data[right + 2];
      const ld = 0.2126 * data[down] + 0.7152 * data[down + 1] + 0.0722 * data[down + 2];
      const hp = l * 2 - lr - ld;
      sum += hp;
      sumSq += hp * hp;
      n += 1;
    }
  }
  if (!n) return 0;
  const mean = sum / n;
  return sumSq / n - mean * mean;
}

function dist(a: NormPoint, b: NormPoint): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return Math.hypot(dx, dy);
}

function eyeOpenness(landmarks: NormPoint[] | null | undefined): number {
  if (!landmarks || landmarks.length < 387) return 1;
  const ratio = (upper: number, lower: number, left: number, right: number) => {
    const w = dist(landmarks[left], landmarks[right]);
    if (w < 0.004) return 0;
    return dist(landmarks[upper], landmarks[lower]) / w;
  };
  return Math.min(ratio(159, 145, 33, 133), ratio(386, 374, 362, 263));
}

/**
 * Face-scan assessment from live pixels and MediaPipe geometry.
 * Does not require waist, chest, legs or feet.
 */
export function assessCapture(
  face: FaceBox | null,
  frame: ImageData | null,
  landmarks?: NormPoint[] | null,
): CaptureQuality {
  const empty = {
    faceWidthFraction: 0,
    centerOffset: 0,
    faceLuma: 0,
    clippedFraction: 0,
    leftRightRatio: 1,
    blurScore: 0,
    eyeOpenness: 0,
  };

  if (!face) {
    return { ok: false, issues: ['no_face'], guidance: GUIDANCE.no_face, metrics: empty };
  }

  const issues: QualityIssue[] = [];
  const faceWidthFraction = face.width;
  const cx = face.x + face.width / 2;
  const cy = face.y + face.height / 2;
  const centerOffset = Math.hypot(cx - 0.5, cy - 0.42);

  if (faceWidthFraction < FACE.minFaceWidth) issues.push('too_far');
  else if (faceWidthFraction > FACE.maxFaceWidth || face.y < 0.02 || face.y + face.height > 0.98) {
    issues.push('too_close');
  }
  if (centerOffset > FACE.maxCenterOffset) issues.push('off_center');

  const eyes = eyeOpenness(landmarks);
  if (landmarks && landmarks.length >= 387 && eyes < MIN_EYE_OPEN) issues.push('eyes_closed');

  let faceLuma = 0;
  let clippedFraction = 0;
  let leftRightRatio = 1;
  let blur = 0;

  if (frame) {
    const { data, width, height } = frame;
    const stats = regionStats(
      data,
      width,
      height,
      face.x,
      face.y,
      face.x + face.width,
      face.y + face.height,
    );
    faceLuma = stats.luma;
    clippedFraction = stats.clipped;
    blur = blurScore(data, width, height, face);

    const left = regionStats(
      data,
      width,
      height,
      face.x,
      face.y + face.height * 0.3,
      face.x + face.width * 0.35,
      face.y + face.height * 0.75,
    );
    const right = regionStats(
      data,
      width,
      height,
      face.x + face.width * 0.65,
      face.y + face.height * 0.3,
      face.x + face.width,
      face.y + face.height * 0.75,
    );
    const hi = Math.max(left.luma, right.luma);
    const lo = Math.max(1, Math.min(left.luma, right.luma));
    leftRightRatio = hi / lo;

    if (faceLuma < MIN_LUMA) issues.push('too_dark');
    else if (faceLuma > MAX_LUMA || clippedFraction > MAX_CLIPPED) issues.push('too_bright');
    if (leftRightRatio > MAX_LR_RATIO) issues.push('harsh_shadow');
    if (blur < MIN_BLUR_SCORE) issues.push('blurry');
  }

  const primary = ORDER.find((i) => issues.includes(i));
  return {
    ok: issues.length === 0,
    issues,
    guidance: primary ? GUIDANCE[primary] : 'Hold still — capturing…',
    metrics: {
      faceWidthFraction,
      centerOffset,
      faceLuma,
      clippedFraction,
      leftRightRatio,
      blurScore: blur,
      eyeOpenness: eyes,
    },
  };
}
