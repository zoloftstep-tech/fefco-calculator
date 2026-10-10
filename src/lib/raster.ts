import type { FaceFill, WorldFace } from "@/lib/fold";
import type { Vec3 } from "@/lib/math";
import { VIEW_H, VIEW_W, type Fit } from "@/lib/project";

const BASE: Record<FaceFill, [number, number, number]> = {
  floor: [213, 221, 216],
  front: [236, 242, 238],
  side: [190, 202, 196],
  back: [168, 180, 174],
  flap: [228, 235, 231],
  flapDark: [206, 216, 211],
  lock: [186, 198, 192],
  lid: [232, 239, 235],
  tuck: [176, 188, 182],
  slot: [36, 49, 44],
};

const LIGHT: Vec3 = [0.22, -0.48, 0.85];

type V = { x: number; y: number; z: number };

function normalOf(points: Vec3[]): Vec3 {
  let x = 0;
  let y = 0;
  let z = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    x += (a[1] - b[1]) * (a[2] + b[2]);
    y += (a[2] - b[2]) * (a[0] + b[0]);
    z += (a[0] - b[0]) * (a[1] + b[1]);
  }
  const len = Math.hypot(x, y, z) || 1;
  return [x / len, y / len, z / len];
}

function shade(fill: FaceFill, points: Vec3[]): [number, number, number] {
  const base = BASE[fill];
  if (fill === "slot") return base;
  const n = normalOf(points);
  const nd = Math.abs(n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]);
  const f = 0.56 + 0.44 * nd;
  return [
    Math.min(255, Math.round(base[0] * f)),
    Math.min(255, Math.round(base[1] * f)),
    Math.min(255, Math.round(base[2] * f)),
  ];
}

function cross(ax: number, ay: number, bx: number, by: number, cx: number, cy: number) {
  return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
}

function triangulate(poly: V[]): [number, number, number][] {
  const n = poly.length;
  if (n < 3) return [];
  if (n === 3) return [[0, 1, 2]];
  let area = 0;
  for (let i = 0; i < n; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % n];
    area += a.x * b.y - b.x * a.y;
  }
  const idx = poly.map((_, i) => i);
  if (area < 0) idx.reverse();
  const tris: [number, number, number][] = [];
  let guard = 0;
  while (idx.length > 3 && guard++ < n * n) {
    let clipped = false;
    for (let i = 0; i < idx.length; i++) {
      const i0 = idx[(i + idx.length - 1) % idx.length];
      const i1 = idx[i];
      const i2 = idx[(i + 1) % idx.length];
      const a = poly[i0];
      const b = poly[i1];
      const c = poly[i2];
      if (cross(a.x, a.y, b.x, b.y, c.x, c.y) <= 0.05) continue;
      let blocked = false;
      for (const k of idx) {
        if (k === i0 || k === i1 || k === i2) continue;
        const p = poly[k];
        const c1 = cross(a.x, a.y, b.x, b.y, p.x, p.y);
        const c2 = cross(b.x, b.y, c.x, c.y, p.x, p.y);
        const c3 = cross(c.x, c.y, a.x, a.y, p.x, p.y);
        if (c1 > 0.05 && c2 > 0.05 && c3 > 0.05) {
          blocked = true;
          break;
        }
      }
      if (blocked) continue;
      tris.push([i0, i1, i2]);
      idx.splice(i, 1);
      clipped = true;
      break;
    }
    if (!clipped) break;
  }
  if (idx.length === 3) tris.push([idx[0], idx[1], idx[2]]);
  return tris;
}

function fillTriangle(
  color: Uint8ClampedArray,
  zbuf: Float32Array,
  w: number,
  h: number,
  v0: V,
  v1: V,
  v2: V,
  rgb: [number, number, number],
) {
  const verts = [v0, v1, v2];
  if (verts[0].y > verts[1].y) [verts[0], verts[1]] = [verts[1], verts[0]];
  if (verts[1].y > verts[2].y) [verts[1], verts[2]] = [verts[2], verts[1]];
  if (verts[0].y > verts[1].y) [verts[0], verts[1]] = [verts[1], verts[0]];
  const [a, b, c] = verts;
  const y0 = Math.max(0, Math.ceil(a.y));
  const y1 = Math.min(h - 1, Math.floor(c.y));
  for (let y = y0; y <= y1; y++) {
    const at = (p: V, q: V) => {
      const dy = q.y - p.y;
      const t = Math.abs(dy) < 1e-6 ? 0 : (y - p.y) / dy;
      return { x: p.x + (q.x - p.x) * t, z: p.z + (q.z - p.z) * t };
    };
    let left = at(a, c);
    let right = y < b.y ? at(a, b) : at(b, c);
    if (left.x > right.x) [left, right] = [right, left];
    const x0 = Math.max(0, Math.floor(left.x));
    const x1 = Math.min(w - 1, Math.ceil(right.x));
    const span = right.x - left.x;
    for (let x = x0; x <= x1; x++) {
      const t = span < 1e-6 ? 0 : (x - left.x) / span;
      const z = left.z + (right.z - left.z) * t;
      const i = y * w + x;
      if (z <= zbuf[i]) continue;
      zbuf[i] = z;
      const o = i * 4;
      color[o] = rgb[0];
      color[o + 1] = rgb[1];
      color[o + 2] = rgb[2];
      color[o + 3] = 255;
    }
  }
}

