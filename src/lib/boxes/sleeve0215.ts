import { facesFrom, phase, type NetModel, type PanelDef, type PanelTone, type WorldFace } from "@/lib/fold";
import { polygonArea, type Pt } from "@/lib/math";
import type { Dims } from "@/lib/fefco-types";
import { GIRTH_COMP_FROM_GLUE, resolveBoard } from "@/lib/params/board";

export function sleeveMetrics(d: Dims) {
  const { L, W, H, T, tuckClearance, slotKerf } = resolveBoard(d);
  const dust = L / 3;
  const shoulder = Math.min(W * 0.32, dust * Math.tan((15 * Math.PI) / 180));
  const female = Math.min(W * 0.78, W - 8);
  const male = Math.min(W * 0.55, female - 6);
  const tongue = Math.max(16, Math.min(36, Math.max(20, W * 0.18)));
  const topDust = Math.min(H * 0.8, L * 0.25);
  const tuck = Math.min(H * 0.95, Math.max(16, H * 0.72)) + tuckClearance * 0.35;
  const slotW = Math.min(L * 0.34, L - 16);
  return { dust, shoulder, female, male, tongue, topDust, tuck, slotW, T, tuckClearance, slotKerf };
}

function rankClosed(face: WorldFace, low: number, high: number, rank: number) {
  const zs = face.points.map((point) => point[2]);
  const spread = Math.max(...zs) - Math.min(...zs);
  const mid = (Math.max(...zs) + Math.min(...zs)) / 2;
  if (spread < 10 && mid > low && mid < high) face.stack = rank;
}

export function sleeveFaces(d: Dims, t: number): WorldFace[] {
  const { L, W, H } = d;
  const m = sleeveMetrics(d);
  const dustA = (u: number) => phase(u, 0, 0.16, 0, 90);
  const femaleA = (u: number) => phase(u, 0.18, 0.36, 0, 90);
  const maleA = (u: number) => phase(u, 0.38, 0.56, 0, 92);
  const topA = (u: number) => phase(u, 0.58, 0.72, 0, 90);
  const lidA = (u: number) => phase(u, 0.74, 0.88, 0, 90);
  const tuckA = (u: number) => phase(u, 0.88, 1, 0, 106);
  const fixed = () => 90;
  const liftDust = m.T * 0.85;
  const liftFemale = m.T * 1.85;
  const liftMale = m.T * 2.9;
  const liftLid = -m.T * 1.7;
  const liftTuck = m.T * 0.95;

  const panels: PanelDef[] = [
    {
      id: "floor",
      name: "Дно открыто",
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
    },
    wallX("front", "Передняя стенка", [0, 0, 0], -1, -1, L, H, fixed, "front"),
    wallX("back", "Задняя стенка", [0, W, 0], 1, 1, L, H, fixed, "back"),
    wallY("left", "Левая стенка", [0, 0, 0], 1, -1, W, H, fixed),
    wallY("right", "Правая стенка", [L, 0, 0], -1, 1, W, H, fixed),
    {
      id: "bot-left",
      name: "Нижний пыльник",
      parent: "left",
      hinge: [0, 0, 0],
      axis: "y",
      sign: -1,
      angle: dustA,
      poly: dustOnY(W, m.dust, m.shoulder, 1),
      fill: "flap",
      tone: "flap",
      stack: 0,
      lift: liftDust,
    },
    {
      id: "bot-right",
      name: "Нижний пыльник",
      parent: "right",
      hinge: [0, 0, 0],
      axis: "y",
      sign: 1,
      angle: dustA,
      poly: dustOnY(W, m.dust, m.shoulder, -1),
      fill: "flapDark",
      tone: "flap",
      stack: 0,
      lift: liftDust,
    },
    {
      id: "bot-front",
      name: "Клапан со шлицем",
      parent: "front",
      hinge: [0, 0, 0],
      axis: "x",
      sign: 1,
      angle: femaleA,
      poly: [
        [0, 0],
        [L, 0],
        [L, m.female],
        [0, m.female],
      ],
      fill: "flap",
      tone: "flap",
      stack: 0,
      lift: liftFemale,
    },
    {
      id: "bot-slot",
      name: "Шлиц дна",
      parent: "bot-front",
      hinge: [0, 0, 0],
      axis: "x",
      sign: 1,
      angle: () => 0,
      poly: [
        [(L - m.slotW) / 2, m.female * 0.46],
        [(L + m.slotW) / 2, m.female * 0.46],
        [(L + m.slotW) / 2, m.female * 0.46 + Math.max(m.slotKerf * 1.1, m.female * 0.16)],
        [(L - m.slotW) / 2, m.female * 0.46 + Math.max(m.slotKerf * 1.1, m.female * 0.16)],
      ],
      fill: "slot",
      tone: "slot",
      stack: 0,
    },
    {
      id: "bot-back",
      name: "Клапан с язычком",
      parent: "back",
      hinge: [0, 0, 0],
      axis: "x",
      sign: -1,
      angle: maleA,
      poly: tongueFlap(L, m.male, Math.max(12, m.slotW * 0.62 - m.tuckClearance), m.tongue, -1),
      fill: "flapDark",
      tone: "flap",
      stack: 0,
      lift: liftMale,
    },
    {
      id: "top-left",
      name: "Верхний пыльник",
      parent: "left",
      hinge: [-H, 0, 0],
      axis: "y",
      sign: 1,
      angle: topA,
      poly: dustOnY(W, m.topDust, Math.min(m.shoulder, m.topDust * 0.35), -1),
      fill: "flap",
      tone: "flap",
      stack: 0,
      lift: liftDust,
    },
    {
      id: "top-right",
      name: "Верхний пыльник",
      parent: "right",
      hinge: [H, 0, 0],
      axis: "y",
      sign: -1,
      angle: topA,
      poly: dustOnY(W, m.topDust, Math.min(m.shoulder, m.topDust * 0.35), 1),
      fill: "flapDark",
      tone: "flap",
      stack: 0,
      lift: liftDust,
    },
    {
      id: "lid",
      name: "Крышка",
      parent: "back",
      hinge: [0, H, 0],
      axis: "x",
      sign: 1,
      angle: lidA,
      poly: [
        [0, 0],
        [L, 0],
        [L, W],
        [0, W],
      ],
      fill: "lid",
      tone: "lid",
      stack: 0,
      // Local +z points into the box once the lid is down, so the offset is negative.
      lift: liftLid,
    },
    {
      id: "tuck",
      name: "Клапан крышки",
      parent: "lid",
      hinge: [0, W, 0],
      axis: "x",
      sign: 1,
      angle: tuckA,
      poly: chamferTuck(L, m.tuck),
      fill: "tuck",
      tone: "flap",
      stack: 0,
      lift: liftTuck,
    },
  ];

  const faces = facesFrom(panels, t).filter((face) => face.id !== "floor");
  for (const face of faces) {
    if (face.id === "bot-left" || face.id === "bot-right") rankClosed(face, -2, 6, 1);
    if (face.id === "bot-front" || face.id === "bot-slot") rankClosed(face, -2, 8, 2);
    if (face.id === "bot-back") rankClosed(face, -2, 8, 3);
    if (face.id === "top-left" || face.id === "top-right") rankClosed(face, H - 8, H + 4, 4);
    if (face.id === "lid") rankClosed(face, H - 4, H + 4, 5);
    if (face.id === "tuck") rankClosed(face, H * 0.2, H + 2, 6);
  }
  return faces;
}

