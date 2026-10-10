import { phase, type PanelDef } from "@/lib/fold";
import type { Pt } from "@/lib/math";
import type { Dims } from "@/lib/fefco-types";
import { resolveBoard } from "@/lib/params/board";
import { buildToeEnds, toeLugSpans } from "@/lib/boxes/parts/toe";

const BRIDGE_FOLD = 90;
const ROLL_FOLD = 90;

export function mailerMetrics(d: Dims) {
  const board = resolveBoard(d);
  const { H, W, T, bridge, tuckClearance, slotKerf } = board;
  /** Catalog TD ≈ board-linked lug depth. */
  const lug = Math.max(12, Math.min(18, H * 0.2 + T));
  /** Catalog tuck ≈ full front height with clearance. */
  const tuck = Math.min(H * 0.95, Math.max(20, H * 0.85)) + tuckClearance * 0.2;
  /** Catalog lid tuck-in ears ≈ H (TIR1). */
  const ear = Math.min(H * 0.98, W * 0.5);
  /** Tapered front/back inset (catalog DXT-style shoulders). */
  const inset = Math.max(8, H * 0.12, T * 2.5);
  const dust = Math.min(H * 0.42, W * 0.22, 36);
  const roll = Math.max(8, H - lug);
  const notch = Math.min(28, Math.max(14, W * 0.12));
  return {
    lug,
    tuck,
    ear,
    inset,
    dust,
    roll,
    bridge,
    T,
    tuckClearance,
    slotKerf,
    notch,
    slotDepth: Math.max(6, slotKerf * 2.4 + T),
    lugCount: W < 101 ? 1 : 2,
  };
}

/** @deprecated use toeLugSpans — kept for fefco warnings / flapNote callers */
export function lugSpans(span: number): [number, number][] {
  return toeLugSpans(span, span < 101 ? 1 : 2);
}

/** Catalog trapezoid with rounded outer corners (lid / tuck-in ears). */
function earPoly(span: number, depth: number, dir: 1 | -1): Pt[] {
  const hinge = span * 0.06;
  const tip = span * 0.2;
  const r = Math.min(depth * 0.22, span * 0.08);
  return [
    [0, hinge],
    [0, span - hinge],
    [dir * (depth - r), span - tip],
    [dir * depth, span - tip - r],
    [dir * depth, tip + r],
    [dir * (depth - r), tip],
  ];
}

function dustPoly(height: number, depth: number, dir: 1 | -1, up: 1 | -1): Pt[] {
  const gap = Math.max(3, height * 0.1);
  return [
    [0, up * gap],
    [0, up * (height - gap)],
    [dir * depth, up * (height - gap * 1.5)],
    [dir * depth * 0.82, up * gap * 1.5],
  ];
}

/** Full-height tuck with catalog thumb notch (semi-circle cut). */
function tuckPoly(length: number, depth: number, side: number, notch: number): Pt[] {
  const nx0 = (length - notch) / 2;
  const nx1 = (length + notch) / 2;
  const ny = Math.min(depth * 0.42, notch * 0.55);
  return [
    [side, 0],
    [length - side, 0],
    [length - side, depth],
    [nx1, depth],
    [nx1 - notch * 0.08, depth - ny * 0.55],
    [(length) / 2, depth - ny],
    [nx0 + notch * 0.08, depth - ny * 0.55],
    [nx0, depth],
    [side, depth],
  ];
}

function tuckEarPoly(depth: number, reach: number, dir: 1 | -1): Pt[] {
  const y0 = Math.max(2, depth * 0.08);
  const y1 = depth * 0.9;
  const inset = (y1 - y0) * 0.18;
  const r = Math.min(reach * 0.2, depth * 0.12);
  return [
    [0, y0],
    [0, y1],
    [dir * (reach - r), y1 - inset],
    [dir * reach, y1 - inset - r],
    [dir * reach, y0 + inset + r],
    [dir * (reach - r), y0 + inset],
  ];
}

/** Tapered front/back wall matching catalog shoulders. */
function taperedWall(length: number, height: number, inset: number, dir: 1 | -1): Pt[] {
  const tip = inset * 0.55;
  return [
    [inset, 0],
    [length - inset, 0],
    [length - tip, dir * height],
    [tip, dir * height],
  ];
}

