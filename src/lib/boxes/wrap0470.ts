import { phase, type PanelDef } from "@/lib/fold";
import type { Pt } from "@/lib/math";
import type { Dims } from "@/lib/fefco-types";

export function wrapMetrics(d: Dims) {
  const ear = Math.min(d.H * 0.92, d.W * 0.46, d.L * 0.46);
  const lip = Math.max(14, Math.min(d.H * 0.48, d.W * 0.7));
  const wing = Math.min(d.H * 0.9, d.W * 0.95);
  const frontFlap = Math.max(16, Math.min(d.H * 0.4, 46));
  const tongue = Math.min(20, Math.max(12, d.H * 0.2));
  const tongueW = Math.min(d.L * 0.28, 90);
  return { ear, lip, wing, frontFlap, tongue, tongueW };
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
  const ends = (t: number) => phase(t, 0.02, 0.16, 0, 90);
  const front = (t: number) => phase(t, 0.1, 0.26, 0, 90);
  const frontEars = (t: number) => phase(t, 0.2, 0.36, 0, 96);
  const lip = (t: number) => phase(t, 0.3, 0.48, 0, 158);
  const back = (t: number) => phase(t, 0.28, 0.44, 0, 90);
  const backEars = (t: number) => phase(t, 0.38, 0.54, 0, 96);
  const lid = (t: number) => phase(t, 0.5, 0.7, 0, 90);
  const wings = (t: number) => phase(t, 0.62, 0.8, 0, 112);
  const lidFront = (t: number) => phase(t, 0.74, 0.9, 0, 108);
  const tongue = (t: number) => phase(t, 0.86, 1, 0, 52);

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
    {
      id: "left",
      name: "Левый торец",
      parent: "floor",
      hinge: [0, 0, 0],
      axis: "y",
      sign: 1,
      angle: ends,
      poly: [
        [0, 0],
        [0, W],
        [-H, W],
        [-H, 0],
      ],
      fill: "side",
      tone: "body",
      stack: 0,
      netLabel: "Торец",
    },
    {
      id: "right",
      name: "Правый торец",
      parent: "floor",
      hinge: [L, 0, 0],
      axis: "y",
      sign: -1,
      angle: ends,
      poly: [
        [0, 0],
        [0, W],
        [H, W],
        [H, 0],
      ],
      fill: "side",
      tone: "body",
      stack: 0,
      netLabel: "Торец",
    },
    ear("ear-lf", "Переднее ушко", "front", [0, 0, 0], "y", 1, sideEar(H, m.ear, -1), frontEars),
    ear("ear-rf", "Переднее ушко", "front", [L, 0, 0], "y", -1, sideEar(H, m.ear, -1).map(([x, y]) => [-x, y]), frontEars),
    ear("ear-lb", "Заднее ушко", "back", [0, 0, 0], "y", 1, sideEar(H, m.ear, 1), backEars),
    ear("ear-rb", "Заднее ушко", "back", [L, 0, 0], "y", -1, sideEar(H, m.ear, 1).map(([x, y]) => [-x, y]), backEars),
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
    ear("wing-l", "Крыло крышки", "lid", [0, 0, 0], "y", 1, wingPoly(W, m.wing, -1), wings),
    ear("wing-r", "Крыло крышки", "lid", [L, 0, 0], "y", -1, wingPoly(W, m.wing, 1), wings),
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
  };
}

function wingPoly(span: number, depth: number, dir: 1 | -1): Pt[] {
  const cut = Math.min(span * 0.12, 14);
  return [
    [0, cut],
    [0, span - cut],
    [dir * depth, span - cut * 1.4],
    [dir * depth * 0.88, cut * 1.3],
  ];
}
