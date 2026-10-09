import { phase, type PanelDef } from "@/lib/fold";
import type { Pt } from "@/lib/math";
import type { Dims } from "@/lib/fefco-types";

/** Long-wall return stops short of the floor; tongues finish the lock. */
export function trayMetrics(d: Dims) {
  const taper = Math.min(d.W * 0.45, d.L / 2 - 2);
  const wall = Math.min(d.H * 0.9, d.H - 4);
  const tongue = Math.min(22, Math.max(11, d.H * 0.34));
  const tongues = d.L < 140 ? 1 : 2;
  return { taper: Math.max(taper, 8), wall: Math.max(wall, 8), tongue, tongues };
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

function tonguePoly(length: number, depth: number, count: number, dir: 1 | -1): Pt[] {
  const margin = Math.max(6, length * 0.08);
  const usable = Math.max(8, length - margin * 2);
  const width = Math.min(usable / (count * 2.1), length * 0.2);
  const pitch = usable / count;
  const pts: Pt[] = [[margin, 0]];
  for (let i = 0; i < count; i++) {
    const center = margin + pitch * (i + 0.5);
    const x0 = center - width / 2;
    const x1 = center + width / 2;
    pts.push([x0, 0], [x0, dir * depth], [x1, dir * depth], [x1, 0]);
  }
  pts.push([length - margin, 0]);
  return pts;
}

function slots(
  id: string,
  name: string,
  y: number,
  length: number,
  count: number,
  depth: number,
): PanelDef[] {
  const margin = Math.max(6, length * 0.08);
  const usable = Math.max(8, length - margin * 2);
  const width = Math.min(usable / (count * 2.1), length * 0.2);
  const pitch = usable / count;
  const panels: PanelDef[] = [];
  for (let i = 0; i < count; i++) {
    const center = margin + pitch * (i + 0.5);
    const x0 = center - width * 0.38;
    const x1 = center + width * 0.38;
    const y0 = y;
    const y1 = y + depth;
    panels.push({
      id: `${id}-${i}`,
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
  }
  return panels;
}

export function trayPanels(d: Dims): PanelDef[] {
  const { L, W, H } = d;
  const { taper, wall, tongue, tongues } = trayMetrics(d);
  const ends = (t: number) => phase(t, 0.02, 0.24, 0, 90);
  const ears = (t: number) => phase(t, 0.16, 0.4, 0, 94);
  const longs = (t: number) => phase(t, 0.34, 0.58, 0, 90);
  const locks = (t: number) => phase(t, 0.5, 0.78, 0, 168);
  const tabs = (t: number) => phase(t, 0.72, 0.98, 0, 56);

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
      poly: tonguePoly(L, tongue, tongues, -1),
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
      poly: tonguePoly(L, tongue, tongues, 1),
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
    ...slots("slot-f", "Прорезь", 16, L, tongues, 12),
    ...slots("slot-b", "Прорезь", W - 28, L, tongues, 12),
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
