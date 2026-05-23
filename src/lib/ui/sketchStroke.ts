/** Shared hand-drawn stroke utilities for doodly UI. */

export const STROKE_WIDTH = 1.5;
export const STROKE_DASH = "4 3";

/** Corner jitter for chips, buttons, inputs, bubbles (DoodleOutline). */
export const WOBBLE_AMPLITUDE_DEFAULT = 2;

/** Stronger jitter for large SketchCard surfaces. */
export const WOBBLE_AMPLITUDE_CARD = 5;

/** Seed offsets for overlapping hand-drawn border strokes. */
export const SKETCH_BORDER_LAYERS = [0, 11, 29] as const;

export function seededOffset(seed: number, i: number): number {
  const x = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

/** Stable sketch seed from a document id string. */
export function sketchSeedFrom(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Wobbly closed rect in pixel coordinates. */
export function buildWobblyRectPath(
  width: number,
  height: number,
  seed: number,
  inset = 2,
): string {
  if (width <= 0 || height <= 0) return "";

  const w = (i: number) => seededOffset(seed, i) * WOBBLE_AMPLITUDE_DEFAULT;
  const x1 = inset + w(0);
  const y1 = inset + w(1);
  const x2 = width - inset + w(2);
  const y2 = inset + w(3);
  const x3 = width - inset + w(4);
  const y3 = height - inset + w(5);
  const x4 = inset + w(6);
  const y4 = height - inset + w(7);

  return `M ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3} L ${x4} ${y4} Z`;
}

/**
 * Hand-drawn card outline: 8 perimeter points with bowed quadratic edges.
 * Used by SketchCard only — keep DoodleOutline on buildWobblyRectPath.
 */
export function buildCardWobblyPath(
  width: number,
  height: number,
  seed: number,
  inset = 2,
  amplitude = WOBBLE_AMPLITUDE_CARD,
): string {
  if (width <= 0 || height <= 0) return "";

  const w = (i: number) => seededOffset(seed, i) * amplitude;

  const pts: [number, number][] = [
    [inset + w(0), inset + w(1)],
    [width / 2 + w(2), inset + w(3)],
    [width - inset + w(4), inset + w(5)],
    [width - inset + w(6), height / 2 + w(7)],
    [width - inset + w(8), height - inset + w(9)],
    [width / 2 + w(10), height - inset + w(11)],
    [inset + w(12), height - inset + w(13)],
    [inset + w(14), height / 2 + w(15)],
  ];

  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length; i++) {
    const curr = pts[i];
    const next = pts[(i + 1) % pts.length];
    const cx = (curr[0] + next[0]) / 2 + w(16 + i);
    const cy = (curr[1] + next[1]) / 2 + w(24 + i);
    d += ` Q ${cx} ${cy} ${next[0]} ${next[1]}`;
  }
  return `${d} Z`;
}

/** Wobbly closed rect in 0–100 viewBox coordinates (for stretchable SketchCard). */
export function buildWobblyRectPathNormalized(seed: number, inset = 1.5): string {
  const w = (i: number) => inset + seededOffset(seed, i) * 1.5;
  const x1 = w(0);
  const y1 = w(1);
  const x2 = 100 - inset + seededOffset(seed, 2) * 1.5;
  const y2 = w(3);
  const x3 = 100 - inset + seededOffset(seed, 4) * 1.5;
  const y3 = 100 - inset + seededOffset(seed, 5) * 1.5;
  const x4 = w(6);
  const y4 = 100 - inset + seededOffset(seed, 7) * 1.5;

  return `M ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3} L ${x4} ${y4} Z`;
}

/** Hand-drawn send / paper plane: clear right-pointing triangle (tail left, tip right). */
export function buildWobblySendPaths(
  size: number,
  seed: number,
): { plane: string; fold: string } {
  const w = (i: number) => seededOffset(seed, i) * 1.2;
  const pad = size * 0.2;

  const tipX = size - pad + w(0);
  const tipY = size / 2 + w(1);
  const tailTopX = pad + w(2);
  const tailTopY = size * 0.3 + w(3);
  const tailBotX = pad + w(4);
  const tailBotY = size * 0.7 + w(5);

  const plane = `M ${tipX} ${tipY} L ${tailTopX} ${tailTopY} L ${tailBotX} ${tailBotY} Z`;
  const foldX = tailTopX + (tipX - tailTopX) * 0.5 + w(6);
  const foldY = (tailTopY + tailBotY) / 2 + w(7);
  const fold = `M ${tailTopX} ${tailTopY} L ${foldX} ${foldY}`;

  return { plane, fold };
}

/** Hand-drawn plus: horizontal and vertical bar paths in a square. */
export function buildWobblyPlusPaths(
  size: number,
  seed: number,
): { horizontal: string; vertical: string } {
  const c = size / 2;
  const half = size * 0.22;
  const w = (i: number) => seededOffset(seed, i) * 1.2;

  const horizontal = `M ${c - half + w(0)} ${c + w(1)} L ${c + half + w(2)} ${c + w(3)}`;
  const vertical = `M ${c + w(4)} ${c - half + w(5)} L ${c + w(6)} ${c + half + w(7)}`;

  return { horizontal, vertical };
}

/** Hand-drawn X: two diagonal stroke paths in a square. */
export function buildWobblyXPaths(
  size: number,
  seed: number,
): { nwSe: string; neSw: string } {
  const inset = size * 0.28;
  const w = (i: number) => seededOffset(seed, i) * 1.2;

  const nwSe = `M ${inset + w(0)} ${inset + w(1)} L ${size - inset + w(2)} ${size - inset + w(3)}`;
  const neSw = `M ${size - inset + w(4)} ${inset + w(5)} L ${inset + w(6)} ${size - inset + w(7)}`;

  return { nwSe, neSw };
}

/** Hand-drawn chevron-down: left and right stroke paths in a square. */
export function buildWobblyChevronDownPaths(
  size: number,
  seed: number,
): { left: string; right: string } {
  const c = size / 2;
  const half = size * 0.22;
  const w = (i: number) => seededOffset(seed, i) * 1.2;

  const left = `M ${c - half + w(0)} ${c - half * 0.35 + w(1)} L ${c + w(2)} ${c + half + w(3)}`;
  const right = `M ${c + half + w(4)} ${c - half * 0.35 + w(5)} L ${c + w(6)} ${c + half + w(7)}`;

  return { left, right };
}

/** Hand-drawn chevron-up: left and right stroke paths in a square. */
export function buildWobblyChevronUpPaths(
  size: number,
  seed: number,
): { left: string; right: string } {
  const c = size / 2;
  const half = size * 0.22;
  const w = (i: number) => seededOffset(seed, i) * 1.2;

  const left = `M ${c - half + w(0)} ${c + half * 0.35 + w(1)} L ${c + w(2)} ${c - half + w(3)}`;
  const right = `M ${c + half + w(4)} ${c + half * 0.35 + w(5)} L ${c + w(6)} ${c - half + w(7)}`;

  return { left, right };
}

/** Hand-drawn calendar: wobbly body, binding rings, and header divider. */
export function buildWobblyCalendarPaths(
  size: number,
  seed: number,
): { body: string; ringLeft: string; ringRight: string; divider: string } {
  const s = size / 24;
  const w = (i: number) => seededOffset(seed, i) * 1.1 * s;

  const ringLeftX = 8 * s + w(0);
  const ringRightX = 16 * s + w(1);
  const ringTop = 2 * s + w(2);
  const ringBot = 6 * s + w(3);
  const ringLeft = `M ${ringLeftX} ${ringTop} L ${ringLeftX + w(4)} ${ringBot}`;
  const ringRight = `M ${ringRightX} ${ringTop} L ${ringRightX + w(5)} ${ringBot}`;

  const divY = 10 * s + w(6);
  const divider = `M ${3 * s + w(7)} ${divY} L ${21 * s + w(8)} ${divY + w(9)}`;

  const x1 = 5 * s + w(10);
  const y1 = 4 * s + w(11);
  const x2 = 19 * s + w(12);
  const y2 = 4 * s + w(13);
  const x3 = 19 * s + w(14);
  const y3 = 22 * s + w(15);
  const x4 = 5 * s + w(16);
  const y4 = 22 * s + w(17);
  const body = `M ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3} L ${x4} ${y4} Z`;

  return { body, ringLeft, ringRight, divider };
}

/** Hand-drawn swap / exchange: two opposing curved arrows. */
export function buildWobblyExchangePaths(
  size: number,
  seed: number,
): { top: string; topHead: string; bottom: string; bottomHead: string } {
  const w = (i: number) => seededOffset(seed, i) * 1.4;
  const pad = size * 0.18;
  const mid = size / 2;
  const spread = size * 0.14;

  const topY = mid - spread + w(0);
  const bottomY = mid + spread + w(1);

  const top = `M ${pad + w(2)} ${topY} Q ${mid + w(3)} ${topY - spread * 0.9 + w(4)}, ${size - pad + w(5)} ${topY + w(6)}`;
  const bottom = `M ${size - pad + w(7)} ${bottomY} Q ${mid + w(8)} ${bottomY + spread * 0.9 + w(9)}, ${pad + w(10)} ${bottomY + w(11)}`;

  const head = size * 0.14;
  const topEndX = size - pad + w(5);
  const topEndY = topY + w(6);
  const topHead = `M ${topEndX - head + w(12)} ${topEndY - head * 0.7 + w(13)} L ${topEndX + w(14)} ${topEndY + w(15)} L ${topEndX - head + w(16)} ${topEndY + head * 0.7 + w(17)}`;

  const bottomEndX = pad + w(10);
  const bottomEndY = bottomY + w(11);
  const bottomHead = `M ${bottomEndX + head + w(18)} ${bottomEndY - head * 0.7 + w(19)} L ${bottomEndX + w(20)} ${bottomEndY + w(21)} L ${bottomEndX + head + w(22)} ${bottomEndY + head * 0.7 + w(23)}`;

  return { top, topHead, bottom, bottomHead };
}

/** Hand-drawn magnifying glass for browse tab. */
export function buildWobblySearchPaths(
  size: number,
  seed: number,
): { lens: string; handle: string } {
  const w = (i: number) => seededOffset(seed, i) * 1.2;
  const cx = size * 0.4 + w(0);
  const cy = size * 0.4 + w(1);
  const r = size * 0.26;
  const n = 7;
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 3;
    pts.push([
      cx + Math.cos(a) * (r + w(2 + i)),
      cy + Math.sin(a) * (r + w(2 + n + i)),
    ]);
  }
  let lens = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    lens += ` L ${pts[i][0]} ${pts[i][1]}`;
  }
  lens += " Z";

  const handle = `M ${pts[5][0] + w(14)} ${pts[5][1] + w(15)} L ${size * 0.9 + w(16)} ${size * 0.9 + w(17)}`;

  return { lens, handle };
}