function wallX(
  id: string,
  name: string,
  hinge: [number, number, number],
  sign: 1 | -1,
  dir: 1 | -1,
  length: number,
  height: number,
  angle: (t: number) => number,
  fill: PanelDef["fill"],
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
  };
}

function wallY(
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
  };
}

function dustOnY(span: number, depth: number, shoulder: number, dir: 1 | -1): Pt[] {
  const s = Math.min(shoulder, span * 0.3);
  return [
    [0, 0],
    [0, span],
    [dir * depth, span - s],
    [dir * depth, s],
  ];
}

function tongueFlap(length: number, depth: number, width: number, tongue: number, dir: 1 | -1): Pt[] {
  const x0 = (length - width) / 2;
  const x1 = x0 + width;
  const y = dir * depth;
  const tip = dir * (depth + tongue);
  return [
    [0, 0],
    [length, 0],
    [length, y],
    [x1, y],
    [x1, tip],
    [x0, tip],
    [x0, y],
    [0, y],
  ];
}

function chamferTuck(length: number, depth: number): Pt[] {
  const end = Math.min(depth * 0.5, length * 0.14, 24);
  return [
    [end, 0],
    [length - end, 0],
    [length - end * 0.35, depth * 0.55],
    [length * 0.86, depth],
    [length * 0.14, depth],
    [end * 0.35, depth * 0.55],
  ];
}

