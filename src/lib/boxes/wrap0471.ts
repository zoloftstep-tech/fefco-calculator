import { phase, type PanelDef } from "@/lib/fold";
import type { Pt } from "@/lib/math";
import type { Dims } from "@/lib/fefco-types";

export function wrap471Metrics(d: Dims) {
  const flap = Math.min(d.H * 0.62, Math.max(28, d.W * 0.42));
  const hook = Math.max(14, Math.min(22, d.H * 0.22));
  const slotW = Math.min(22, Math.max(12, d.W * 0.16));
  const slotH = Math.min(16, Math.max(10, d.H * 0.18));
  return { flap, hook, slotW, slotH };
}

function roundedFlap(length: number, depth: number): Pt[] {
  const radius = Math.min(depth * 0.42, length * 0.14, 36);
  return [
    [radius, 0],
    [length - radius, 0],
    [length - radius * 0.25, depth * 0.38],
    [length * 0.9, depth],
    [length * 0.1, depth],
    [radius * 0.25, depth * 0.38],
  ];
}

function hookPoly(depth: number, reach: number, dir: 1 | -1): Pt[] {
  const inset = depth * 0.22;
  return [
    [0, inset],
    [0, depth - inset],
    [dir * reach, depth * 0.72],
    [dir * reach, depth * 0.28],
  ];
}

export function wrap471Panels(d: Dims): PanelDef[] {
  const { L, W, H } = d;
  const m = wrap471Metrics(d);
  const walls = (t: number) => phase(t, 0.02, 0.18, 0, 90);
  const ends = (t: number) => phase(t, 0.14, 0.32, 0, 90);
  const lid = (t: number) => phase(t, 0.36, 0.54, 0, 90);
  const flap = (t: number) => phase(t, 0.56, 0.74, 0, 102);
  const hooks = (t: number) => phase(t, 0.76, 1, 0, 94);

  const slotY = 6;
  const slotTop = H * 0.9;
  const slotBot = slotTop - m.slotH;

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
    wall("left", "Левый торец", [0, 0, 0], "y", 1, endPoly(W, H, -1), ends, "side", "Торец"),
    wall("right", "Правый торец", [L, 0, 0], "y", -1, endPoly(W, H, 1), ends, "side", "Торец"),
    slot("slot-l", "left", -1, slotBot, slotTop, slotY, slotY + m.slotW),
    slot("slot-r", "right", 1, slotBot, slotTop, slotY, slotY + m.slotW),
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
      lift: 1.4,
      netLabel: "Клапан",
    },
    hook("hook-l", "Левый крючок", "lid-front", [0, 0, 0], 1, hookPoly(m.flap * 0.7, m.hook, -1), hooks),
    hook("hook-r", "Правый крючок", "lid-front", [L, 0, 0], -1, hookPoly(m.flap * 0.7, m.hook, 1), hooks),
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

function endPoly(span: number, height: number, dir: 1 | -1): Pt[] {
  return [
    [0, 0],
    [0, span],
    [dir * height, span],
    [dir * height, 0],
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

function slot(
  id: string,
  parent: string,
  dir: 1 | -1,
  inner: number,
  outer: number,
  y0: number,
  y1: number,
): PanelDef {
  return {
    id,
    name: "Прорезь торца",
    parent,
    hinge: [0, 0, 0],
    axis: "y",
    sign: 1,
    angle: () => 0,
    poly: [
      [dir * inner, y0],
      [dir * outer, y0],
      [dir * outer, y1],
      [dir * inner, y1],
    ],
    fill: "slot",
    tone: "slot",
    stack: -1,
  };
}

function hook(
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
    axis: "y",
    sign,
    angle,
    poly,
    fill: "tuck",
    tone: "flap",
    stack: 0,
    lift: 1.2,
    netLabel: "Крючок",
  };
}
