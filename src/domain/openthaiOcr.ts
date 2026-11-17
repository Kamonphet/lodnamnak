// OpenThai 2.0 OCR Text (iApp, Apache-2.0) ported from its reference runtime
// (runtime/line_engine.py + thai_norm.py) to run in the browser:
//   image -> DB line detector -> line crops (48 px high, background flattened)
//         -> CTC recognizer -> Thai normalisation -> rows in reading order.
// Model running is injected (OcrRunner) so the pipeline is plain TypeScript
// and can be tested in Node with the same ONNX models.
// Left out from the reference: page orientation / deskew re-detection, line
// splitting at wide gaps and column blocks. Phone photos of a label are
// upright and a label is one table, so rows across the whole image are wanted.

export interface RgbaImage {
  width: number;
  height: number;
  /** RGBA, 4 bytes per pixel (ImageData layout) */
  data: Uint8ClampedArray | Uint8Array;
}

export interface Tensor3 {
  data: Float32Array;
  dims: number[];
}

export interface OcrRunner {
  /** x: [1,3,h,w] -> probability map [1,1,h,w] */
  det(x: Float32Array, h: number, w: number): Promise<Tensor3>;
  /** x: [n,3,48,w] -> class probabilities [n,T,C] */
  rec(x: Float32Array, n: number, w: number): Promise<Tensor3>;
}

type Pt = [number, number];
type Quad = [Pt, Pt, Pt, Pt]; // top-left, top-right, bottom-right, bottom-left

export interface OcrLine {
  text: string;
  confidence: number;
  box: Quad;
}

export interface OcrResult {
  text: string;
  lines: OcrLine[];
}

export interface OcrOptions {
  /** long side of the image the detector sees */
  detLimit: number;
  thresh: number;
  boxThresh: number;
  unclip: number;
  minSize: number;
  maxCandidates: number;
  /** a line under this confidence is dropped */
  dropBelow: number;
  minChars: number;
  junkBelow: number;
  junkInvalid: number;
  batch: number;
  maxW: number;
  /** photos are scaled down to this long side before anything else */
  maxInputSide: number;
  onProgress?: (fraction: number) => void;
}

// det.yml PostProcess + config.json of the release. A nutrition label is full
// of one-character cells ("0", "g"), so min_chars is 1 and the confidence floor
// is lower than the release's 0.8 (tuned on long court-document lines).
export const DEFAULT_OCR_OPTIONS: OcrOptions = {
  detLimit: 1280,
  thresh: 0.2,
  boxThresh: 0.4,
  unclip: 1.4,
  minSize: 3,
  maxCandidates: 3000,
  dropBelow: 0.6,
  minChars: 1,
  junkBelow: 0.85,
  junkInvalid: 0.05,
  batch: 16,
  maxW: 3200,
  maxInputSide: 2000,
};

const REC_H = 48;
const DET_MEAN = [0.485, 0.456, 0.406];
const DET_STD = [0.229, 0.224, 0.225];

/** CTC classes: 0 = blank, the dictionary, then the space PaddleOCR appends */
export function buildCharset(dictText: string): string[] {
  const chars = dictText.split('\n').map((c) => c.replace(/\r$/, '')).filter((c) => c.length > 0);
  return ['', ...chars, ' '];
}

// ---------------------------------------------------------------- image ops

/** Bilinear resize (cv2.INTER_LINEAR pixel-centre convention) of an RGBA image */
export function resizeRgba(src: RgbaImage, dw: number, dh: number): RgbaImage {
  const { width: sw, height: sh, data: s } = src;
  const out = new Uint8ClampedArray(dw * dh * 4);
  const fx = sw / dw;
  const fy = sh / dh;
  // Shrinking a lot: average a few samples per pixel instead of one.
  const nx = Math.max(1, Math.min(4, Math.round(fx)));
  const ny = Math.max(1, Math.min(4, Math.round(fy)));
  for (let y = 0; y < dh; y++) {
    for (let x = 0; x < dw; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let j = 0; j < ny; j++) {
        const syf = (y + (j + 0.5) / ny) * fy - 0.5;
        for (let i = 0; i < nx; i++) {
          const sxf = (x + (i + 0.5) / nx) * fx - 0.5;
          const px = bilinear(s, sw, sh, sxf, syf);
          r += px[0];
          g += px[1];
          b += px[2];
        }
      }
      const n = nx * ny;
      const o = (y * dw + x) * 4;
      out[o] = r / n;
      out[o + 1] = g / n;
      out[o + 2] = b / n;
      out[o + 3] = 255;
    }
  }
  return { width: dw, height: dh, data: out };
}

