import { phase, type PanelDef } from "@/lib/fold";
import type { Pt, Vec3 } from "@/lib/math";
import type { Dims } from "@/lib/fefco-types";
import { resolveBoard } from "@/lib/params/board";
import { buildToeEnds, TOE_LUG_FOLD } from "@/lib/boxes/parts/toe";
import { dropInside, inwardLeft, inwardRight, slideIntoPocket } from "@/lib/clearance";

/**
 * FEFCO 0470 — wrap / self-locking tray with hinged lid (Essential Image).
 * Catalog: TOE ends with double crease + floor slots; interior bottom flaps;
 * lid wings into end pockets; front lip pocket + tongue.
 */
export function wrapMetrics(d: Dims) {
  const { L, W, H, T, tuckClearance, bridge, slotKerf } = resolveBoard(d);
  const ear = Math.min(H * 0.92, W * 0.46, L * 0.46);
  const lip = Math.max(14, Math.min(H * 0.48, W * 0.7));
  const wing = Math.min(H * 0.95, W * 0.98);
  const frontFlap = Math.max(16, Math.min(H * 0.4, 46));
  const tongue = Math.min(20, Math.max(12, H * 0.2)) + tuckClearance * 0.25;
  const tongueW = Math.min(L * 0.28, 90) + tuckClearance;
  /** Catalog interior bottom flap depth. */
  const bottomFlap = Math.min(H * 0.35, W * 0.22, 28);
  const lug = Math.max(10, Math.min(16, H * 0.18 + T));
  const inner = Math.max(8, H - lug);
  return {
    ear,
    lip,
    wing,
    frontFlap,
    tongue,
    tongueW,
    bottomFlap,
    lug,
    inner,
    bridge,
    T,
    tuckClearance,
    slotKerf,
    slotDepth: Math.max(6, slotKerf * 2.2 + T),
  };
}

function sideEar(height: number, depth: number, dir: 1 | -1): Pt[] {
  const margin = Math.max(2, height * 0.08);
  return [
    [0, dir * margin],
    [0, dir * (height - margin)],
    [-depth, dir * (height - margin * 1.4)],
    [-depth * 0.72, dir * margin * 1.6],
  ];
}