/** Hand-drawn clock for history tab. */
export function buildWobblyClockPaths(
  size: number,
  seed: number,
  focused: boolean,
): { face: string; hour: string; minute: string } {
  const w = (i: number) => seededOffset(seed, i) * 1.1;
  const c = size / 2;
  const r = size * 0.38;
  const n = 8;
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    pts.push([
      c + Math.cos(a) * (r + w(i)),
      c + Math.sin(a) * (r + w(n + i)),
    ]);
  }
  let face = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    face += ` L ${pts[i][0]} ${pts[i][1]}`;
  }
  face += " Z";

  const hourLen = r * (focused ? 0.52 : 0.45);
  const minuteLen = r * (focused ? 0.68 : 0.58);
  const hour = `M ${c + w(16)} ${c + w(17)} L ${c - hourLen * 0.35 + w(18)} ${c - hourLen + w(19)}`;
  const minute = `M ${c + w(20)} ${c + w(21)} L ${c + minuteLen * 0.75 + w(22)} ${c - minuteLen * 0.35 + w(23)}`;

  return { face, hour, minute };
}

/** Hand-drawn chat bubbles for chats tab — tail + message lines for legibility. */
export function buildWobblyChatPaths(
  size: number,
  seed: number,
): { back: string; bubble: string; lines: string } {
  const w = (i: number) => seededOffset(seed, i) * 0.85;

  // Smaller bubble behind (conversation cue)
  const bx0 = size * 0.06;
  const by0 = size * 0.1;
  const bw0 = size * 0.44;
  const bh0 = size * 0.34;
  const back = `M ${bx0 + w(0)} ${by0 + w(1)} L ${bx0 + bw0 + w(2)} ${by0 + w(3)} L ${bx0 + bw0 + w(4)} ${by0 + bh0 + w(5)} L ${bx0 + w(6)} ${by0 + bh0 + w(7)} Z`;

  // Main bubble with tail at bottom-left
  const bx = size * 0.22;
  const by = size * 0.14;
  const bw = size * 0.72;
  const bh = size * 0.5;
  const x1 = bx + w(8);
  const y1 = by + w(9);
  const x2 = bx + bw + w(10);
  const y2 = by + w(11);
  const x3 = bx + bw + w(12);
  const y3 = by + bh + w(13);
  const tailR = bx + bw * 0.38 + w(14);
  const tailTipX = bx + bw * 0.1 + w(15);
  const tailTipY = by + bh + size * 0.16 + w(16);
  const tailL = bx + bw * 0.14 + w(17);
  const x4 = bx + w(18);
  const y4 = by + bh + w(19);
  const bubble = `M ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3} L ${tailR} ${y3} L ${tailTipX} ${tailTipY} L ${tailL} ${y3} L ${x4} ${y4} Z`;

  // Message lines inside main bubble
  const lx = bx + bw * 0.2 + w(20);
  const lineW = bw * 0.58;
  const yLine1 = by + bh * 0.36 + w(21);
  const yLine2 = by + bh * 0.56 + w(22);
  const lines = `M ${lx} ${yLine1} L ${lx + lineW + w(23)} ${yLine1 + w(24)} M ${lx} ${yLine2} L ${lx + lineW * 0.65 + w(25)} ${yLine2 + w(26)}`;

  return { back, bubble, lines };
}