const px3: [number, number, number] = [0, 0, 0];
function bilinear(s: RgbaImage['data'], w: number, h: number, x: number, y: number): [number, number, number] {
  x = Math.min(Math.max(x, 0), w - 1);
  y = Math.min(Math.max(y, 0), h - 1);
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(x0 + 1, w - 1);
  const y1 = Math.min(y0 + 1, h - 1);
  const ax = x - x0;
  const ay = y - y0;
  const i00 = (y0 * w + x0) * 4;
  const i10 = (y0 * w + x1) * 4;
  const i01 = (y1 * w + x0) * 4;
  const i11 = (y1 * w + x1) * 4;
  for (let c = 0; c < 3; c++) {
    const top = s[i00 + c] * (1 - ax) + s[i10 + c] * ax;
    const bot = s[i01 + c] * (1 - ax) + s[i11 + c] * ax;
    px3[c] = top * (1 - ay) + bot * ay;
  }
  return px3;
}

function limitSize(img: RgbaImage, maxSide: number): { img: RgbaImage; scale: number } {
  const long = Math.max(img.width, img.height);
  if (long <= maxSide) return { img, scale: 1 };
  const s = maxSide / long;
  return {
    img: resizeRgba(img, Math.max(1, Math.round(img.width * s)), Math.max(1, Math.round(img.height * s))),
    scale: s,
  };
}

// ---------------------------------------------------------------- geometry

const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);

function orderPoints(pts: Pt[]): Quad {
  const byX = [...pts].sort((a, b) => a[0] - b[0]);
  const left = byX.slice(0, 2).sort((a, b) => a[1] - b[1]);
  const right = byX.slice(2).sort((a, b) => a[1] - b[1]);
  return [left[0], right[0], right[1], left[1]];
}

function convexHull(points: Pt[]): Pt[] {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length < 3) return pts;
  const cross = (o: Pt, a: Pt, b: Pt) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Pt[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: Pt[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

interface Rect {
  cx: number;
  cy: number;
  ux: number; // unit vector along the first side
  uy: number;
  w: number; // length along u
  h: number; // length along the normal
}

/** cv2.minAreaRect over a convex hull (rotating the frame onto each edge) */
function minAreaRect(hull: Pt[]): Rect | null {
  if (hull.length === 0) return null;
  if (hull.length === 1) return { cx: hull[0][0], cy: hull[0][1], ux: 1, uy: 0, w: 0, h: 0 };
  let best: Rect | null = null;
  let bestArea = Infinity;
  for (let i = 0; i < hull.length; i++) {
    const a = hull[i];
    const b = hull[(i + 1) % hull.length];
    const len = dist(a, b);
    if (len === 0) continue;
    const ux = (b[0] - a[0]) / len;
    const uy = (b[1] - a[1]) / len;
    let minU = Infinity;
    let maxU = -Infinity;
    let minV = Infinity;
    let maxV = -Infinity;
    for (const p of hull) {
      const u = p[0] * ux + p[1] * uy;
      const v = -p[0] * uy + p[1] * ux;
      if (u < minU) minU = u;
      if (u > maxU) maxU = u;
      if (v < minV) minV = v;
      if (v > maxV) maxV = v;
    }
    const area = (maxU - minU) * (maxV - minV);
    if (area < bestArea) {
      bestArea = area;
      const cu = (minU + maxU) / 2;
      const cv = (minV + maxV) / 2;
      best = { cx: cu * ux - cv * uy, cy: cu * uy + cv * ux, ux, uy, w: maxU - minU, h: maxV - minV };
    }
  }
  return best;
}

function rectCorners(r: Rect): Pt[] {
  const hx = (r.w / 2) * r.ux;
  const hy = (r.w / 2) * r.uy;
  const vx = (-r.h / 2) * r.uy;
  const vy = (r.h / 2) * r.ux;
  return [
    [r.cx - hx - vx, r.cy - hy - vy],
    [r.cx + hx - vx, r.cy + hy - vy],
    [r.cx + hx + vx, r.cy + hy + vy],
    [r.cx - hx + vx, r.cy - hy + vy],
  ];
}

function insideConvex(quad: Pt[], x: number, y: number): boolean {
  let sign = 0;
  for (let i = 0; i < quad.length; i++) {
    const a = quad[i];
    const b = quad[(i + 1) % quad.length];
    const c = (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]);
    if (Math.abs(c) < 1e-6) continue;
    const s = c > 0 ? 1 : -1;
    if (sign === 0) sign = s;
    else if (s !== sign) return false;
  }
  return true;
}

/** mean probability inside the box (DB "fast" score) */
function boxScore(prob: Float32Array, w: number, h: number, quad: Pt[]): number {
  const xs = quad.map((p) => p[0]);
  const ys = quad.map((p) => p[1]);
  const x0 = Math.max(0, Math.floor(Math.min(...xs)));
  const x1 = Math.min(w - 1, Math.ceil(Math.max(...xs)));
  const y0 = Math.max(0, Math.floor(Math.min(...ys)));
  const y1 = Math.min(h - 1, Math.ceil(Math.max(...ys)));
  let sum = 0;
  let n = 0;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (insideConvex(quad, x, y)) {
        sum += prob[y * w + x];
        n++;
      }
    }
  }
  return n ? sum / n : 0;
}