export function mailerPanels(d: Dims): PanelDef[] {
  const { L, W, H } = d;
  const m = mailerMetrics(d);
  const { lug, tuck, ear, inset, dust, roll, bridge, T, notch, slotDepth, lugCount } = m;

  const walls = (t: number) => phase(t, 0.02, 0.1, 0, 90);
  const dusts = (t: number) => phase(t, 0.08, 0.16, 0, 90);
  const ends = (t: number) => phase(t, 0.14, 0.24, 0, 90);
  const bridges = (t: number) => phase(t, 0.2, 0.3, 0, BRIDGE_FOLD);
  const rolls = (t: number) => phase(t, 0.28, 0.38, 0, ROLL_FOLD);
  const lugs = (t: number) => phase(t, 0.36, 0.44, 0, 88);
  const lid = (t: number) => phase(t, 0.56, 0.68, 0, 90);
  const ears = (t: number) => (t <= 0.68 ? phase(t, 0.44, 0.56, 0, 48) : phase(t, 0.68, 0.8, 48, 100));
  const tuckAngle = (t: number) => phase(t, 0.86, 0.94, 0, 104);
  const flapEars = (t: number) => (t <= 0.94 ? phase(t, 0.78, 0.86, 0, 42) : phase(t, 0.94, 1, 42, 94));
  const side = Math.max(0, T * 0.5);

  const panels: PanelDef[] = [
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
      angle: walls,
      poly: taperedWall(L, H, inset, -1),
      fill: "front",
      tone: "body",
      stack: 0,
      netLabel: "Перед",
    },
    dustFlap("dust-fl", "Переднее ушко", "front", [inset, 0, 0], 1, dustPoly(H, dust, -1, -1), dusts, T * 0.4),
    dustFlap("dust-fr", "Переднее ушко", "front", [L - inset, 0, 0], -1, dustPoly(H, dust, 1, -1), dusts, T * 0.4),
    {
      id: "back",
      name: "Задняя стенка",
      parent: "floor",
      hinge: [0, W, 0],
      axis: "x",
      sign: 1,
      angle: walls,
      poly: taperedWall(L, H, inset, 1),
      fill: "back",
      tone: "body",
      stack: 0,
      netLabel: "Зад",
    },
    dustFlap("dust-bl", "Заднее ушко", "back", [inset, 0, 0], 1, dustPoly(H, dust, -1, 1), dusts, T * 0.4),
    dustFlap("dust-br", "Заднее ушко", "back", [L - inset, 0, 0], -1, dustPoly(H, dust, 1, 1), dusts, T * 0.4),
    ...buildToeEnds({
      span: W,
      height: H,
      bridge,
      inner: roll,
      lug,
      slotDepth,
      lugCount,
      slotX: (sideKey) => (sideKey === "left" ? 3.2 : L - 3.2 - slotDepth),
      endsAngle: ends,
      bridgeAngle: bridges,
      rollAngle: rolls,
      lugAngle: lugs,
      left: { id: "left", hinge: [0, 0, 0], sign: 1, dir: -1 },
      right: { id: "right", hinge: [L, 0, 0], sign: -1, dir: 1 },
      lift: T * 0.25,
    }),
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
      lift: -T * 0.35,
      netLabel: "Крышка",
    },
    {
      id: "ear-l",
      name: "Левое ушко крышки",
      parent: "lid",
      hinge: [0, 0, 0],
      axis: "y",
      sign: 1,
      angle: ears,
      poly: earPoly(W, ear, -1),
      fill: "flap",
      tone: "flap",
      stack: 0,
      lift: T * 0.55,
      netLabel: "Ушко",
    },
    {
      id: "ear-r",
      name: "Правое ушко крышки",
      parent: "lid",
      hinge: [L, 0, 0],
      axis: "y",
      sign: -1,
      angle: ears,
      poly: earPoly(W, ear, 1),
      fill: "flap",
      tone: "flap",
      stack: 0,
      lift: T * 0.55,
      netLabel: "Ушко",
    },
    {
      id: "tuck",
      name: "Клапан крышки",
      parent: "lid",
      hinge: [0, W, 0],
      axis: "x",
      sign: 1,
      angle: tuckAngle,
      poly: tuckPoly(L, tuck, side, notch),
      fill: "tuck",
      tone: "flap",
      stack: 0,
      lift: T * 0.9,
      netLabel: "Клапан",
    },
    {
      id: "tuck-ear-l",
      name: "Левое ушко клапана",
      parent: "tuck",
      hinge: [side, 0, 0],
      axis: "y",
      sign: 1,
      angle: flapEars,
      poly: tuckEarPoly(tuck, Math.min(H * 0.55, W * 0.28), -1),
      fill: "flap",
      tone: "flap",
      stack: 0,
      lift: T * 0.85,
      netLabel: "Ушко",
    },
    {
      id: "tuck-ear-r",
      name: "Правое ушко клапана",
      parent: "tuck",
      hinge: [L - side, 0, 0],
      axis: "y",
      sign: -1,
      angle: flapEars,
      poly: tuckEarPoly(tuck, Math.min(H * 0.55, W * 0.28), 1),
      fill: "flap",
      tone: "flap",
      stack: 0,
      lift: T * 0.85,
      netLabel: "Ушко",
    },
  ];

  return panels;
}

function dustFlap(
  id: string,
  name: string,
  parent: string,
  hinge: [number, number, number],
  sign: 1 | -1,
  poly: Pt[],
  angle: (t: number) => number,
  lift = 0,
): PanelDef {
  return {
    id,
    name,
    parent,
    hinge,
    axis: "y",
    sign,
    angle,
    poly,
    fill: "flap",
    tone: "flap",
    stack: 0,
    lift,
    netLabel: "Ушко",
  };
}