function drawEdge(
  color: Uint8ClampedArray,
  zbuf: Float32Array,
  w: number,
  h: number,
  a: V,
  b: V,
) {
  const steps = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y), 1);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = Math.round(a.x + (b.x - a.x) * t);
    const y = Math.round(a.y + (b.y - a.y) * t);
    if (x < 0 || y < 0 || x >= w || y >= h) continue;
    const z = a.z + (b.z - a.z) * t + 0.06;
    const p = y * w + x;
    if (z <= zbuf[p]) continue;
    zbuf[p] = z;
    const o = p * 4;
    color[o] = 44;
    color[o + 1] = 58;
    color[o + 2] = 54;
    color[o + 3] = 255;
  }
}

function footOf(faces: WorldFace[]): Vec3[] {
  const near = faces.flatMap((face) => face.points.filter((point) => point[2] > -1 && point[2] < 4));
  if (near.length >= 3) return near;
  return faces.flatMap((face) => {
    let low = Infinity;
    for (const point of face.points) low = Math.min(low, point[2]);
    return face.points.filter((point) => point[2] < low + 1);
  });
}

export function renderPixels(
  w: number,
  h: number,
  faces: WorldFace[],
  fit: Fit,
  yaw: number,
  zoom: number,
  tint?: (id: string) => [number, number, number] | null,
) {
  const scale = Math.min(w / VIEW_W, h / VIEW_H);
  const ox = (w - VIEW_W * scale) / 2;
  const oy = (h - VIEW_H * scale) / 2;
  const project = (point: Vec3): V => {
    const [sx, sy] = fit.toScreen(point, yaw);
    const vx = VIEW_W / 2 + (sx - VIEW_W / 2) * zoom;
    const vy = VIEW_H / 2 + (sy - VIEW_H / 2) * zoom;
    return { x: ox + vx * scale, y: oy + vy * scale, z: fit.depth(point, yaw) };
  };

  const color = new Uint8ClampedArray(w * h * 4);
  const zbuf = new Float32Array(w * h);
  zbuf.fill(-1e9);

  const foot = footOf(faces).map(project);
  if (foot.length >= 3) {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of foot) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
    const cx = (minX + maxX) / 2 + 6 * scale;
    const cy = (minY + maxY) / 2 + 14 * scale;
    const rx = Math.max((maxX - minX) * 0.46, 8);
    const ry = Math.max((maxY - minY) * 0.28, 6);
    const x0 = Math.max(0, Math.floor(cx - rx));
    const x1 = Math.min(w - 1, Math.ceil(cx + rx));
    const y0 = Math.max(0, Math.floor(cy - ry));
    const y1 = Math.min(h - 1, Math.ceil(cy + ry));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const nx = (x - cx) / rx;
        const ny = (y - cy) / ry;
        if (nx * nx + ny * ny > 1) continue;
        const o = (y * w + x) * 4;
        color[o] = 28;
        color[o + 1] = 40;
        color[o + 2] = 36;
        color[o + 3] = 30;
      }
    }
  }

  for (const face of faces) {
    if (face.points.length < 3) continue;
    const poly = face.points.map(project);
    const rgb = tint?.(face.id) ?? shade(face.fill, face.points);
    for (const [i, j, k] of triangulate(poly)) {
      fillTriangle(color, zbuf, w, h, poly[i], poly[j], poly[k], rgb);
    }
  }
  for (const face of faces) {
    if (face.fill === "slot" || face.points.length < 2) continue;
    const poly = face.points.map(project);
    for (let i = 0; i < poly.length; i++) drawEdge(color, zbuf, w, h, poly[i], poly[(i + 1) % poly.length]);
  }

  return color;
}

export function paintModel(
  canvas: HTMLCanvasElement,
  faces: WorldFace[],
  fit: Fit,
  yaw: number,
  zoom: number,
) {
  const rect = canvas.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.round(rect.width * dpr);
  const h = Math.round(rect.height * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;
  const color = renderPixels(w, h, faces, fit, yaw, zoom);
  const image = ctx.createImageData(w, h);
  image.data.set(color);
  ctx.putImageData(image, 0, 0);
}