// ---------------------------------------------------------------- detection

export async function detectLines(img: RgbaImage, runner: OcrRunner, o: OcrOptions): Promise<Quad[]> {
  const W0 = img.width;
  const H0 = img.height;
  // White border so text touching the edge still closes a region.
  const pad = Math.max(8, Math.floor(0.05 * Math.min(H0, W0)));
  const w = W0 + 2 * pad;
  const h = H0 + 2 * pad;
  const padded = new Uint8ClampedArray(w * h * 4).fill(255);
  for (let y = 0; y < H0; y++) {
    padded.set(img.data.subarray(y * W0 * 4, (y + 1) * W0 * 4), ((y + pad) * w + pad) * 4);
  }
  const s = Math.min(o.detLimit / Math.max(h, w), 4);
  const rh = Math.max(32, Math.round((h * s) / 32) * 32);
  const rw = Math.max(32, Math.round((w * s) / 32) * 32);
  const small = resizeRgba({ width: w, height: h, data: padded }, rw, rh);

  // The model was trained on BGR (cv2) with the ImageNet mean/std in that order.
  const plane = rw * rh;
  const x = new Float32Array(3 * plane);
  for (let i = 0; i < plane; i++) {
    const r = small.data[i * 4];
    const g = small.data[i * 4 + 1];
    const b = small.data[i * 4 + 2];
    x[i] = (b / 255 - DET_MEAN[0]) / DET_STD[0];
    x[plane + i] = (g / 255 - DET_MEAN[1]) / DET_STD[1];
    x[2 * plane + i] = (r / 255 - DET_MEAN[2]) / DET_STD[2];
  }
  const out = await runner.det(x, rh, rw);
  const ph = out.dims[2];
  const pw = out.dims[3];
  const prob = out.data;

  // Connected regions of the thresholded map (8-neighbour), then per region the
  // convex hull of its row extremes = hull of the region.
  const label = new Int32Array(pw * ph);
  const stack = new Int32Array(pw * ph);
  const sx = w / pw;
  const sy = h / ph;
  const boxes: Quad[] = [];
  let regions = 0;
  for (let start = 0; start < pw * ph && regions < o.maxCandidates; start++) {
    if (label[start] || prob[start] <= o.thresh) continue;
    regions++;
    const rowMin = new Map<number, number>();
    const rowMax = new Map<number, number>();
    let top = 0;
    stack[top++] = start;
    label[start] = regions;
    while (top) {
      const p = stack[--top];
      const py = (p / pw) | 0;
      const px = p - py * pw;
      const mn = rowMin.get(py);
      if (mn === undefined || px < mn) rowMin.set(py, px);
      const mx = rowMax.get(py);
      if (mx === undefined || px > mx) rowMax.set(py, px);
      for (let dy = -1; dy <= 1; dy++) {
        const ny = py + dy;
        if (ny < 0 || ny >= ph) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const nx = px + dx;
          if (nx < 0 || nx >= pw || (dx === 0 && dy === 0)) continue;
          const q = ny * pw + nx;
          if (!label[q] && prob[q] > o.thresh) {
            label[q] = regions;
            stack[top++] = q;
          }
        }
      }
    }
    const pts: Pt[] = [];
    rowMin.forEach((mn, y) => {
      pts.push([mn, y]);
      const mx = rowMax.get(y)!;
      if (mx !== mn) pts.push([mx, y]);
    });
    const rect = minAreaRect(convexHull(pts));
    if (!rect || Math.min(rect.w, rect.h) < o.minSize) continue;
    if (boxScore(prob, pw, ph, rectCorners(rect)) < o.boxThresh) continue;
    // Unclip: offsetting a rectangle by d and taking its min-area rectangle
    // again grows each side by 2d.
    const d = (rect.w * rect.h * o.unclip) / (2 * (rect.w + rect.h));
    const big: Rect = { ...rect, w: rect.w + 2 * d, h: rect.h + 2 * d };
    if (Math.min(big.w, big.h) < o.minSize + 2) continue;
    const quad = orderPoints(rectCorners(big)).map(
      (p) => [clamp(p[0] * sx - pad, 0, W0 - 1), clamp(p[1] * sy - pad, 0, H0 - 1)] as Pt,
    ) as Quad;
    const bx = quad.map((p) => p[0]);
    const by = quad.map((p) => p[1]);
    if (Math.max(...bx) - Math.min(...bx) >= 2 && Math.max(...by) - Math.min(...by) >= 2) boxes.push(quad);
  }
  return boxes;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