/** Hand-drawn person silhouette for profile tab — circle head + U-shaped shoulders. */
export function buildWobblyPersonPaths(
  size: number,
  seed: number,
): { head: string; body: string } {
  const w = (i: number) => seededOffset(seed, i) * 1.0;
  const c = size / 2;
  const headCy = size * 0.27;
  const headR = size * 0.16;
  const n = 8;
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    pts.push([
      c + Math.cos(a) * (headR + w(i)),
      headCy + Math.sin(a) * (headR + w(n + i)),
    ]);
  }
  let head = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    head += ` L ${pts[i][0]} ${pts[i][1]}`;
  }
  head += " Z";

  // U-shaped torso: endpoints at shoulders, control below so the arc reads as body not a smile.
  const neckY = headCy + headR + size * 0.04 + w(16);
  const shoulderHalf = size * 0.38;
  const torsoY = size * 0.9 + w(17);
  const body = `M ${c - shoulderHalf + w(18)} ${neckY + w(19)} Q ${c + w(20)} ${torsoY + w(21)}, ${c + shoulderHalf + w(22)} ${neckY + w(23)}`;

  return { head, body };
}

/** Horizontal wavy divider path for a given width. */
export function buildWavyLinePath(width: number, seed: number, y = 6): string {
  if (width <= 0) return "";
  const segments = Math.max(4, Math.floor(width / 24));
  const step = width / segments;
  let d = `M 0 ${y + seededOffset(seed, 0)}`;
  for (let i = 1; i <= segments; i++) {
    const x = i * step;
    const dy = seededOffset(seed, i) * 2.5;
    d += ` L ${x} ${y + dy}`;
  }
  return d;
}