export function wrapPanels(d: Dims): PanelDef[] {
  const { L, W, H } = d;
  const m = wrapMetrics(d);
  // Ends and lip pocket first. Wings bend, the lid drops while they are still
  // outside, then they slide into the end gap. The flap stays in front of the
  // wall; the tongue follows into the lip.
  const ends = (t: number) => phase(t, 0.02, 0.14, 0, 90);
  const bridges = (t: number) => phase(t, 0.08, 0.18, 0, 90);
  const rolls = (t: number) => phase(t, 0.16, 0.26, 0, 90);
  const lugs = (t: number) => phase(t, 0.24, 0.34, 0, TOE_LUG_FOLD);
  const bottoms = (t: number) => phase(t, 0.12, 0.24, 0, 90);
  const front = (t: number) => phase(t, 0.06, 0.18, 0, 90);
  const frontEars = (t: number) => phase(t, 0.16, 0.28, 0, 90);
  const lip = (t: number) => phase(t, 0.28, 0.42, 0, 172);
  const back = (t: number) => phase(t, 0.06, 0.18, 0, 90);
  const backEars = (t: number) => phase(t, 0.16, 0.28, 0, 90);
  const lid = (t: number) => phase(t, 0.54, 0.66, 0, 90);
  const wings = (t: number) => (t <= 0.66 ? phase(t, 0.4, 0.52, 0, 50) : phase(t, 0.66, 0.8, 50, 90));
  const lidFront = (t: number) => phase(t, 0.78, 0.9, 0, 90);
  const tongue = (t: number) => phase(t, 0.9, 1, 0, 158);
  const rollIn = m.bridge + 0.2;
  const frontGap = -Math.max(1.6, m.T * 1.1);
  const wingRide = (inward: (point: Vec3) => number) => (t: number, points: Vec3[]) => {
    if (t < 0.4) return [0, 0, 0] as Vec3;
    if (t < 0.66) return dropInside(points, H, 1e6, inward);
    return slideIntoPocket(points, rollIn, inward);
  };

  const notch = m.tongueW * 0.55;
  const lipPoly: Pt[] = [
    [0, 0],
    [L, 0],
    [L, -m.lip],
    [(L + notch) / 2, -m.lip],
    [(L + notch) / 2, -m.lip + Math.min(8, m.lip * 0.35)],
    [(L - notch) / 2, -m.lip + Math.min(8, m.lip * 0.35)],
    [(L - notch) / 2, -m.lip],
    [0, -m.lip],
  ];

  return [
    {
      id: "floor",
      name: "Дно",
      parent: null,
      hinge: [0, 0, 0],
      axis: "x",
      sign: 1,
      angle: () => 0,
      poly: [
        [0, 0],
        [L, 0],
        [L, W],
        [0, W],
      ],
      fill: "floor",
      tone: "floor",
      stack: -2,
      netLabel: "Дно",
    },
    {
      id: "front",
      name: "Передняя стенка",
      parent: "floor",
      hinge: [0, 0, 0],
      axis: "x",
      sign: -1,
      angle: front,
      poly: [
        [0, 0],
        [L, 0],
        [L, -H],
        [0, -H],
      ],
      fill: "front",
      tone: "body",
      stack: 0,
      netLabel: "Перед",
    },
    {
      id: "front-lip",
      name: "Внутренняя кромка",
      parent: "front",
      hinge: [0, -H, 0],
      axis: "x",
      sign: -1,
      angle: lip,
      poly: lipPoly,
      fill: "lock",
      tone: "lock",
      stack: 0,
      lift: -m.T * 0.55,
      netLabel: "Кромка",
    },
    {
      id: "back",
      name: "Задняя стенка",
      parent: "floor",
      hinge: [0, W, 0],
      axis: "x",
      sign: 1,
      angle: back,
      poly: [
        [0, 0],
        [L, 0],
        [L, H],
        [0, H],
      ],
      fill: "back",
      tone: "body",
      stack: 0,
      netLabel: "Зад",
    },
    ...buildToeEnds({
      span: W,
      height: H,
      bridge: m.bridge,
      inner: m.inner,
      lug: m.lug,
      slotDepth: m.slotDepth,
      lugCount: W < 120 ? 1 : 2,
      slotX: (side) => (side === "left" ? 3.2 : L - 3.2 - m.slotDepth),
      endsAngle: ends,
      bridgeAngle: bridges,
      rollAngle: rolls,
      lugAngle: lugs,
      left: { id: "left", hinge: [0, 0, 0], sign: 1, dir: -1 },
      right: { id: "right", hinge: [L, 0, 0], sign: -1, dir: 1 },
      lift: m.T * 0.2,
    }),
    /** Catalog interior bottom flaps on the end walls (C panels). */
    {
      id: "bot-l",
      name: "Внутренний клапан дна",
      parent: "left",
      hinge: [0, 0, 0],
      axis: "y",
      sign: 1,
      angle: bottoms,
      poly: [
        [0, W * 0.08],
        [0, W * 0.92],
        [-m.bottomFlap, W * 0.85],
        [-m.bottomFlap, W * 0.15],
      ],
      fill: "flap",
      tone: "flap",
      stack: 0,
      lift: -m.T * 0.3,
      netLabel: "Дно",
    },
    {
      id: "bot-r",
      name: "Внутренний клапан дна",
      parent: "right",
      hinge: [0, 0, 0],
      axis: "y",
      sign: -1,
      angle: bottoms,
      poly: [
        [0, W * 0.08],
        [0, W * 0.92],
        [m.bottomFlap, W * 0.85],
        [m.bottomFlap, W * 0.15],
      ],
      fill: "flap",
      tone: "flap",
      stack: 0,
      lift: -m.T * 0.3,
      netLabel: "Дно",
    },
    ear("ear-lf", "Переднее ушко", "front", [0, 0, 0], "y", 1, sideEar(H, m.ear, -1), frontEars, m.T * 0.4),
    ear("ear-rf", "Переднее ушко", "front", [L, 0, 0], "y", -1, sideEar(H, m.ear, -1).map(([x, y]) => [-x, y]), frontEars, m.T * 0.4),
    ear("ear-lb", "Заднее ушко", "back", [0, 0, 0], "y", 1, sideEar(H, m.ear, 1), backEars, m.T * 0.4),
    ear("ear-rb", "Заднее ушко", "back", [L, 0, 0], "y", -1, sideEar(H, m.ear, 1).map(([x, y]) => [-x, y]), backEars, m.T * 0.4),
    {
      id: "lid",
      name: "Крышка",
      parent: "back",
      hinge: [0, H, 0],
      axis: "x",
      sign: 1,
      angle: lid,
      poly: [
        [0, 0],
        [L, 0],
        [L, W],
        [0, W],
      ],
      fill: "lid",
      tone: "lid",
      stack: 0,
      lift: -m.T * 0.3,
      netLabel: "Крышка",
    },
    ear("wing-l", "Крыло крышки", "lid", [0, 0, 0], "y", 1, wingPoly(W, m.wing, -1), wings, Math.max(1.3, m.T * 0.9), wingRide(inwardLeft)),
    ear("wing-r", "Крыло крышки", "lid", [L, 0, 0], "y", -1, wingPoly(W, m.wing, 1), wings, Math.max(1.3, m.T * 0.9), wingRide(inwardRight(L))),
    {
      id: "lid-front",
      name: "Клапан крышки",
      parent: "lid",
      hinge: [0, W, 0],
      axis: "x",
      sign: 1,
      angle: lidFront,
      poly: [
        [m.ear * 0.15, 0],
        [L - m.ear * 0.15, 0],
        [L - m.ear * 0.15, m.frontFlap],
        [m.ear * 0.15, m.frontFlap],
      ],
      fill: "flap",
      tone: "flap",
      stack: 0,
      lift: frontGap,
      netLabel: "Клапан",
    },
    {
      id: "tongue",
      name: "Язычок",
      parent: "lid-front",
      hinge: [0, m.frontFlap, 0],
      axis: "x",
      sign: 1,
      angle: tongue,
      poly: [
        [(L - m.tongueW) / 2, 0],
        [(L + m.tongueW) / 2, 0],
        [(L + m.tongueW) / 2 - 3, m.tongue],
        [(L - m.tongueW) / 2 + 3, m.tongue],
      ],
      fill: "tuck",
      tone: "flap",
      stack: 0,
      lift: m.T * 1.45,
      netLabel: "Язычок",
    },
  ];
}

function ear(
  id: string,
  name: string,
  parent: string,
  hinge: [number, number, number],
  axis: "x" | "y",
  sign: 1 | -1,
  poly: Pt[],
  angle: (t: number) => number,
  lift = 0,
  ride?: PanelDef["ride"],
): PanelDef {
  return {
    id,
    name,
    parent,
    hinge,
    axis,
    sign,
    angle,
    poly,
    fill: "flap",
    tone: "flap",
    stack: 0,
    lift,
    ride,
  };
}

function wingPoly(span: number, depth: number, dir: 1 | -1): Pt[] {
  const hinge = span * 0.08;
  const tip = span * 0.22;
  return [
    [0, hinge],
    [0, span - hinge],
    [dir * depth, span - tip],
    [dir * depth, tip],
  ];
}