// ---------------------------------------------------------------- recognition

/** One line cut out along its box, straight, 48 px high, as grey levels */
export function cropLineGray(img: RgbaImage, q: Quad): { gray: Uint8Array; width: number } {
  const bw = Math.max(1, Math.floor(Math.max(dist(q[0], q[1]), dist(q[2], q[3]))));
  const bh = Math.max(1, Math.floor(Math.max(dist(q[0], q[3]), dist(q[1], q[2]))));
  const width = Math.max(1, Math.ceil((REC_H * bw) / bh));
  const gray = new Uint8Array(width * REC_H);
  // affine from (u,v) in the crop to the image: tl + u*(tr-tl) + v*(bl-tl)
  const [tl, tr, , bl] = q;
  const ex = [(tr[0] - tl[0]) / width, (tr[1] - tl[1]) / width];
  const ey = [(bl[0] - tl[0]) / REC_H, (bl[1] - tl[1]) / REC_H];
  const n = Math.max(1, Math.min(4, Math.round(bh / REC_H)));
  for (let y = 0; y < REC_H; y++) {
    for (let x = 0; x < width; x++) {
      let acc = 0;
      for (let j = 0; j < n; j++) {
        const v = y + (j + 0.5) / n;
        for (let i = 0; i < n; i++) {
          const u = x + (i + 0.5) / n;
          const p = bilinear(img.data, img.width, img.height, tl[0] + u * ex[0] + v * ey[0] - 0.5, tl[1] + u * ex[1] + v * ey[1] - 0.5);
          acc += 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2];
        }
      }
      gray[y * width + x] = Math.round(acc / (n * n));
    }
  }
  return { gray, width };
}

/** Dark text on white from any crop: each column's background (median of the
 *  top and bottom margins, smoothed along the line) is subtracted. */
