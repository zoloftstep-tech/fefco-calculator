import type { PanelDef } from "@/lib/fold";
import type { Pt } from "@/lib/math";

/** Catalog lock-hole / tongue layout along an end of length `span` (Essential Image TL/TO). */
export function toeLugSpans(span: number, count: number): [number, number][] {
  if (span < 50 || count <= 0) return [];
  if (count === 1) {
    const width = Math.max(12, span / 3);
    const y = (span - width) / 2;
    return [[y, y + width]];
  }
  const width = Math.min(span / 6, Math.max(18, span / (3 * count)));
  const offset = span / 8;
  if (count === 2) {
    const mid = Math.max(4, span - 2 * width - 2 * offset);
    return [
      [offset, offset + width],
      [offset + width + mid, offset + width + mid + width],
    ];
  }
  const gap = (span - 3 * width - 2 * offset) / 2;
  const a = offset;
  const b = a + width + gap;
  const c = b + width + gap;
  return [
    [a, a + width],
    [b, b + width],
    [c, c + width],
  ];
}

export function toeLugPoly(width: number, depth: number, dir: 1 | -1): Pt[] {
  const tip = dir * depth;
  const bevel = Math.min(2.2, width * 0.16);
  return [
    [0, bevel],
    [0, width - bevel],
    [tip, width * 0.78],
    [tip, width * 0.22],
  ];
}

export function toeSlotPoly(y0: number, y1: number, x: number, depth: number): Pt[] {
  const inset = Math.min(3, (y1 - y0) * 0.12);
  return [
    [x, y0 + inset],
    [x + depth, y0 + inset],
    [x + depth, y1 - inset],
    [x, y1 - inset],
  ];
}

type ToeSide = {
  id: string;
  hinge: [number, number, number];
  sign: 1 | -1;
  dir: 1 | -1;
};

/**
 * Roll-end / double-wall end: outer H → double-crease bridge → inner return → lugs into floor slots.
 * Used by 0427 TOE and 0422 long-wall locks (catalog Essential Image).
 */
export function buildToeEnds(opts: {
  parentFloor?: string;
  span: number;
  height: number;
  bridge: number;
  inner: number;
  lug: number;
  slotDepth: number;
  slotX: (side: "left" | "right") => number;
  lugCount?: number;
  endsAngle: (t: number) => number;
  bridgeAngle: (t: number) => number;
  rollAngle: (t: number) => number;
  lugAngle: (t: number) => number;
  left: ToeSide;
  right: ToeSide;
  lift?: number;
}): PanelDef[] {
  const {
    parentFloor = "floor",
    span,
    height,
    bridge,
    inner,
    lug,
    slotDepth,
    slotX,
    lugCount = 2,
    endsAngle,
    bridgeAngle,
    rollAngle,
    lugAngle,
    left,
    right,
    lift = 0,
  } = opts;
  const spans = toeLugSpans(span, lugCount);
  const panels: PanelDef[] = [];

  for (const side of [
    { key: "left" as const, def: left },
    { key: "right" as const, def: right },
  ]) {
    const { id, hinge, sign, dir } = side.def;
    const bridgeId = `${id}-bridge`;
    const rollId = `${id}-roll`;
    panels.push(
      {
        id,
        name: side.key === "left" ? "Левый торец" : "Правый торец",
        parent: parentFloor,
        hinge,
        axis: "y",
        sign,
        angle: endsAngle,
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
      },
      {
        id: bridgeId,
        name: "Биговка торца",
        parent: id,
        hinge: [dir * height, 0, 0],
        axis: "y",
        sign,
        angle: bridgeAngle,
        poly: [
          [0, 0],
          [0, span],
          [dir * bridge, span],
          [dir * bridge, 0],
        ],
        fill: "lock",
        tone: "lock",
        stack: 0,
        netLabel: "Биговка",
      },
      {
        id: rollId,
        name: "Внутренняя стенка",
        parent: bridgeId,
        hinge: [dir * bridge, 0, 0],
        axis: "y",
        sign,
        angle: rollAngle,
        poly: [
          [0, 0],
          [0, span],
          [dir * inner, span],
          [dir * inner, 0],
        ],
        fill: "lock",
        tone: "lock",
        stack: 0,
        lift,
        netLabel: "Закатка",
      },
    );

    spans.forEach(([y0, y1], index) => {
      const width = y1 - y0;
      panels.push(
        {
          id: `lug-${side.key[0]}-${index}`,
          name: "Язычок закатки",
          parent: rollId,
          hinge: [dir * inner, y0, 0],
          axis: "y",
          sign,
          angle: lugAngle,
          poly: toeLugPoly(width, lug, dir),
          fill: "tuck",
          tone: "flap",
          stack: 0,
          lift: -Math.abs(lift) * 0.5,
        },
        {
          id: `slot-${side.key[0]}-${index}`,
          name: "Прорезь в дне",
          parent: parentFloor,
          hinge: [0, 0, 0],
          axis: "x",
          sign: 1,
          angle: () => 0,
          poly: toeSlotPoly(y0, y1, slotX(side.key), slotDepth),
          fill: "slot",
          tone: "slot",
          stack: -1,
        },
      );
    });
  }

  return panels;
}
