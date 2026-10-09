import { phase, type PanelDef } from "@/lib/fold";
import type { Pt } from "@/lib/math";
import type { Dims } from "@/lib/fefco-types";

const ROLL = 172;

export function mailerMetrics(d: Dims) {
  const lug = Math.max(8, Math.min(16, d.H * 0.14));
  const tuck = Math.min(d.H * 0.78, Math.max(16, d.W * 0.42));
  const ear = Math.min(d.H * 0.78, d.L * 0.42);
  const inset = Math.max(7, d.H * 0.1);
  return { lug, tuck, ear, inset, roll: Math.max(6, d.H - lug) };
}

/** Locking lugs along an end of length `span`, matching the usual 0/1/2/3 split. */
export function lugSpans(span: number): [number, number][] {
  if (span < 50) return [];
  if (span < 101) {
    const width = Math.max(12, span / 3);
    const y = (span - width) / 2;
    return [[y, y + width]];
  }
  if (span > 900) {
    const y = span / 8;
    const width = y;
    const gap = (span - 3 * width - 2 * y) / 2;
    const a = y;
    const b = a + width + gap;
    const c = b + width + gap;
    return [
      [a, a + width],
      [b, b + width],
      [c, c + width],
    ];
  }
  let width = span / 6;
  const y = width;
  if (width < 25) width = Math.min(25, span / 4);
  const mid = Math.max(4, span - 2 * width - 2 * y);
  return [
    [y, y + width],
    [y + width + mid, y + width + mid + width],
  ];
}

function lugPoly(width: number, depth: number, dir: 1 | -1): Pt[] {
  const tip = dir * depth;
  const bevel = Math.min(2.2, width * 0.16);
  return [
    [0, bevel],
    [0, width - bevel],
    [tip, width * 0.78],
    [tip, width * 0.22],
  ];
}

function earPoly(span: number, depth: number, dir: 1 | -1): Pt[] {
  const cut = Math.min(span * 0.14, depth * 0.4);
  return [
    [0, cut],
    [0, span - cut],
    [dir * depth, span - cut * 1.7],
    [dir * depth * 0.9, cut * 1.5],
  ];
}

function tuckPoly(length: number, depth: number): Pt[] {
  const end = Math.min(depth * 0.72, length * 0.16, 28);
  return [
    [end, 0],
    [length - end, 0],
    [length - end * 0.25, depth * 0.62],
    [length * 0.8, depth],
    [length * 0.2, depth],
    [end * 0.25, depth * 0.62],
  ];
}

export function mailerPanels(d: Dims): PanelDef[] {
  const { L, W, H } = d;
  const { lug, tuck, ear, inset, roll } = mailerMetrics(d);
  const spans = lugSpans(W);

  const walls = (t: number) => phase(t, 0.02, 0.18, 0, 90);
  const ends = (t: number) => phase(t, 0.12, 0.34, 0, 90);
  const rolls = (t: number) => phase(t, 0.28, 0.52, 0, ROLL);
  const lugs = (t: number) => phase(t, 0.46, 0.64, 0, 36);
  const ears = (t: number) => phase(t, 0.55, 0.74, 0, 102);
  const lid = (t: number) => phase(t, 0.66, 0.86, 0, 90);
  const tuckAngle = (t: number) => phase(t, 0.82, 1, 0, 104);

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
      poly: [
        [inset, 0],
        [L - inset, 0],
        [L - inset, -H],
        [inset, -H],
      ],
      fill: "front",
      tone: "body",
      stack: 0,
      netLabel: "Перед",
    },
    {
      id: "back",
      name: "Задняя стенка",
      parent: "floor",
      hinge: [0, W, 0],
      axis: "x",
      sign: 1,
      angle: walls,
      poly: [
        [inset, 0],
        [L - inset, 0],
        [L - inset, H],
        [inset, H],
      ],
      fill: "back",
      tone: "body",
      stack: 0,
      netLabel: "Зад",
    },
    end("left", "Левый торец", [0, 0, 0], 1, -1, W, H, ends),
    rollPanel("left-roll", "Левая закатка", "left", [-H, 0, 0], 1, -1, W, roll, rolls),
    end("right", "Правый торец", [L, 0, 0], -1, 1, W, H, ends),
    rollPanel("right-roll", "Правая закатка", "right", [H, 0, 0], -1, 1, W, roll, rolls),
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
    },
    {
      id: "tuck",
      name: "Клапан крышки",
      parent: "lid",
      hinge: [0, W, 0],
      axis: "x",
      sign: 1,
      angle: tuckAngle,
      poly: tuckPoly(L, tuck),
      fill: "tuck",
      tone: "flap",
      stack: 0,
      netLabel: "Клапан",
    },
  ];

  spans.forEach(([y0, y1], index) => {
    const width = y1 - y0;
    panels.push(
      {
        id: `lug-l-${index}`,
        name: "Язычок закатки",
        parent: "left-roll",
        hinge: [-roll, y0, 0],
        axis: "y",
        sign: 1,
        angle: lugs,
        poly: lugPoly(width, lug, -1),
        fill: "tuck",
        tone: "flap",
        stack: 0,
      },
      {
        id: `lug-r-${index}`,
        name: "Язычок закатки",
        parent: "right-roll",
        hinge: [roll, y0, 0],
        axis: "y",
        sign: -1,
        angle: lugs,
        poly: lugPoly(width, lug, 1),
        fill: "tuck",
        tone: "flap",
        stack: 0,
      },
      slot(`slot-l-${index}`, y0, y1, 3.2, 8),
      slot(`slot-r-${index}`, y0, y1, L - 11.2, 8),
    );
  });

  return panels;
}

function end(
  id: string,
  name: string,
  hinge: [number, number, number],
  sign: 1 | -1,
  dir: 1 | -1,
  span: number,
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
      [0, span],
      [dir * height, span],
      [dir * height, 0],
    ],
    fill: "side",
    tone: "body",
    stack: 0,
    netLabel: "Торец",
  };
}

function rollPanel(
  id: string,
  name: string,
  parent: string,
  hinge: [number, number, number],
  sign: 1 | -1,
  dir: 1 | -1,
  span: number,
  length: number,
  angle: (t: number) => number,
): PanelDef {
  return {
    id,
    name,
    parent,
    hinge,
    axis: "y",
    sign,
    angle,
    poly: [
      [0, 0],
      [0, span],
      [dir * length, span],
      [dir * length, 0],
    ],
    fill: "lock",
    tone: "lock",
    stack: 0,
    netLabel: "Закатка",
  };
}

function slot(id: string, y0: number, y1: number, x: number, depth: number): PanelDef {
  const inset = Math.min(3, (y1 - y0) * 0.12);
  return {
    id,
    name: "Прорезь в дне",
    parent: "floor",
    hinge: [0, 0, 0],
    axis: "x",
    sign: 1,
    angle: () => 0,
    poly: [
      [x, y0 + inset],
      [x + depth, y0 + inset],
      [x + depth, y1 - inset],
      [x, y1 - inset],
    ],
    fill: "slot",
    tone: "slot",
    stack: -1,
  };
}
