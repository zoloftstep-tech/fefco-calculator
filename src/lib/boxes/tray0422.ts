import { phase, type PanelDef } from "@/lib/fold";
import type { Pt } from "@/lib/math";
import type { Dims } from "@/lib/fefco-types";

/** Inner wall stops just above the floor; hook tongues drop into the base slots. */
export function trayMetrics(d: Dims) {
  const taper = Math.min(d.W * 0.45, d.L / 2 - 2);
  const wall = Math.max(d.H - 8, d.H * 0.78);
  const tongue = Math.min(24, Math.max(14, d.H * 0.38));
  const tongues = d.L < 140 ? 1 : 2;
  const half = Math.min(12, Math.max(7, d.L * 0.045));
  return { taper: Math.max(taper, 8), wall: Math.max(wall, 8), tongue, tongues, half };
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
): PanelDef[] {
  const panels: PanelDef[] = [];
  tongueCenters(length, count).forEach((center, index) => {
    const x0 = center - half * 0.72;
    const x1 = center + half * 0.72;
    const y0 = y;
    const y1 = y + depth;
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
  const { taper, wall, tongue, tongues, half } = trayMetrics(d);
  const ends = (t: number) => phase(t, 0.02, 0.22, 0, 90);
  const ears = (t: number) => phase(t, 0.14, 0.36, 0, 94);
  const longs = (t: number) => phase(t, 0.28, 0.5, 0, 90);
  const locks = (t: number) => phase(t, 0.44, 0.7, 0, 174);
  const tabs = (t: number) => phase(t, 0.66, 0.98, 0, 64);

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
    },
    endPanel("left", "Левый торец", [0, 0, 0], 1, -1, W, H, ends),
    endPanel("right", "Правый торец", [L, 0, 0], -1, 1, W, H, ends),
    ear("ear-lf", "Косынка", "left", [0, 0, 0], -1, taperPoly(H, taper, -1, -1), ears),
    ear("ear-lb", "Косынка", "left", [0, W, 0], 1, taperPoly(H, taper, -1, 1), ears),
    ear("ear-rf", "Косынка", "right", [0, 0, 0], -1, taperPoly(H, taper, 1, -1), ears),
    ear("ear-rb", "Косынка", "right", [0, W, 0], 1, taperPoly(H, taper, 1, 1), ears),
    ...slots("slot-f", "Прорезь", 12, L, tongues, half, 16),
    ...slots("slot-b", "Прорезь", W - 28, L, tongues, half, 16),
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
  };
}
