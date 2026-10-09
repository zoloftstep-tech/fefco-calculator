export type Vec3 = [number, number, number];
export type Pt = [number, number];

export function vadd(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function rotX(p: Vec3, rad: number): Vec3 {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c];
}

export function rotY(p: Vec3, rad: number): Vec3 {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c];
}

export function rotZ(p: Vec3, rad: number, cx: number, cy: number): Vec3 {
  const dx = p[0] - cx;
  const dy = p[1] - cy;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return [cx + dx * c - dy * s, cy + dx * s + dy * c, p[2]];
}

/** 0 at the start of the window, 1 at the end, smooth in between. */
export function phase(
  t: number,
  start: number,
  end: number,
  from: number,
  to: number,
) {
  const u =
    t <= start ? 0 : t >= end ? 1 : (t - start) / Math.max(end - start, 1e-6);
  const s = u * u * (3 - 2 * u);
  return from + (to - from) * s;
}

export function polygonArea(points: Pt[]) {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a[0] * b[1] - b[0] * a[1];
  }
  return Math.abs(sum) / 2;
}

export function centroid(points: Pt[]): Pt {
  let x = 0;
  let y = 0;
  for (const p of points) {
    x += p[0];
    y += p[1];
  }
  return [x / points.length, y / points.length];
}

const numberFormat = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 1,
});

export function fmt(n: number) {
  return numberFormat.format(n);
}

export function fmtArea(mm2: number) {
  return (mm2 / 1e6).toLocaleString("ru-RU", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
}
