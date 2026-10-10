import { phase, type PanelDef } from "@/lib/fold";
import type { Pt } from "@/lib/math";
import type { Dims } from "@/lib/fefco-types";
import { resolveBoard } from "@/lib/params/board";

/** Outer wall + bridge + inner roll ≈ catalog TOE; angles approximate the double crease. */
const BRIDGE_FOLD = 90;
const ROLL_FOLD = 90;

export function mailerMetrics(d: Dims) {
  const board = resolveBoard(d);
  const { H, W, T, bridge, tuckClearance, slotKerf } = board;
  const lug = Math.max(12, Math.min(18, H * 0.2));
  const tuck = Math.min(H * 0.78, Math.max(16, W * 0.42)) + tuckClearance * 0.25;
  /** Catalog lid ears ≈ H, capped by width so they fit the roll pocket. */
  const ear = Math.min(H * 0.98, W * 0.48);
  const inset = Math.max(7, H * 0.1, T * 2);
  const dust = Math.min(H * 0.42, W * 0.22, 36);
  const roll = Math.max(8, H - lug);
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
    slotDepth: Math.max(6, slotKerf * 2.4),
  };
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

/** Catalog trapezoid: long edge on the crease, short edge outside. */
function earPoly(span: number, depth: number, dir: 1 | -1): Pt[] {
  const hinge = span * 0.07;
  const tip = span * 0.24;
  return [
    [0, hinge],
    [0, span - hinge],
    [dir * depth, span - tip],
    [dir * depth, tip],
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

function tuckPoly(length: number, depth: number, side: number): Pt[] {
  return [
    [side, 0],
    [length - side, 0],
    [length - side, depth],
    [side, depth],
  ];
}

/** Ears on the closing flap. They stick out sideways, then fold into the ends. */
function tuckEarPoly(depth: number, reach: number, dir: 1 | -1): Pt[] {
  const y0 = Math.max(2, depth * 0.1);
  const y1 = depth * 0.88;
  const inset = (y1 - y0) * 0.22;
  return [
    [0, y0],
    [0, y1],
    [dir * reach, y1 - inset],
    [dir * reach, y0 + inset],
  ];
}

export function mailerPanels(d: Dims): PanelDef[] {
  const { L, W, H } = d;
  const { lug, tuck, ear, inset, dust, roll, bridge, T, slotDepth } = mailerMetrics(d);
  const spans = lugSpans(W);

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
    dustFlap("dust-bl", "Заднее ушко", "back", [inset, 0, 0], 1, dustPoly(H, dust, -1, 1), dusts, T * 0.4),
    dustFlap("dust-br", "Заднее ушко", "back", [L - inset, 0, 0], -1, dustPoly(H, dust, 1, 1), dusts, T * 0.4),
    end("left", "Левый торец", [0, 0, 0], 1, -1, W, H, ends),
    bridgePanel("left-bridge", "Левая биговка", "left", [-H, 0, 0], 1, -1, W, bridge, bridges),
    rollPanel("left-roll", "Левая закатка", "left-bridge", [-bridge, 0, 0], 1, -1, W, roll, rolls),
    end("right", "Правый торец", [L, 0, 0], -1, 1, W, H, ends),
    bridgePanel("right-bridge", "Правая биговка", "right", [H, 0, 0], -1, 1, W, bridge, bridges),
    rollPanel("right-roll", "Правая закатка", "right-bridge", [bridge, 0, 0], -1, 1, W, roll, rolls),
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
      poly: tuckPoly(L, tuck, side),
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
        lift: -T * 0.2,
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
        lift: -T * 0.2,
      },
      slot(`slot-l-${index}`, y0, y1, 3.2, slotDepth),
      slot(`slot-r-${index}`, y0, y1, L - 3.2 - slotDepth, slotDepth),
    );
  });

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

function bridgePanel(
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
    netLabel: "Биговка",
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
