import type { AccessoryItem } from '../../data/catalog';
import type { NormPoint } from '../hooks/useFaceLandmarker';
import { getTextileImage, preloadImages, preloadTextileTextures } from './textileTextures';
import type { FaceRegion } from './types';

export function preloadAccessoryPhotos(items: AccessoryItem[]): Promise<void> {
  return preloadImages(items.map((item) => item.photoSrc).filter((src): src is string => Boolean(src)));
}

/** MediaPipe Face Mesh indices used for accessory placement */
const LM = {
  nose: 1,
  chin: 152,
  forehead: 10,
  leftEar: 234,
  rightEar: 454,
  leftEyeOuter: 263,
  rightEyeOuter: 33,
  leftTemple: 127,
  rightTemple: 356,
  neckBase: 152,
} as const;

export interface AccessoryLayout {
  width: number;
  height: number;
  landmarks: NormPoint[] | null;
  faceBox: FaceRegion | null;
  /** Normalized 0..1 bounds of the segmented person */
  personBounds?: { top: number; bottom: number; left: number; right: number } | null;
  view?: 'half' | 'full';
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function lighten(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const mix = (c: number) => Math.min(255, Math.round(c + (255 - c) * amount));
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
}

function darken(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const mix = (c: number) => Math.max(0, Math.round(c * (1 - amount)));
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
}

function point(
  layout: AccessoryLayout,
  idx: number,
  fallbackX: number,
  fallbackY: number,
): { x: number; y: number } {
  const lm = layout.landmarks?.[idx];
  if (lm) return { x: lm[0] * layout.width, y: lm[1] * layout.height };
  if (layout.faceBox) {
    const fb = layout.faceBox;
    return {
      x: (fb.x + fb.width * fallbackX) * layout.width,
      y: (fb.y + fb.height * fallbackY) * layout.height,
    };
  }
  const pb = layout.personBounds;
  if (pb) {
    return {
      x: (pb.left + (pb.right - pb.left) * fallbackX) * layout.width,
      y: (pb.top + (pb.bottom - pb.top) * fallbackY) * layout.height,
    };
  }
  return { x: layout.width * fallbackX, y: layout.height * fallbackY };
}

function personBox(layout: AccessoryLayout) {
  if (layout.personBounds) {
    const pb = layout.personBounds;
    return {
      left: pb.left * layout.width,
      top: pb.top * layout.height,
      right: pb.right * layout.width,
      bottom: pb.bottom * layout.height,
      width: (pb.right - pb.left) * layout.width,
      height: (pb.bottom - pb.top) * layout.height,
    };
  }
  if (layout.faceBox) {
    const fb = layout.faceBox;
    const cx = (fb.x + fb.width / 2) * layout.width;
    const top = fb.y * layout.height;
    const w = fb.width * layout.width * 2.2;
    return {
      left: cx - w / 2,
      top,
      right: cx + w / 2,
      bottom: top + fb.height * layout.height * 3.2,
      width: w,
      height: fb.height * layout.height * 3.2,
    };
  }
  return {
    left: layout.width * 0.2,
    top: layout.height * 0.05,
    right: layout.width * 0.8,
    bottom: layout.height * 0.95,
    width: layout.width * 0.6,
    height: layout.height * 0.9,
  };
}

function fillTextilePattern(
  ctx: CanvasRenderingContext2D,
  item: AccessoryItem,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const tex = getTextileImage(item.textureId);
  if (tex) {
    ctx.drawImage(tex, x, y, Math.max(w, 1), Math.max(h, 1));
    ctx.restore();
    return;
  }
  ctx.fillStyle = item.hex;
  ctx.fillRect(x, y, w, h);

  const accent = item.accentHex || darken(item.hex, 0.25);
  if (item.pattern === 'stripe') {
    ctx.strokeStyle = accent;
    ctx.lineWidth = Math.max(2, w * 0.04);
    for (let i = -h; i < w + h; i += ctx.lineWidth * 2.2) {
      ctx.beginPath();
      ctx.moveTo(x + i, y);
      ctx.lineTo(x + i - h * 0.4, y + h);
      ctx.stroke();
    }
  } else if (item.pattern === 'weave') {
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1;
    const step = Math.max(3, w * 0.06);
    for (let row = y; row < y + h; row += step) {
      for (let col = x; col < x + w; col += step) {
        ctx.strokeRect(col, row, step * 0.85, step * 0.85);
      }
    }
  } else if (item.pattern === 'print') {
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = accent;
    const r = Math.max(3, w * 0.04);
    for (let row = y + r; row < y + h; row += r * 3.5) {
      for (let col = x + r; col < x + w; col += r * 3.5) {
        ctx.beginPath();
        ctx.arc(col, row, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.restore();
}

function paintCloth(
  ctx: CanvasRenderingContext2D,
  item: AccessoryItem,
  path: () => void,
  bounds: { x: number; y: number; w: number; h: number },
  sheenAngle = 0.35,
) {
  ctx.save();
  ctx.beginPath();
  path();
  ctx.closePath();
  ctx.shadowColor = 'rgba(18,12,8,0.32)';
  ctx.shadowBlur = Math.max(8, bounds.w * 0.08);
  ctx.shadowOffsetY = Math.max(3, bounds.h * 0.04);
  ctx.fillStyle = item.hex;
  ctx.fill();
  ctx.clip();
  ctx.shadowColor = 'transparent';
  const tex = getTextileImage(item.textureId);
  if (tex) {
    ctx.globalAlpha = 0.92;
    ctx.drawImage(tex, bounds.x, bounds.y, Math.max(bounds.w, 1), Math.max(bounds.h, 1));
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = item.hex;
    ctx.globalAlpha = 0.28;
    ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  } else {
    fillTextilePattern(ctx, item, bounds.x, bounds.y, bounds.w, bounds.h);
  }
  const sheen = ctx.createLinearGradient(
    bounds.x,
    bounds.y,
    bounds.x + bounds.w * Math.cos(sheenAngle),
    bounds.y + bounds.h,
  );
  sheen.addColorStop(0, 'rgba(255,255,255,0.16)');
  sheen.addColorStop(0.22, 'rgba(255,255,255,0)');
  sheen.addColorStop(0.58, 'rgba(0,0,0,0.16)');
  sheen.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = sheen;
  ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);
  ctx.restore();
}

/** Draped textile around the neck — folds and cloth, not a flat sticker. */
function drawScarf(ctx: CanvasRenderingContext2D, layout: AccessoryLayout, item: AccessoryItem) {
  const box = personBox(layout);
  const fw = Math.min(faceWidth(layout) * 1.15, box.width * 0.36);
  const chin = point(layout, LM.chin, 0.5, 0.96);
  const leftEar = point(layout, LM.leftEar, 0.05, 0.55);
  const rightEar = point(layout, LM.rightEar, 0.95, 0.55);
  const shawl = item.id.includes('silk') || item.name.toLowerCase().includes('shawl');
  const topY = chin.y + fw * 0.02;
  const neckL = { x: Math.min(leftEar.x, chin.x - fw * 0.48), y: topY + fw * 0.1 };
  const neckR = { x: Math.max(rightEar.x, chin.x + fw * 0.48), y: topY + fw * 0.1 };
  const mid = { x: chin.x, y: topY + fw * 0.28 };
  const drop = fw * (shawl ? 1.85 : 1.35);

  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = 'rgba(20,12,8,0.55)';
  ctx.beginPath();
  ctx.ellipse(chin.x, topY + fw * 0.42, fw * 0.42, fw * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  paintCloth(
    ctx,
    item,
    () => {
      ctx.moveTo(neckL.x - fw * 0.04, neckL.y);
      ctx.quadraticCurveTo(mid.x, mid.y - fw * 0.02, neckR.x + fw * 0.04, neckR.y);
      ctx.quadraticCurveTo(mid.x + fw * 0.06, mid.y + fw * 0.42, neckL.x, neckL.y + fw * 0.38);
    },
    { x: neckL.x - fw * 0.12, y: topY, w: neckR.x - neckL.x + fw * 0.24, h: fw * 0.62 },
    0.18,
  );

  paintCloth(
    ctx,
    item,
    () => {
      ctx.moveTo(neckL.x + fw * 0.02, neckL.y + fw * 0.08);
      ctx.quadraticCurveTo(neckL.x - fw * 0.28, topY + drop * 0.38, neckL.x - fw * 0.08, topY + drop * 0.92);
      ctx.quadraticCurveTo(neckL.x + fw * 0.16, topY + drop * 0.55, neckL.x + fw * 0.2, neckL.y + fw * 0.2);
    },
    { x: neckL.x - fw * 0.38, y: topY, w: fw * 0.62, h: drop },
    -0.35,
  );

  paintCloth(
    ctx,
    item,
    () => {
      ctx.moveTo(neckR.x - fw * 0.04, neckR.y + fw * 0.06);
      ctx.quadraticCurveTo(neckR.x + fw * 0.42, topY + drop * 0.2, neckR.x + fw * 0.16, topY + drop * 1.05);
      ctx.quadraticCurveTo(neckR.x - fw * 0.02, topY + drop * 0.58, neckR.x - fw * 0.2, neckR.y + fw * 0.18);
    },
    { x: neckR.x - fw * 0.28, y: topY, w: fw * 0.78, h: drop + fw * 0.12 },
    0.5,
  );

  if (shawl) {
    paintCloth(
      ctx,
      item,
      () => {
        ctx.moveTo(neckL.x - fw * 0.15, neckL.y + fw * 0.05);
        ctx.quadraticCurveTo(mid.x, neckL.y + fw * 0.55, neckR.x + fw * 0.15, neckR.y + fw * 0.05);
        ctx.quadraticCurveTo(neckR.x + fw * 0.55, neckR.y + fw * 1.15, box.right - box.width * 0.08, box.top + box.height * 0.42);
        ctx.quadraticCurveTo(mid.x, box.top + box.height * 0.38, box.left + box.width * 0.08, box.top + box.height * 0.42);
        ctx.quadraticCurveTo(neckL.x - fw * 0.55, neckL.y + fw * 1.15, neckL.x - fw * 0.15, neckL.y + fw * 0.05);
      },
      { x: box.left, y: topY, w: box.width, h: box.height * 0.42 },
      0.28,
    );
  }

  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = '#3a2a1c';
  ctx.beginPath();
  ctx.ellipse(mid.x, mid.y + fw * 0.08, fw * 0.34, fw * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function faceWidth(layout: AccessoryLayout): number {
  if (layout.faceBox) {
    const raw = layout.faceBox.width * layout.width;
    return Math.max(layout.width * 0.2, Math.min(raw * 1.2, layout.width * 0.38));
  }
  const box = personBox(layout);
  return Math.max(layout.width * 0.2, Math.min(box.width * 0.42, layout.width * 0.34));
}

function metalFill(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, hex: string) {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.08, x, y, r);
  g.addColorStop(0, lighten(hex, 0.55));
  g.addColorStop(0.35, lighten(hex, 0.12));
  g.addColorStop(0.72, hex);
  g.addColorStop(1, darken(hex, 0.28));
  ctx.fillStyle = g;
}

function drawPearl(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, hex: string) {
  ctx.save();
  ctx.shadowColor = 'rgba(30,20,12,0.28)';
  ctx.shadowBlur = r * 0.45;
  ctx.shadowOffsetY = r * 0.2;
  const g = ctx.createRadialGradient(x - r * 0.32, y - r * 0.38, r * 0.08, x, y, r);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.28, lighten(hex, 0.28));
  g.addColorStop(0.75, hex);
  g.addColorStop(1, darken(hex, 0.22));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHoop(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, hex: string) {
  ctx.save();
  ctx.shadowColor = 'rgba(20,14,8,0.32)';
  ctx.shadowBlur = r * 0.35;
  ctx.shadowOffsetY = r * 0.18;
  const outer = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
  outer.addColorStop(0, lighten(hex, 0.5));
  outer.addColorStop(0.4, hex);
  outer.addColorStop(1, darken(hex, 0.25));
  ctx.fillStyle = outer;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.arc(x, y, r * 0.72, 0, Math.PI * 2, true);
  ctx.fill('evenodd');
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = Math.max(1, r * 0.08);
  ctx.beginPath();
  ctx.arc(x - r * 0.08, y - r * 0.12, r * 0.82, 1.15 * Math.PI, 1.65 * Math.PI);
  ctx.stroke();
  ctx.restore();
}

function drawNecklace(ctx: CanvasRenderingContext2D, layout: AccessoryLayout, item: AccessoryItem) {
  const left = point(layout, LM.leftTemple, 0.18, 0.55);
  const right = point(layout, LM.rightTemple, 0.82, 0.55);
  const chin = point(layout, LM.chin, 0.5, 0.96);
  const fw = faceWidth(layout);
  const cx = (left.x + right.x) / 2;
  const cy = chin.y + fw * 0.18;
  const rx = Math.min(fw * 0.46, Math.abs(right.x - left.x) * 0.52);
  const ry = fw * 0.16;

  if (item.id.includes('pearl')) {
    for (let t = 0.1; t <= 0.9; t += 0.055) {
      const a = 0.16 * Math.PI + t * 0.68 * Math.PI;
      drawPearl(ctx, cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, Math.max(2.4, fw * 0.028), item.hex);
    }
    return;
  }

  if (item.id.includes('choker')) {
    paintCloth(
      ctx,
      item,
      () => {
        ctx.ellipse(cx, cy, rx * 0.92, ry * 0.72, 0, 0.12 * Math.PI, 0.88 * Math.PI);
        ctx.ellipse(cx, cy + fw * 0.06, rx * 0.86, ry * 0.5, 0, 0.88 * Math.PI, 0.12 * Math.PI, true);
      },
      { x: cx - rx, y: cy - ry, w: rx * 2, h: ry * 2 },
      0.2,
    );
    return;
  }

  for (let t = 0.1; t <= 0.9; t += 0.04) {
    const a = 0.16 * Math.PI + t * 0.68 * Math.PI;
    const x = cx + Math.cos(a) * rx;
    const y = cy + Math.sin(a) * ry;
    metalFill(ctx, x, y, Math.max(1.8, fw * 0.02), item.hex);
    ctx.beginPath();
    ctx.arc(x, y, Math.max(1.8, fw * 0.02), 0, Math.PI * 2);
    ctx.fill();
  }
  if (item.id.includes('pendant')) {
    metalFill(ctx, cx, cy + ry * 1.35, fw * 0.055, item.hex);
    ctx.beginPath();
    ctx.moveTo(cx, cy + ry * 0.7);
    ctx.lineTo(cx - fw * 0.045, cy + ry * 1.7);
    ctx.lineTo(cx + fw * 0.045, cy + ry * 1.7);
    ctx.closePath();
    ctx.fill();
  }
}

function earPoints(layout: AccessoryLayout) {
  if (layout.faceBox) {
    const fb = layout.faceBox;
    return {
      left: { x: fb.x * layout.width + 2, y: (fb.y + fb.height * 0.58) * layout.height },
      right: { x: (fb.x + fb.width) * layout.width - 2, y: (fb.y + fb.height * 0.58) * layout.height },
    };
  }
  return {
    left: point(layout, LM.leftEar, 0.02, 0.48),
    right: point(layout, LM.rightEar, 0.98, 0.48),
  };
}

function drawEarrings(ctx: CanvasRenderingContext2D, layout: AccessoryLayout, item: AccessoryItem) {
  const { left, right } = earPoints(layout);
  const fw = faceWidth(layout);
  const r = Math.max(14, fw * 0.12);

  [left, right].forEach((ear) => {
    if (item.id.includes('hoop')) {
      drawHoop(ctx, ear.x, ear.y + r * 1.15, r * 1.15, item.hex);
    } else if (item.id.includes('drop') || item.id.includes('pearl')) {
      drawPearl(ctx, ear.x, ear.y + r * 0.35, r * 0.38, item.hex);
      drawPearl(ctx, ear.x, ear.y + r * 1.85, r * 0.7, item.hex);
    } else {
      metalFill(ctx, ear.x, ear.y + r * 0.7, r * 0.55, item.hex);
      ctx.beginPath();
      ctx.arc(ear.x, ear.y + r * 0.7, r * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function drawHat(ctx: CanvasRenderingContext2D, layout: AccessoryLayout, item: AccessoryItem) {
  const fw = faceWidth(layout);
  const forehead = point(layout, LM.forehead, 0.5, 0.1);
  const leftT = layout.faceBox
    ? { x: layout.faceBox.x * layout.width, y: forehead.y + fw * 0.12 }
    : point(layout, LM.leftTemple, 0.02, 0.22);
  const rightT = layout.faceBox
    ? { x: (layout.faceBox.x + layout.faceBox.width) * layout.width, y: forehead.y + fw * 0.12 }
    : point(layout, LM.rightTemple, 0.98, 0.22);
  const cx = (leftT.x + rightT.x) / 2;
  const baseY = forehead.y - fw * 0.42;
  const crownW = Math.abs(rightT.x - leftT.x) * 1.08;
  const crownH = fw * 0.42;
  const brimW = crownW * 1.18;

  ctx.save();
  ctx.translate(cx, baseY);
  ctx.shadowColor = 'rgba(0,0,0,0.28)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;

  if (item.id.includes('straw')) {
    ctx.fillStyle = darken(item.hex, 0.08);
    ctx.beginPath();
    ctx.ellipse(0, fw * 0.04, brimW * 0.62, crownH * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = item.hex;
    ctx.beginPath();
    ctx.ellipse(0, -crownH * 0.28, crownW * 0.42, crownH * 0.42, 0, Math.PI, 0);
    ctx.ellipse(0, -crownH * 0.02, crownW * 0.42, crownH * 0.12, 0, 0, Math.PI);
    ctx.fill();
  } else if (item.id.includes('beret')) {
    ctx.fillStyle = item.hex;
    ctx.beginPath();
    ctx.ellipse(-crownW * 0.06, -crownH * 0.18, crownW * 0.52, crownH * 0.38, -0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = darken(item.hex, 0.18);
    ctx.beginPath();
    ctx.arc(crownW * 0.18, -crownH * 0.42, fw * 0.04, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Baseball cap: dome + visor sitting on the forehead
    const crown = ctx.createLinearGradient(-crownW / 2, -crownH, crownW / 2, 0);
    crown.addColorStop(0, lighten(item.hex, 0.12));
    crown.addColorStop(0.45, item.hex);
    crown.addColorStop(1, darken(item.hex, 0.18));
    ctx.fillStyle = crown;
    ctx.beginPath();
    ctx.moveTo(-crownW * 0.48, 0);
    ctx.quadraticCurveTo(-crownW * 0.46, -crownH * 0.95, 0, -crownH);
    ctx.quadraticCurveTo(crownW * 0.46, -crownH * 0.95, crownW * 0.48, 0);
    ctx.quadraticCurveTo(0, crownH * 0.12, -crownW * 0.48, 0);
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.fillStyle = darken(item.hex, 0.22);
    ctx.beginPath();
    ctx.ellipse(0, fw * 0.06, brimW * 0.42, crownH * 0.16, 0.08, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = darken(item.hex, 0.08);
    ctx.beginPath();
    ctx.ellipse(0, fw * 0.02, brimW * 0.4, crownH * 0.1, 0.08, Math.PI, 0);
    ctx.fill();

    ctx.fillStyle = lighten(item.hex, 0.2);
    ctx.beginPath();
    ctx.arc(0, -crownH * 0.92, fw * 0.035, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  // Soft shadow on the forehead under the brim
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  ctx.beginPath();
  ctx.ellipse(cx, baseY + fw * 0.06, brimW * 0.28, fw * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBag(ctx: CanvasRenderingContext2D, layout: AccessoryLayout, item: AccessoryItem) {
  const box = personBox(layout);
  const hip = {
    x: box.right - box.width * 0.08,
    y: box.top + box.height * 0.58,
  };
  const bw = box.width * 0.22;
  const bh = box.height * 0.18;

  ctx.save();
  ctx.translate(hip.x, hip.y);
  ctx.shadowColor = 'rgba(0,0,0,0.2)';
  ctx.shadowBlur = 8;

  if (item.id.includes('tote') || item.id.includes('canvas')) {
    fillTextilePattern(ctx, item, -bw / 2, 0, bw, bh);
    ctx.strokeStyle = darken(item.hex, 0.25);
    ctx.lineWidth = 2;
    ctx.strokeRect(-bw / 2, 0, bw, bh);
    ctx.beginPath();
    ctx.strokeStyle = darken(item.hex, 0.35);
    ctx.lineWidth = 3;
    ctx.arc(-bw * 0.22, -bh * 0.05, bw * 0.28, Math.PI, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(bw * 0.22, -bh * 0.05, bw * 0.28, Math.PI, 0);
    ctx.stroke();
  } else {
    ctx.fillStyle = item.hex;
    const bx = -bw / 2;
    const by = bh * 0.15;
    const bw2 = bw;
    const bh2 = bh * 0.75;
    const r = 6;
    ctx.beginPath();
    ctx.moveTo(bx + r, by);
    ctx.lineTo(bx + bw2 - r, by);
    ctx.quadraticCurveTo(bx + bw2, by, bx + bw2, by + r);
    ctx.lineTo(bx + bw2, by + bh2 - r);
    ctx.quadraticCurveTo(bx + bw2, by + bh2, bx + bw2 - r, by + bh2);
    ctx.lineTo(bx + r, by + bh2);
    ctx.quadraticCurveTo(bx, by + bh2, bx, by + bh2 - r);
    ctx.lineTo(bx, by + r);
    ctx.quadraticCurveTo(bx, by, bx + r, by);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = darken(item.hex, 0.3);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-bw * 0.15, bh * 0.15);
    ctx.quadraticCurveTo(0, -bh * 0.15, bw * 0.15, bh * 0.15);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSunglasses(ctx: CanvasRenderingContext2D, layout: AccessoryLayout, item: AccessoryItem) {
  const left = point(layout, LM.leftEyeOuter, 0.28, 0.38);
  const right = point(layout, LM.rightEyeOuter, 0.72, 0.38);
  const cy = (left.y + right.y) / 2;
  const fw = faceWidth(layout);
  const span = Math.abs(right.x - left.x);
  const lensR = Math.max(fw * 0.16, span * 0.28);
  ctx.save();
  ctx.shadowColor = 'rgba(10,8,6,0.28)';
  ctx.shadowBlur = 6;
  const lens = (x: number) => {
    const g = ctx.createLinearGradient(x - lensR, cy - lensR, x + lensR, cy + lensR);
    g.addColorStop(0, 'rgba(40,44,48,0.82)');
    g.addColorStop(0.45, 'rgba(12,12,14,0.88)');
    g.addColorStop(1, 'rgba(8,8,10,0.9)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, cy, lensR, lensR * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.ellipse(x - lensR * 0.22, cy - lensR * 0.18, lensR * 0.35, lensR * 0.12, -0.4, 0, Math.PI * 2);
    ctx.fill();
  };
  lens(left.x);
  lens(right.x);
  ctx.strokeStyle = darken(item.hex, 0.1);
  ctx.lineWidth = Math.max(2.5, lensR * 0.14);
  ctx.beginPath();
  ctx.moveTo(left.x + lensR * 0.92, cy);
  ctx.lineTo(right.x - lensR * 0.92, cy);
  ctx.stroke();
  ctx.restore();
}

function drawBelt(ctx: CanvasRenderingContext2D, layout: AccessoryLayout, item: AccessoryItem) {
  const box = personBox(layout);
  const waistFrac = layout.view === 'full' ? 0.46 : 0.62;
  const y = box.top + box.height * waistFrac;
  const x0 = box.left + box.width * 0.22;
  const x1 = box.right - box.width * 0.22;
  const thick = Math.max(10, box.width * 0.07);
  const buckle = thick * 1.15;

  paintCloth(
    ctx,
    item,
    () => {
      ctx.moveTo(x0, y);
      ctx.quadraticCurveTo((x0 + x1) / 2, y + thick * 0.35, x1, y);
      ctx.lineTo(x1, y + thick);
      ctx.quadraticCurveTo((x0 + x1) / 2, y + thick * 1.35, x0, y + thick);
      ctx.closePath();
    },
    { x: x0, y: y - 2, w: x1 - x0, h: thick + 8 },
    0.15,
  );

  ctx.save();
  ctx.fillStyle = darken(item.hex, 0.28);
  ctx.strokeStyle = lighten(item.hex, 0.25);
  ctx.lineWidth = 1.5;
  ctx.shadowColor = 'rgba(0,0,0,0.28)';
  ctx.shadowBlur = 4;
  ctx.beginPath();
  ctx.roundRect((x0 + x1) / 2 - buckle, y - 1, buckle * 2, thick + 2, 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawWatch(ctx: CanvasRenderingContext2D, layout: AccessoryLayout, item: AccessoryItem) {
  const box = personBox(layout);
  const wrist = { x: box.left + box.width * 0.12, y: box.top + box.height * 0.52 };
  const r = box.width * 0.035;

  ctx.save();
  ctx.fillStyle = item.hex;
  ctx.beginPath();
  ctx.arc(wrist.x, wrist.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = lighten(item.hex, 0.25);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(wrist.x, wrist.y);
  ctx.lineTo(wrist.x + r * 0.45, wrist.y - r * 0.35);
  ctx.stroke();
  ctx.restore();
}

function drawTie(ctx: CanvasRenderingContext2D, layout: AccessoryLayout, item: AccessoryItem) {
  const chin = point(layout, LM.chin, 0.5, 0.96);
  const fw = faceWidth(layout);
  const knotY = chin.y + fw * 0.12;
  const knot = Math.max(10, fw * 0.12);
  const bladeW = Math.max(14, fw * 0.16);
  const bladeH = fw * 1.15;
  ctx.save();
  ctx.shadowColor = 'rgba(20,12,8,0.28)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = item.hex;
  ctx.beginPath();
  ctx.moveTo(chin.x - knot * 0.55, knotY);
  ctx.lineTo(chin.x, knotY - knot * 0.35);
  ctx.lineTo(chin.x + knot * 0.55, knotY);
  ctx.lineTo(chin.x, knotY + knot * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(chin.x - bladeW * 0.28, knotY + knot * 0.4);
  ctx.lineTo(chin.x + bladeW * 0.28, knotY + knot * 0.4);
  ctx.lineTo(chin.x + bladeW * 0.42, knotY + bladeH);
  ctx.lineTo(chin.x, knotY + bladeH + bladeW * 0.35);
  ctx.lineTo(chin.x - bladeW * 0.42, knotY + bladeH);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = lighten(item.hex, 0.18);
  ctx.fillRect(chin.x - 1.2, knotY + knot * 0.45, 2.4, bladeH * 0.7);
  ctx.restore();
}

function drawAccessory(ctx: CanvasRenderingContext2D, layout: AccessoryLayout, item: AccessoryItem) {
  switch (item.categoryId) {
    case 'scarf':
      drawScarf(ctx, layout, item);
      break;
    case 'necklace':
      drawNecklace(ctx, layout, item);
      break;
    case 'earrings':
      drawEarrings(ctx, layout, item);
      break;
    case 'caps':
      drawHat(ctx, layout, item);
      break;
    case 'bags':
      drawBag(ctx, layout, item);
      break;
    case 'other':
      if (item.id.includes('sunglasses')) drawSunglasses(ctx, layout, item);
      else if (item.id.includes('belt')) drawBelt(ctx, layout, item);
      else if (item.id.includes('watch')) drawWatch(ctx, layout, item);
      else if (item.id.includes('tie')) drawTie(ctx, layout, item);
      break;
    default:
      break;
  }
}

/** Layer order: hats and bags under jewelry; scarves split but drawn as one pass */
const DRAW_ORDER: Record<string, number> = {
  bags: 10,
  scarf: 20,
  caps: 30,
  necklace: 40,
  earrings: 50,
  other: 60,
};

/**
 * Draw selected accessories onto a canvas using real face landmarks (or
 * face-box / segmentation bounds as fallback). Runs entirely on-device.
 */
export function drawAccessories(
  ctx: CanvasRenderingContext2D,
  layout: AccessoryLayout,
  items: AccessoryItem[],
): void {
  const sorted = [...items].sort(
    (a, b) => (DRAW_ORDER[a.categoryId] ?? 99) - (DRAW_ORDER[b.categoryId] ?? 99),
  );
  for (const item of sorted) {
    drawAccessory(ctx, layout, item);
  }
}

/** Product-style thumbnail that fills the tile — not a tiny icon in the corner */
export function renderAccessoryThumbnail(item: AccessoryItem, size = 128): string {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const bg = ctx.createLinearGradient(0, 0, 0, size);
  bg.addColorStop(0, '#f8fafc');
  bg.addColorStop(1, '#e2e8f0');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  const cx = size / 2;
  const cy = size / 2;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.18)';
  ctx.shadowBlur = size * 0.06;
  ctx.shadowOffsetY = size * 0.02;

  if (item.categoryId === 'earrings') {
    const r = size * 0.18;
    for (const x of [cx - size * 0.2, cx + size * 0.2]) {
      ctx.strokeStyle = item.hex;
      ctx.lineWidth = size * 0.055;
      ctx.beginPath();
      ctx.arc(x, cy + size * 0.04, r, 0.15 * Math.PI, 1.85 * Math.PI);
      ctx.stroke();
      ctx.fillStyle = item.hex;
      ctx.beginPath();
      ctx.arc(x, cy - r + size * 0.02, size * 0.035, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (item.categoryId === 'necklace') {
    ctx.strokeStyle = item.hex;
    ctx.lineWidth = size * 0.045;
    ctx.beginPath();
    ctx.ellipse(cx, cy - size * 0.08, size * 0.32, size * 0.28, 0, 0.12 * Math.PI, 0.88 * Math.PI);
    ctx.stroke();
    ctx.fillStyle = darken(item.hex, 0.08);
    ctx.beginPath();
    ctx.moveTo(cx, cy + size * 0.12);
    ctx.lineTo(cx - size * 0.08, cy + size * 0.28);
    ctx.lineTo(cx + size * 0.08, cy + size * 0.28);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = lighten(item.hex, 0.25);
    ctx.beginPath();
    ctx.arc(cx, cy + size * 0.22, size * 0.055, 0, Math.PI * 2);
    ctx.fill();
  } else if (item.categoryId === 'bags') {
    fillTextilePattern(ctx, item, size * 0.18, size * 0.32, size * 0.64, size * 0.48);
    ctx.strokeStyle = darken(item.hex, 0.25);
    ctx.lineWidth = size * 0.03;
    ctx.strokeRect(size * 0.18, size * 0.32, size * 0.64, size * 0.48);
    ctx.beginPath();
    ctx.arc(size * 0.34, size * 0.32, size * 0.14, Math.PI, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(size * 0.66, size * 0.32, size * 0.14, Math.PI, 0);
    ctx.stroke();
  } else if (item.categoryId === 'caps') {
    ctx.fillStyle = item.hex;
    ctx.beginPath();
    ctx.ellipse(cx, cy + size * 0.02, size * 0.34, size * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(cx - size * 0.22, cy - size * 0.22, size * 0.44, size * 0.24);
    ctx.beginPath();
    ctx.ellipse(cx, cy - size * 0.22, size * 0.22, size * 0.1, 0, Math.PI, 0);
    ctx.fill();
  } else if (item.categoryId === 'scarf') {
    ctx.beginPath();
    ctx.moveTo(size * 0.18, size * 0.28);
    ctx.quadraticCurveTo(size * 0.5, size * 0.12, size * 0.82, size * 0.3);
    ctx.quadraticCurveTo(size * 0.72, size * 0.78, size * 0.38, size * 0.86);
    ctx.quadraticCurveTo(size * 0.22, size * 0.58, size * 0.18, size * 0.28);
    ctx.closePath();
    ctx.clip();
    fillTextilePattern(ctx, item, size * 0.1, size * 0.1, size * 0.8, size * 0.8);
  } else {
    ctx.fillStyle = item.hex;
    ctx.beginPath();
    ctx.ellipse(cx - size * 0.16, cy, size * 0.18, size * 0.12, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + size * 0.16, cy, size * 0.18, size * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = lighten(item.hex, 0.35);
    ctx.lineWidth = size * 0.04;
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.02, cy);
    ctx.lineTo(cx + size * 0.02, cy);
    ctx.stroke();
  }

  ctx.restore();
  return canvas.toDataURL('image/png');
}

/** Composite accessories on top of an existing image (try-on result, etc.) */
export async function compositeAccessoriesOnImage(
  baseDataUrl: string,
  items: AccessoryItem[],
  landmarks: NormPoint[] | null,
  faceBox: FaceRegion | null,
): Promise<string> {
  if (!items.length) return baseDataUrl;
  await preloadTextileTextures();

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = baseDataUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  drawAccessories(ctx, {
    width: canvas.width,
    height: canvas.height,
    landmarks,
    faceBox,
  }, items);

  return canvas.toDataURL('image/jpeg', 0.92);
}
