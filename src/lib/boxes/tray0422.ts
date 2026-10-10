import { phase, type PanelDef } from "@/lib/fold";
import type { Pt } from "@/lib/math";
import type { Dims } from "@/lib/fefco-types";
import { resolveBoard } from "@/lib/params/board";

/** Inner wall stops just above the floor; hook tongues drop into the base slots. */
export function trayMetrics(d: Dims) {
  const { L, W, H, T, slotKerf } = resolveBoard(d);
  const taper = Math.min(W * 0.45, L / 2 - 2);
  const wall = Math.max(H - 8, H * 0.78);
  const tongue = Math.min(24, Math.max(14, H * 0.38 + T * 0.25));
  const tongues = L < 140 ? 1 : 2;
  const half = Math.min(12, Math.max(7, L * 0.045));
  const slotDepth = Math.max(14, Math.min(18, 12 + slotKerf * 2));
  return {
    taper: Math.max(taper, 8),
    wall: Math.max(wall, 8),
    tongue,
    tongues,
    half,
    T,
    slotKerf,
    slotDepth,
    slotYFront: 12,
    slotYBack: (y: number) => y - 28,
  };
}

export function tongueCenters(length: number, count: number) {
  if (count <= 1) return [length / 2];
  const inset = Math.max(22, Math.min(length * 0.16, 48));
  return [inset, length - inset];
}

function taperPoly(height: number, depth: number, up: 1 | -1, dir: 1 | -1): Pt[] {
  const foot = Math.max(2.5, height * 0.14);
  const head = Math.max(2, height * 0.08);
  return [
    [up * foot, 0],
    [up * (height - head), 0],
    [up * (height - head * 2.2), dir * depth],
    [up * foot * 1.8, dir * depth * 0.42],
  ];
}

/** Hook: narrow neck through the slot, wider head so it cannot pull back out. */
function tonguePoly(length: number, depth: number, count: number, half: number, dir: 1 | -1): Pt[] {
  const pts: Pt[] = [[0, 0]];
  for (const center of tongueCenters(length, count)) {
    const neck = half * 0.46;
    const y1 = dir * depth * 0.38;
    const y2 = dir * depth;
    pts.push(
      [center - neck, 0],
      [center - half, y1],
      [center - half * 0.82, y2],
      [center + half * 0.82, y2],
      [center + half, y1],
      [center + neck, 0],
    );
  }
  pts.push([length, 0]);
  return pts;
}

function slots(
  id: string,
  name: string,
  y: number,
  length: number,
  count: number,
  half: number,
  depth: number,
  kerf: number,
): PanelDef[] {
  const panels: PanelDef[] = [];
  tongueCenters(length, count).forEach((center, index) => {
    const x0 = center - half * 0.72;
    const x1 = center + half * 0.72;
    const y0 = y;
    const y1 = y + Math.max(depth, kerf * 4);
    panels.push({
      id: `${id}-${index}`,
      name,
      parent: "floor",
      hinge: [0, 0, 0],
      axis: "x",
      sign: 1,
      angle: () => 0,
      poly: [
        [x0, y0],
        [x1, y0],
        [x1, y1],
        [x0, y1],
      ],
      fill: "slot",
      tone: "slot",
      stack: -1,
    });
  });
  return panels;
}