export function flattenLine(g: Uint8Array, w: number, h: number): Uint8Array {
  const k = Math.max(2, Math.floor(h / 6));
  const colBg = new Uint8Array(w);
  const tmp: number[] = new Array(2 * k);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < k; y++) {
      tmp[y] = g[y * w + x];
      tmp[k + y] = g[(h - k + y) * w + x];
    }
    tmp.sort((a, b) => a - b);
    colBg[x] = Math.floor((tmp[k - 1] + tmp[k]) / 2);
  }
  const win = Math.max(3, Math.min(h | 1, 255));
  const half = win >> 1;
  const bg = new Float32Array(w);
  const hist = new Int32Array(256);
  // running median over `win` columns, edges replicated (cv2.medianBlur)
  for (let i = -half; i <= half; i++) hist[colBg[clamp(i, 0, w - 1)]]++;
  for (let x = 0; x < w; x++) {
    let c = 0;
    let m = 0;
    while (m < 256) {
      c += hist[m];
      if (c > half) break;
      m++;
    }
    bg[x] = m;
    hist[colBg[clamp(x - half, 0, w - 1)]]--;
    hist[colBg[clamp(x + half + 1, 0, w - 1)]]++;
  }
  const d = new Float32Array(w * h);
  const dh = new Int32Array(256);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = Math.abs(g[y * w + x] - bg[x]);
      d[y * w + x] = v;
      dh[Math.min(255, Math.floor(v))]++;
    }
  }
  const total = w * h;
  let cum = 0;
  let hi = 0;
  for (; hi < 256; hi++) {
    cum += dh[hi];
    if (cum >= 0.98 * total) break;
  }
  hi = Math.max(hi, 24);
  const out = new Uint8Array(w * h);
  for (let i = 0; i < total; i++) out[i] = 255 - clamp(Math.floor(d[i] * (255 / hi)), 0, 255);
  return out;
}

export function ctcDecode(p: Float32Array, offset: number, T: number, C: number, charset: string[]): { text: string; conf: number } {
  let text = '';
  let sum = 0;
  let n = 0;
  let prev = -1;
  for (let t = 0; t < T; t++) {
    let best = 0;
    let bestP = -Infinity;
    const base = offset + t * C;
    for (let c = 0; c < C; c++) {
      if (p[base + c] > bestP) {
        bestP = p[base + c];
        best = c;
      }
    }
    if (best !== prev && best !== 0) {
      text += charset[best] ?? '';
      sum += bestP;
      n++;
    }
    prev = best;
  }
  return { text, conf: n ? sum / n : 0 };
}

export async function recognizeLines(
  crops: { gray: Uint8Array; width: number }[],
  runner: OcrRunner,
  charset: string[],
  o: OcrOptions,
  onBatch?: (done: number) => void,
): Promise<{ text: string; conf: number }[]> {
  const flat = crops.map((c) => ({ img: flattenLine(c.gray, c.width, REC_H), width: c.width }));
  const order = flat.map((_, i) => i).sort((a, b) => flat[a].width - flat[b].width);
  const out: { text: string; conf: number }[] = new Array(crops.length).fill({ text: '', conf: 0 });
  for (let b = 0; b < order.length; b += o.batch) {
    const idx = order.slice(b, b + o.batch);
    const W = Math.min(o.maxW, Math.max(16, Math.max(...idx.map((i) => flat[i].width))));
    const plane = REC_H * W;
    const x = new Float32Array(idx.length * 3 * plane); // 0 = mid-grey after normalising
    idx.forEach((i, n) => {
      const { img, width } = flat[i];
      const rw = Math.min(W, width);
      for (let y = 0; y < REC_H; y++) {
        for (let xx = 0; xx < rw; xx++) {
          // a line wider than maxW is squeezed to fit
          const sxp = width > W ? Math.min(width - 1, Math.floor(((xx + 0.5) * width) / W)) : xx;
          const v = img[y * width + sxp] / 255 / 0.5 - 1;
          const o3 = n * 3 * plane + y * W + xx;
          x[o3] = v;
          x[o3 + plane] = v;
          x[o3 + 2 * plane] = v;
        }
      }
    });
    const res = await runner.rec(x, idx.length, W);
    const [, T, C] = res.dims;
    idx.forEach((i, n) => {
      out[i] = ctcDecode(res.data, n * T * C, T, C, charset);
    });
    onBatch?.(Math.min(order.length, b + o.batch));
  }
  return out;
}

// ---------------------------------------------------------------- text