export function sleeveNet(d: Dims): NetModel {
  const { L, W, H, G, T } = resolveBoard(d);
  const m = sleeveMetrics(d);
  const bottom = Math.max(m.dust, m.female, m.male + m.tongue);
  const top = Math.max(m.topDust, W + m.tuck);
  const widths = [L, W, L, W].map((dim, i) => dim + GIRTH_COMP_FROM_GLUE[i] * T);
  const width = G + widths.reduce((sum, w) => sum + w, 0);
  const height = bottom + H + top;
  const panels: NetModel["panels"] = [];
  const cuts: [Pt, Pt][] = [];
  const folds: [Pt, Pt][] = [];

  const add = (points: Pt[], tone: PanelTone, label?: string) => {
    panels.push({ points, tone, label });
  };
  const cut = (a: Pt, b: Pt) => cuts.push([a, b]);
  const fold = (a: Pt, b: Pt) => folds.push([a, b]);
  const outline = (points: Pt[], hinges: number[], tone: PanelTone, label?: string) => {
    add(points, tone, label);
    const hinge = new Set(hinges);
    for (let i = 0; i < points.length; i++) {
      const a = points[i];
      const b = points[(i + 1) % points.length];
      (hinge.has(i) ? fold : cut)(a, b);
    }
  };

  const xs = [G, G + widths[0], G + widths[0] + widths[1], G + widths[0] + widths[1] + widths[2]];

  widths.forEach((panelW, index) => {
    const x = xs[index];
    add(
      [
        [x, bottom],
        [x + panelW, bottom],
        [x + panelW, bottom + H],
        [x, bottom + H],
      ],
      "body",
      index % 2 === 0 ? "Д" : "Ш",
    );
    fold([x, bottom], [x + panelW, bottom]);
    fold([x, bottom + H], [x + panelW, bottom + H]);
    if (index < 3) fold([x + panelW, bottom], [x + panelW, bottom + H]);
    else cut([x + panelW, bottom], [x + panelW, bottom + H]);
  });

  const dust = (x: number, panelW: number, y0: number, depth: number, dir: 1 | -1) => {
    const s = Math.min(m.shoulder, panelW * 0.3, depth * 0.45);
    const y1 = y0 + dir * depth;
    outline(
      [
        [x, y0],
        [x + panelW, y0],
        [x + panelW - s, y1],
        [x + s, y1],
      ],
      [0],
      "flap",
    );
  };

  dust(xs[1], widths[1], bottom, m.dust, -1);
  dust(xs[3], widths[3], bottom, m.dust, -1);
  dust(xs[1], widths[1], bottom + H, m.topDust, 1);
  dust(xs[3], widths[3], bottom + H, m.topDust, 1);

  const lenA = widths[0];
  const lenB = widths[2];
  outline(
    [
      [xs[0], bottom - m.female],
      [xs[0] + lenA, bottom - m.female],
      [xs[0] + lenA, bottom],
      [xs[0], bottom],
    ],
    [2],
    "flap",
    "шлиц",
  );
  const slotX = xs[0] + (lenA - m.slotW) / 2;
  const slotH = Math.max(m.slotKerf * 1.1, m.female * 0.16);
  const slotY = bottom - m.female * 0.62;
  add(
    [
      [slotX, slotY],
      [slotX + m.slotW, slotY],
      [slotX + m.slotW, slotY + slotH],
      [slotX, slotY + slotH],
    ],
    "slot",
  );

  const maleX = xs[2];
  const tongueW = Math.max(12, m.slotW * 0.62 - m.tuckClearance);
  const tx = maleX + (lenB - tongueW) / 2;
  outline(
    [
      [maleX, bottom - m.male],
      [tx, bottom - m.male],
      [tx, bottom - m.male - m.tongue],
      [tx + tongueW, bottom - m.male - m.tongue],
      [tx + tongueW, bottom - m.male],
      [maleX + lenB, bottom - m.male],
      [maleX + lenB, bottom],
      [maleX, bottom],
    ],
    [6],
    "flap",
    "язычок",
  );

  const lidX = xs[0];
  outline(
    [
      [lidX, bottom + H],
      [lidX + lenA, bottom + H],
      [lidX + lenA, bottom + H + W],
      [lidX, bottom + H + W],
    ],
    [0, 2],
    "lid",
    "Крышка",
  );
  const end = Math.min(m.tuck * 0.5, lenA * 0.14, 24);
  const tuckY = bottom + H + W;
  outline(
    [
      [lidX + end, tuckY],
      [lidX + end * 0.35, tuckY + m.tuck * 0.55],
      [lidX + lenA * 0.14, tuckY + m.tuck],
      [lidX + lenA * 0.86, tuckY + m.tuck],
      [lidX + lenA - end * 0.35, tuckY + m.tuck * 0.55],
      [lidX + lenA - end, tuckY],
    ],
    [],
    "flap",
    "клапан",
  );

  if (G > 0) {
    const bevel = Math.min(G * 0.3, H * 0.15);
    const glue: Pt[] = [
      [G, bottom],
      [0, bottom + bevel],
      [0, bottom + H - bevel],
      [G, bottom + H],
    ];
    add(glue, "glue", "клей");
    for (let i = 0; i < 3; i++) cut(glue[i], glue[i + 1]);
    fold([G, bottom], [G, bottom + H]);
  } else {
    cut([0, bottom], [0, bottom + H]);
  }

  const holes = panels.filter((panel) => panel.tone === "slot");
  for (const hole of holes) {
    const pts = hole.points;
    for (let i = 0; i < pts.length; i++) cut(pts[i], pts[(i + 1) % pts.length]);
  }

  return {
    width,
    height,
    area: panels.reduce((sum, panel) => {
      const piece = polygonArea(panel.points);
      return sum + (panel.tone === "slot" ? -piece : piece);
    }, 0),
    panels,
    cuts,
    folds,
  };
}