export function trayPanels(d: Dims): PanelDef[] {
  const { L, W, H } = d;
  const { taper, wall, tongue, tongues, half, T, slotKerf, slotDepth, slotYFront, slotYBack } = trayMetrics(d);
  const ends = (t: number) => phase(t, 0.02, 0.18, 0, 90);
  const ears = (t: number) => phase(t, 0.16, 0.3, 0, 90);
  const longs = (t: number) => phase(t, 0.32, 0.48, 0, 90);
  const locks = (t: number) => phase(t, 0.5, 0.68, 0, 174);
  /** Hook heads drop into the floor slots after the return is down. */
  const tabs = (t: number) => phase(t, 0.7, 0.98, 0, 64);

  const floor: PanelDef = {
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
  };

  return [
    floor,
    wallPanel("front", "Передняя стенка", [0, 0, 0], -1, -1, L, H, longs, "front", "Стенка"),
    {
      id: "front-lock",
      name: "Передний замок",
      parent: "front",
      hinge: [0, -H, 0],
      axis: "x",
      sign: -1,
      angle: locks,
      poly: [
        [0, 0],
        [L, 0],
        [L, -wall],
        [0, -wall],
      ],
      fill: "lock",
      tone: "lock",
      stack: 0,
      netLabel: "Замок",
    },
    {
      id: "front-tabs",
      name: "Передние язычки",
      parent: "front-lock",
      hinge: [0, -wall, 0],
      axis: "x",
      sign: 1,
      angle: tabs,
      poly: tonguePoly(L, tongue, tongues, half, -1),
      fill: "tuck",
      tone: "flap",
      stack: 0,
      lift: T * 0.2,
      netLabel: "Язычки",
    },
    wallPanel("back", "Задняя стенка", [0, W, 0], 1, 1, L, H, longs, "back", "Стенка"),
    {
      id: "back-lock",
      name: "Задний замок",
      parent: "back",
      hinge: [0, H, 0],
      axis: "x",
      sign: 1,
      angle: locks,
      poly: [
        [0, 0],
        [L, 0],
        [L, wall],
        [0, wall],
      ],
      fill: "lock",
      tone: "lock",
      stack: 0,
      netLabel: "Замок",
    },
    {
      id: "back-tabs",
      name: "Задние язычки",
      parent: "back-lock",
      hinge: [0, wall, 0],
      axis: "x",
      sign: -1,
      angle: tabs,
      poly: tonguePoly(L, tongue, tongues, half, 1),
      fill: "tuck",
      tone: "flap",
      stack: 0,
      lift: T * 0.2,
    },
    endPanel("left", "Левый торец", [0, 0, 0], 1, -1, W, H, ends),
    endPanel("right", "Правый торец", [L, 0, 0], -1, 1, W, H, ends),
    ear("ear-lf", "Косынка", "left", [0, 0, 0], -1, taperPoly(H, taper, -1, -1), ears, T * 0.5),
    ear("ear-lb", "Косынка", "left", [0, W, 0], 1, taperPoly(H, taper, -1, 1), ears, T * 0.5),
    ear("ear-rf", "Косынка", "right", [0, 0, 0], -1, taperPoly(H, taper, 1, -1), ears, T * 0.5),
    ear("ear-rb", "Косынка", "right", [0, W, 0], 1, taperPoly(H, taper, 1, 1), ears, T * 0.5),
    ...slots("slot-f", "Прорезь", slotYFront, L, tongues, half, slotDepth, slotKerf),
    ...slots("slot-b", "Прорезь", slotYBack(W), L, tongues, half, slotDepth, slotKerf),
  ];
}

function wallPanel(
  id: string,
  name: string,
  hinge: [number, number, number],
  sign: 1 | -1,
  dir: 1 | -1,
  length: number,
  height: number,
  angle: (t: number) => number,
  fill: PanelDef["fill"],
  netLabel: string,
): PanelDef {
  return {
    id,
    name,
    parent: "floor",
    hinge,
    axis: "x",
    sign,
    angle,
    poly: [
      [0, 0],
      [length, 0],
      [length, dir * height],
      [0, dir * height],
    ],
    fill,
    tone: "body",
    stack: 0,
    netLabel,
  };
}

function endPanel(
  id: string,
  name: string,
  hinge: [number, number, number],
  sign: 1 | -1,
  dir: 1 | -1,
  length: number,
  height: number,
  angle: (t: number) => number,
): PanelDef {
  return {
    id,
    name,
    parent: "floor",
    hinge,
    axis: "y",
    sign,
    angle,
    poly: [
      [0, 0],
      [0, length],
      [dir * height, length],
      [dir * height, 0],
    ],
    fill: "side",
    tone: "body",
    stack: 0,
    netLabel: "Торец",
  };
}

function ear(
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
    axis: "x",
    sign,
    angle,
    poly,
    fill: "flap",
    tone: "flap",
    stack: 0,
    lift,
  };
}