const VOWEL_MARKS = 'ัิีึืฺุู็';
const TONE_MARKS = '่้๊๋์๎';
const NIKHAHIT = 'ํ';
const MARK_RUN = new RegExp(`[${VOWEL_MARKS}${TONE_MARKS}${NIKHAHIT}]{2,}`, 'g');
const PUA: Record<number, number> = {
  0xf700: 0x0e10, 0xf701: 0x0e34, 0xf702: 0x0e35, 0xf703: 0x0e36, 0xf704: 0x0e37,
  0xf705: 0x0e48, 0xf706: 0x0e49, 0xf707: 0x0e4a, 0xf708: 0x0e4b, 0xf709: 0x0e4c,
  0xf70a: 0x0e48, 0xf70b: 0x0e49, 0xf70c: 0x0e4a, 0xf70d: 0x0e4b, 0xf70e: 0x0e4c,
  0xf70f: 0x0e0d, 0xf710: 0x0e31, 0xf711: 0x0e4d, 0xf712: 0x0e47, 0xf713: 0x0e48,
  0xf714: 0x0e49, 0xf715: 0x0e4a, 0xf716: 0x0e4b, 0xf717: 0x0e4c, 0xf718: 0x0e38,
  0xf719: 0x0e39, 0xf71a: 0x0e3a,
};

/** thai_norm.canonical: one code-point spelling for each Thai rendering */
export function thaiCanonical(text: string): string {
  let t = '';
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if ('​‌‍⁠­﻿'.includes(ch)) continue;
    t += cp === 0xa0 ? ' ' : PUA[cp] ? String.fromCodePoint(PUA[cp]) : ch;
  }
  t = t.normalize('NFC');
  t = t.replace(MARK_RUN, (run) => {
    const rank = (c: string) => (VOWEL_MARKS.includes(c) ? 0 : TONE_MARKS.includes(c) ? 1 : 2);
    const sorted = [...run].sort((a, b) => rank(a) - rank(b));
    return sorted.filter((c, i) => i === 0 || sorted[i - 1] !== c).join('');
  });
  t = t.replace(/([่-๋]?)ํ([่-๋]?)า/g, (_m, a: string, b: string) => `${a}${b}ำ`);
  t = t.replaceAll('เเ', 'แ').replaceAll('ำำ', 'ำ');
  t = t.replace(/\r\n?/g, '\n');
  return t
    .split('\n')
    .map((l) => l.replace(/[ \t\f\v]+/g, ' ').trim())
    .join('\n')
    .trim();
}

/** look-alikes a line recognizer cannot tell apart: W glued to Thai is พ, 0 between Thai digits is ๐ */
export function fixScripts(text: string): string {
  return text
    .replace(/(?<![A-Za-z])[Ww](?=\.?[ก-ฮเ-ไ])/g, 'พ')
    .replace(/(?<=[๐-๙])[Oo0]|[Oo0](?=[๐-๙])/g, '๐');
}

const MARKS = new Set('ัิีึืฺุู็่้๊๋์ํ๎');
const LEADING = new Set('เแโใไ');
const isThai = (c: string) => c >= '฀' && c <= '๿';
const isCons = (c: string | undefined) => !!c && c >= 'ก' && c <= 'ฮ';

/** share of Thai characters that break Thai spelling (stray marks, a leading vowel with no consonant) */
export function invalidShare(text: string): number {
  const chars = [...text];
  let thai = 0;
  let bad = 0;
  chars.forEach((ch, i) => {
    if (!isThai(ch)) return;
    thai++;
    const prev = i ? chars[i - 1] : ' ';
    if (MARKS.has(ch) && !(isCons(prev) || (MARKS.has(prev) && i >= 2 && isCons(chars[i - 2])))) bad++;
    else if (LEADING.has(ch) && !isCons(chars[i + 1])) bad++;
  });
  return thai ? bad / thai : 0;
}

// ---------------------------------------------------------------- reading order

