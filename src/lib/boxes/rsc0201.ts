import type { Pt, Vec3 } from "@/lib/math";
import { polygonArea } from "@/lib/math";
import type { NetModel, PanelTone, WorldFace } from "@/lib/fold";
import type { Dims } from "@/lib/fefco-types";

const MAX_ANGLE = 135;
const HALF = MAX_ANGLE / 2;

export function flapAngles(slider: number) {
  const t = Math.max(0, Math.min(MAX_ANGLE, slider));
  const small = MAX_ANGLE * (1 - Math.min(t / HALF, 1));
  const big = MAX_ANGLE * (1 - Math.max(0, Math.min((t - HALF) / HALF, 1)));
  return { small, big };
}

export function flapPosition(slider: number) {
  const t = Math.max(0, Math.min(MAX_ANGLE, slider));
  if (t < HALF) return 1;
  if (t < MAX_ANGLE) return 2;
  return 3;
}

function yawMode(yawRad: number) {
  let deg = ((yawRad * 180) / Math.PI) % 360;
  if (deg < 0) deg += 360;
  if (deg >= 312 || deg < 131) return "A";
  if (deg < 221) return "B";
  return "C";
}

/** Higher rank draws later. Closed box: big flaps stay above small ones. */
export function flapRanks(position: number, yawRad: number) {
  if (position === 1) {
    const mode = yawMode(yawRad);
    if (mode === "A") return { DB: 3, MB: 2, MD: 1, DD: 0 };
    if (mode === "B") return { DD: 3, MB: 2, MD: 1, DB: 0 };
    return { DD: 3, MD: 2, MB: 1, DB: 0 };
  }
  return { DB: 3, DD: 2, MD: 1, MB: 0 };
}

function face(
  id: string,
  name: string,
  points: Vec3[],
  fill: WorldFace["fill"],
  stack: number,
): WorldFace {
  return { id, name, points, fill, stack };
}

export function rscFaces(d: Dims, t: number, yaw: number): WorldFace[] {
  const { L, W, H } = d;
  const slider = Math.max(0, Math.min(1, t)) * MAX_ANGLE;
  const { small, big } = flapAngles(slider);
  const ranks = flapRanks(flapPosition(slider), yaw);
  const f = W / 2;
  const hShort = H - Math.min(H * 0.008, 1);
  const smallRad = (small * Math.PI) / 180;
  const bigRad = (big * Math.PI) / 180;
  const cs = Math.cos(smallRad);
  const ss = Math.sin(smallRad);
  const cb = Math.cos(bigRad);
  const sb = Math.sin(bigRad);

  const frontFlap: Vec3[] = [
    [0, 0, H],
    [L, 0, H],
    [L, f * cb, H + f * sb],
    [0, f * cb, H + f * sb],
  ];
  const backFlap: Vec3[] = [
    [L, W, H],
    [0, W, H],
    [0, W - f * cb, H + f * sb],
    [L, W - f * cb, H + f * sb],
  ];
  const leftFlap: Vec3[] = [
    [0, W, hShort],
    [0, 0, hShort],
    [f * cs, 0, hShort + f * ss],
    [f * cs, W, hShort + f * ss],
  ];
  const rightFlap: Vec3[] = [
    [L, 0, hShort],
    [L, W, hShort],
    [L - f * cs, W, hShort + f * ss],
    [L - f * cs, 0, hShort + f * ss],
  ];

  return [
    face("floor-a", "Дно", [[0, 0, 0], [L, 0, 0], [L, W / 2, 0], [0, W / 2, 0]], "floor", -1),
    face("floor-b", "Дно", [[0, W / 2, 0], [L, W / 2, 0], [L, W, 0], [0, W, 0]], "floor", -1),
    face("back", "Задняя стенка", [[0, W, 0], [L, W, 0], [L, W, H], [0, W, H]], "back", 0),
    face("left", "Левая стенка", [[0, 0, 0], [0, W, 0], [0, W, H], [0, 0, H]], "side", 0),
    face("front", "Передняя стенка", [[0, 0, 0], [L, 0, 0], [L, 0, H], [0, 0, H]], "front", 0),
    face("right", "Правая стенка", [[L, 0, 0], [L, W, 0], [L, W, H], [L, 0, H]], "side", 0),
    face("flap-front", "Длинный ближний клапан", frontFlap, "flap", ranks.DB + 1),
    face("flap-back", "Длинный дальний клапан", backFlap, "flapDark", ranks.DD + 1),
    face("flap-right", "Малый ближний клапан", rightFlap, "flapDark", ranks.MB + 1),
    face("flap-left", "Малый дальний клапан", leftFlap, "flap", ranks.MD + 1),
  ];
}

export function rscNet(d: Dims): NetModel {
  const { L, W, H, G } = d;
  const f = W / 2;
  const width = 2 * (L + W) + G;
  const height = H + W;
  const panels: NetModel["panels"] = [];
  const cuts: [Pt, Pt][] = [];
  const folds: [Pt, Pt][] = [];
  const sizes = [L, W, L, W];
  const names = ["Д", "Ш", "Д", "Ш"];

  const rect = (x: number, y: number, w: number, h: number, tone: PanelTone, label?: string) => {
    panels.push({
      points: [
        [x, y],
        [x + w, y],
        [x + w, y + h],
        [x, y + h],
      ],
      tone,
      label,
    });
  };

  let x = G;
  sizes.forEach((w, i) => {
    rect(x, f, w, H, "body", names[i]);
    rect(x, 0, w, f, "flap");
    rect(x, f + H, w, f, "flap");
    folds.push([
      [x, f],
      [x + w, f],
    ]);
    folds.push([
      [x, f + H],
      [x + w, f + H],
    ]);
    if (i < 3) {
      cuts.push([
        [x + w, 0],
        [x + w, f],
      ]);
      folds.push([
        [x + w, f],
        [x + w, f + H],
      ]);
      cuts.push([
        [x + w, f + H],
        [x + w, height],
      ]);
    }
    x += w;
  });

  cuts.push([
    [G, 0],
    [width, 0],
  ]);
  cuts.push([
    [G, height],
    [width, height],
  ]);
  cuts.push([
    [width, 0],
    [width, height],
  ]);

  if (G > 0) {
    const bevel = Math.min(G * 0.3, H * 0.15);
    const p: Pt[] = [
      [G, f],
      [0, f + bevel],
      [0, f + H - bevel],
      [G, f + H],
    ];
    panels.push({ points: p, tone: "glue", label: "клей" });
    for (let i = 0; i < 3; i++) cuts.push([p[i], p[i + 1]]);
    folds.push([
      [G, f],
      [G, f + H],
    ]);
    cuts.push([
      [G, 0],
      [G, f],
    ]);
    cuts.push([
      [G, f + H],
      [G, height],
    ]);
  } else {
    cuts.push([
      [0, 0],
      [0, height],
    ]);
  }

  return {
    width,
    height,
    area: panels.reduce((sum, panel) => sum + polygonArea(panel.points), 0),
    panels,
    cuts,
    folds,
  };
}
