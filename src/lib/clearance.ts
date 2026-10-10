import type { Vec3 } from "@/lib/math";

export function inwardLeft(point: Vec3) {
  return point[0];
}

export function inwardRight(length: number) {
  return (point: Vec3) => length - point[0];
}

function limits(points: Vec3[], inward: (point: Vec3) => number) {
  let minIn = Infinity;
  let maxIn = -Infinity;
  let minZ = Infinity;
  let maxY = -Infinity;
  for (const point of points) {
    const inn = inward(point);
    minIn = Math.min(minIn, inn);
    maxIn = Math.max(maxIn, inn);
    minZ = Math.min(minZ, point[2]);
    maxY = Math.max(maxY, point[1]);
  }
  return { minIn, maxIn, minZ, maxY };
}

const ease = (u: number) => u * u * (3 - 2 * u);

/**
 * Lid-style ear: while it still crosses the end, hold it above the rim.
 * Once it is inboard of the inner wall, lower it into the box.
 */
export function dropInside(
  points: Vec3[],
  height: number,
  clearIn: number,
  inward: (point: Vec3) => number,
): Vec3 {
  const { minIn, minZ } = limits(points, inward);
  const lift = Math.max(0, height + 0.8 - minZ);
  if (minIn <= clearIn) return [0, 0, lift] as Vec3;
  const u = Math.min(1, (minIn - clearIn) / 0.85);
  return [0, 0, lift * (1 - ease(u))] as Vec3;
}

/**
 * Pocket ear: while the panel still straddles the outer wall, park it in
 * front of the box (open air). As soon as its X is inside the gap, ease
 * that offset so it slides into the pocket instead of through the board.
 */
export function slideIntoPocket(
  points: Vec3[],
  rollIn: number,
  inward: (point: Vec3) => number,
): Vec3 {
  const { minIn, maxIn, maxY } = limits(points, inward);
  const inGap = minIn > 0.4 && maxIn < rollIn - 0.35;
  const push = Math.max(0, maxY + 0.45);
  if (!inGap) {
    const straddles = minIn < 0.45 && maxIn > -0.35;
    return (straddles && push > 0 ? [0, -push, 0] : [0, 0, 0]) as Vec3;
  }
  if (minIn >= 1.35) return [0, 0, 0];
  const u = Math.min(1, (minIn - 0.4) / 0.95);
  return [0, -push * (1 - ease(u)), 0] as Vec3;
}
