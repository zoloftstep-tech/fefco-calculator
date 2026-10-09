import { rotZ, type Vec3 } from "@/lib/math";

export const VIEW_W = 900;
export const VIEW_H = 520;

const PROJ_A = 0.86;
const PROJ_B = 0.75;
const PROJ_C = 0.4;
const PROJ_D = -0.45;

export function depthOf(p: Vec3) {
  return 0.75 * p[0] - 0.86 * p[1] + 0.687 * p[2];
}

function project(p: Vec3): [number, number] {
  return [PROJ_A * p[0] + PROJ_B * p[1], PROJ_C * p[0] + PROJ_D * p[1] - p[2]];
}

export type Fit = {
  toScreen: (p: Vec3, yaw: number) => [number, number];
  depth: (p: Vec3, yaw: number) => number;
  /** Screen pixels of a 1 mm world length along X at the current fit. */
  pxPerMm: number;
};

const YAWS = [0, 0.8, 1.6, 2.4, 3.2, 4, 4.8, 5.6];

export function fitPoints(
  clouds: Vec3[][],
  cx: number,
  cy: number,
  width = VIEW_W,
  height = VIEW_H,
  padding = 36,
): Fit {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const yaw of YAWS) {
    for (const cloud of clouds) {
      for (const point of cloud) {
        const [x, y] = project(rotZ(point, yaw, cx, cy));
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }

  const spanX = Math.max(maxX - minX, 1);
  const spanY = Math.max(maxY - minY, 1);
  const scale = Math.min((width - padding * 2) / spanX, (height - padding * 2) / spanY);
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;

  return {
    pxPerMm: scale,
    toScreen: (p, yaw) => {
      const [x, y] = project(rotZ(p, yaw, cx, cy));
      return [width / 2 + (x - midX) * scale, height / 2 + (y - midY) * scale];
    },
    depth: (p, yaw) => depthOf(rotZ(p, yaw, cx, cy)),
  };
}
