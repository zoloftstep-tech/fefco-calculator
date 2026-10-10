import { phase, type PanelDef } from "@/lib/fold";
import type { Pt } from "@/lib/math";
import type { Dims } from "@/lib/fefco-types";
import { resolveBoard } from "@/lib/params/board";
import { buildToeEnds, TOE_LUG_FOLD } from "@/lib/boxes/parts/toe";

/**
 * FEFCO 0471 — wrap with rounded locking lid (Essential Image / Opus catalog decode).
 * Lid side flaps are quarter-disc tuck tongues into end TOE pockets (not side-wall hooks).
 * Front tuck tongue height ≈ 0.8·H (TTH = 0.8·PH3).
 */
export function wrap471Metrics(d: Dims) {
  const { W, H, T, tuckClearance, bridge, slotKerf } = resolveBoard(d);
  const flap = Math.min(H * 0.8, Math.max(28, H * 0.72)) + tuckClearance * 0.15;
  /** Quarter-disc ear reach into the end pocket. */
  const ear = Math.min(H * 0.85, W * 0.42);
  const lug = Math.max(10, Math.min(16, H * 0.18 + T));
  const inner = Math.max(8, H - lug);
  return {
    flap,
    ear,
    lug,
    inner,
    bridge,
    T,
    tuckClearance,
    slotKerf,
    slotDepth: Math.max(6, slotKerf * 2.2 + T),
  };
}

/** Catalog rounded front tuck (arc silhouette). */
function roundedFlap(length: number, depth: number): Pt[] {
  const r = Math.min(depth * 0.42, length * 0.14, 36);
  return [
    [r, 0],
    [length - r, 0],
    [length - r * 0.2, depth * 0.28],
    [length * 0.94, depth * 0.62],
    [length * 0.86, depth],
    [length * 0.14, depth],
    [length * 0.06, depth * 0.62],
    [r * 0.2, depth * 0.28],
  ];
}

/** Quarter-disc lid ear (Opus: catalog DxT1 curved tongues into end pockets). */
function quarterDiscEar(span: number, reach: number, dir: 1 | -1): Pt[] {
  const y0 = span * 0.12;
  const y1 = span * 0.88;
  const steps = 5;
  const pts: Pt[] = [
    [0, y0],
    [0, y1],
  ];
  for (let i = steps; i >= 0; i--) {
    const u = i / steps;
    const ang = (Math.PI / 2) * (1 - u);
    const x = dir * reach * Math.sin(ang);
    const y = y0 + (y1 - y0) * (0.5 + 0.5 * Math.cos(ang));
    pts.push([x, y]);
  }
  return pts;
}

export function wrap471Panels(d: Dims): PanelDef[] {
  const { L, W, H } = d;
  const m = wrap471Metrics(d);
  const walls = (t: number) => phase(t, 0.02, 0.16, 0, 90);
  const ends = (t: number) => phase(t, 0.1, 0.22, 0, 90);
  const bridges = (t: number) => phase(t, 0.18, 0.28, 0, 90);
  const rolls = (t: number) => phase(t, 0.26, 0.36, 0, 90);
  const lugs = (t: number) => phase(t, 0.34, 0.44, 0, TOE_LUG_FOLD);
  const lid = (t: number) => phase(t, 0.46, 0.62, 0, 90);
  const ears = (t: number) => (t <= 0.62 ? phase(t, 0.4, 0.52, 0, 48) : phase(t, 0.62, 0.76, 48, 100));
  const flap = (t: number) => phase(t, 0.76, 0.92, 0, 104);

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
    wall("front", "Передняя стенка", [0, 0, 0], "x", -1, rect(L, -H), walls, "front", "Перед"),
    wall("back", "Задняя стенка", [0, W, 0], "x", 1, rect(L, H), walls, "back", "Зад"),
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
    {
      id: "ear-l",
      name: "Левое ушко крышки",
      parent: "lid",
      hinge: [0, 0, 0],
      axis: "y",
      sign: 1,
      angle: ears,
      poly: quarterDiscEar(W, m.ear, -1),
      fill: "flap",
      tone: "flap",
      stack: 0,
      lift: m.T * 0.7,
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
      poly: quarterDiscEar(W, m.ear, 1),
      fill: "flap",
      tone: "flap",
      stack: 0,
      lift: m.T * 0.7,
      netLabel: "Ушко",
    },
    {
      id: "lid-front",
      name: "Клапан крышки",
      parent: "lid",
      hinge: [0, W, 0],
      axis: "x",
      sign: 1,
      angle: flap,
      poly: roundedFlap(L, m.flap),
      fill: "flap",
      tone: "flap",
      stack: 0,
      lift: m.T * 0.95,
      netLabel: "Клапан",
    },
  ];
}

function rect(length: number, height: number): Pt[] {
  return [
    [0, 0],
    [length, 0],
    [length, height],
    [0, height],
  ];
}

function wall(
  id: string,
  name: string,
  hinge: [number, number, number],
  axis: "x" | "y",
  sign: 1 | -1,
  poly: Pt[],
  angle: (t: number) => number,
  fill: PanelDef["fill"],
  netLabel: string,
): PanelDef {
  return {
    id,
    name,
    parent: "floor",
    hinge,
    axis,
    sign,
    angle,
    poly,
    fill,
    tone: "body",
    stack: 0,
    netLabel,
  };
}