const median = (v: number[]) => {
  if (!v.length) return 0;
  const s = [...v].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

function pageSkew(boxes: Quad[]): number {
  const angles: number[] = [];
  for (const b of boxes) {
    const dx = b[1][0] - b[0][0];
    const dy = b[1][1] - b[0][1];
    if (Math.hypot(dx, dy) >= 3 * Math.max(dist(b[0], b[3]), 1)) angles.push((Math.atan2(dy, dx) * 180) / Math.PI);
  }
  return median(angles);
}

function lineHeight(boxes: Quad[]): number {
  const hs = boxes.map((b) => Math.max(dist(b[0], b[3]), 1));
  const lines = boxes.filter((b, i) => dist(b[0], b[1]) >= 2 * hs[i]).map((b) => Math.max(dist(b[0], b[3]), 1));
  return hs.length ? median(lines.length >= 3 ? lines : hs) : 1;
}

/** rows top to bottom (in deskewed coordinates), each left to right */
export function readingOrder(boxes: Quad[]): number[][] {
  if (!boxes.length) return [];
  const a = (-pageSkew(boxes) * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const ext = boxes.map((b) => {
    const xs = b.map((p) => p[0] * cos - p[1] * sin);
    const ys = b.map((p) => p[0] * sin + p[1] * cos);
    return { cx: (Math.min(...xs) + Math.max(...xs)) / 2, cy: (Math.min(...ys) + Math.max(...ys)) / 2 };
  });
  const hmed = lineHeight(boxes);
  const hs = boxes.map((b) => Math.max(dist(b[0], b[3]), 1));
  const tol = 0.5 * hmed;
  const all = boxes.map((_, i) => i);
  let full = all.filter((i) => hs[i] >= 0.6 * hmed);
  if (!full.length) full = all;
  const fullSet = new Set(full);
  const small = all.filter((i) => !fullSet.has(i));
  const rows: number[][] = [];
  const meanY = (r: number[]) => r.reduce((s, j) => s + ext[j].cy, 0) / r.length;
  for (const i of [...full].sort((p, q) => ext[p].cy - ext[q].cy)) {
    const last = rows[rows.length - 1];
    if (last && Math.abs(ext[i].cy - meanY(last)) <= tol) last.push(i);
    else rows.push([i]);
  }
  const centre = rows.map(meanY);
  for (const i of small) {
    const d = centre.map((c) => Math.abs(ext[i].cy - c));
    const m = d.length ? Math.min(...d) : Infinity;
    if (m <= tol + 0.5 * hs[i]) rows[d.indexOf(m)].push(i);
    else {
      rows.push([i]);
      centre.push(ext[i].cy);
    }
  }
  return rows
    .map((r, k) => ({ r, c: centre[k] }))
    .sort((p, q) => p.c - q.c)
    .map(({ r }) => r.sort((p, q) => ext[p].cx - ext[q].cx));
}

// ---------------------------------------------------------------- page

export async function readImage(
  input: RgbaImage,
  runner: OcrRunner,
  charset: string[],
  options: Partial<OcrOptions> = {},
): Promise<OcrResult> {
  const o = { ...DEFAULT_OCR_OPTIONS, ...options };
  const { img, scale } = limitSize(input, o.maxInputSide);
  o.onProgress?.(0.05);
  let boxes = await detectLines(img, runner, o);
  if (!boxes.length && img.height <= 200 && img.width >= 1.5 * img.height) {
    // a single-line image: read it whole
    const w = img.width - 1;
    const h = img.height - 1;
    boxes = [[[0, 0], [w, 0], [w, h], [0, h]]];
  }
  o.onProgress?.(0.4);
  // Tall boxes are single stacked characters or turned text; read as cut.
  const crops = boxes.map((b) => cropLineGray(img, b));
  const rec = await recognizeLines(crops, runner, charset, o, (done) => o.onProgress?.(0.4 + (0.6 * done) / crops.length));
  const rows = readingOrder(boxes);
  const lines: OcrLine[] = [];
  const rowTexts: string[] = [];
  for (const r of rows) {
    const parts: string[] = [];
    for (const i of r) {
      const text = fixScripts(thaiCanonical(rec[i].text));
      const conf = rec[i].conf;
      if (!text || conf < o.dropBelow || text.replace(/ /g, '').length < o.minChars) continue;
      if (conf < o.junkBelow && invalidShare(text) > o.junkInvalid) continue;
      parts.push(text);
      lines.push({
        text,
        confidence: Math.round(conf * 10000) / 10000,
        box: boxes[i].map((p) => [p[0] / scale, p[1] / scale]) as Quad,
      });
    }
    if (parts.length) rowTexts.push(parts.join(' '));
  }
  o.onProgress?.(1);
  return { text: rowTexts.join('\n'), lines };
}
