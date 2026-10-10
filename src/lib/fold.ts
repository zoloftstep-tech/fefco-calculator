import {
  phase,
  polygonArea,
  rotX,
  rotY,
  vadd,
  type Pt,
  type Vec3,
} from "@/lib/math";

export type { Pt, Vec3 };
export { phase };

export type FaceFill =
  | "floor"
  | "front"
  | "side"
  | "back"
  | "flap"
  | "flapDark"
  | "lock"
  | "lid"
  | "tuck"
  | "slot";

export type PanelTone = "body" | "flap" | "lock" | "lid" | "glue" | "floor" | "slot";

export type WorldFace = {
  id: string;
  name: string;
  points: Vec3[];
  fill: FaceFill;
  stack: number;
};

export type NetModel = {
  width: number;
  height: number;
  area: number;
  panels: { points: Pt[]; tone: PanelTone; label?: string }[];
  cuts: [Pt, Pt][];
  folds: [Pt, Pt][];
};

export type Axis = "x" | "y";

export type PanelDef = {
  id: string;
  name: string;
  parent: string | null;
  hinge: Vec3;
  axis: Axis;
  sign: 1 | -1;
  angle: (t: number) => number;
  poly: Pt[];
  fill: FaceFill;
  tone: PanelTone;
  stack: number;
  netLabel?: string;
  /** Millimetres along the panel normal. Folded view only, so the net stays flat. */
  lift?: number | ((t: number) => number);
  /**
   * World-space correction after the hinge chain. Used so an ear can travel
   * around a wall (above the rim, or through the open front of a pocket)
   * instead of rotating through the board. Must be [0,0,0] on the flat net
   * and at the seated pose. Receives the uncorrected world points.
   */
  ride?: (t: number, points: Vec3[]) => Vec3;
};

type Xform = (p: Vec3) => Vec3;

const identity: Xform = (p) => p;

export function xforms(panels: PanelDef[], t: number, inheritLift = false) {
  const byId = new Map(panels.map((panel) => [panel.id, panel]));
  const cache = new Map<string, Xform>();

  const build = (id: string): Xform => {
    const cached = cache.get(id);
    if (cached) return cached;
    const panel = byId.get(id);
    if (!panel) throw new Error(`Нет панели ${id}`);
    const parent = panel.parent ? build(panel.parent) : identity;
    const rad = (panel.sign * panel.angle(t) * Math.PI) / 180;
    const lift = inheritLift ? (typeof panel.lift === "function" ? panel.lift(t) : (panel.lift ?? 0)) : 0;
    const extra = lift + (inheritLift && panel.fill === "slot" ? 0.7 : 0);
    const xf: Xform = (local) => {
      const lifted: Vec3 = extra ? [local[0], local[1], local[2] + extra] : local;
      const rotated = panel.axis === "x" ? rotX(lifted, rad) : rotY(lifted, rad);
      return parent(vadd(panel.hinge, rotated));
    };
    cache.set(id, xf);
    return xf;
  };

  for (const panel of panels) build(panel.id);
  return cache;
}

export function facesFrom(panels: PanelDef[], t: number): WorldFace[] {
  const map = xforms(panels, t, true);
  return panels.map((panel) => {
    const xf = map.get(panel.id)!;
    const raw = panel.poly.map(([x, y]) => xf([x, y, 0]));
    const ride = panel.ride?.(t, raw) ?? [0, 0, 0];
    const points =
      ride[0] || ride[1] || ride[2] ? raw.map((point) => vadd(point, ride)) : raw;
    return {
      id: panel.id,
      name: panel.name,
      points,
      fill: panel.fill,
      stack: panel.stack,
    };
  });
}

function quant(n: number) {
  return Math.round(n * 1000) / 1000;
}

function edgeKey(a: Pt, b: Pt) {
  const s1 = `${quant(a[0])},${quant(a[1])}`;
  const s2 = `${quant(b[0])},${quant(b[1])}`;
  return s1 < s2 ? `${s1}|${s2}` : `${s2}|${s1}`;
}

export function netFromPanels(panels: PanelDef[]): NetModel {
  const map = xforms(panels, 0);
  const crease = new Set<string>();
  const raw: { a: Pt; b: Pt; key: string }[] = [];
  const flatPanels: { points: Pt[]; tone: PanelTone; label?: string }[] = [];

  for (const panel of panels) {
    const xf = map.get(panel.id)!;
    const localWorld = panel.poly.map(([x, y]) => {
      const p = xf([x, y, 0]);
      return [p[0], p[1]] as Pt;
    });
    flatPanels.push({
      points: localWorld,
      tone: panel.tone,
      label: panel.netLabel,
    });

    for (let i = 0; i < panel.poly.length; i++) {
      const j = (i + 1) % panel.poly.length;
      const perp = (pt: Pt) => (panel.axis === "x" ? pt[1] : pt[0]);
      const onHinge =
        panel.parent !== null &&
        panel.tone !== "slot" &&
        Math.abs(perp(panel.poly[i])) < 1e-3 &&
        Math.abs(perp(panel.poly[j])) < 1e-3;
      const a = localWorld[i];
      const b = localWorld[j];
      const key = edgeKey(a, b);
      if (onHinge) crease.add(key);
      raw.push({ a, b, key });
    }
  }

  const count = new Map<string, number>();
  for (const edge of raw) count.set(edge.key, (count.get(edge.key) ?? 0) + 1);

  const cuts: [Pt, Pt][] = [];
  const folds: [Pt, Pt][] = [];
  const seen = new Set<string>();
  const all: Pt[] = [];

  for (const edge of raw) {
    all.push(edge.a, edge.b);
    if (seen.has(edge.key)) continue;
    seen.add(edge.key);
    const shared = (count.get(edge.key) ?? 0) > 1 || crease.has(edge.key);
    (shared ? folds : cuts).push([edge.a, edge.b]);
  }

  return normalizeNet(flatPanels, cuts, folds, all);
}

function normalizeNet(
  panels: { points: Pt[]; tone: PanelTone; label?: string }[],
  cuts: [Pt, Pt][],
  folds: [Pt, Pt][],
  all: Pt[],
): NetModel {
  const flip = ([x, y]: Pt): Pt => [x, -y];
  const flipped = all.map(flip);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of flipped) {
    minX = Math.min(minX, p[0]);
    minY = Math.min(minY, p[1]);
    maxX = Math.max(maxX, p[0]);
    maxY = Math.max(maxY, p[1]);
  }
  const move = (p: Pt): Pt => [flip(p)[0] - minX, flip(p)[1] - minY];
  const movedPanels = panels.map((panel) => ({
    ...panel,
    points: panel.points.map(move),
  }));
  let area = 0;
  for (const panel of movedPanels) {
    const piece = polygonArea(panel.points);
    area += panel.tone === "slot" ? -piece : piece;
  }
  return {
    width: maxX - minX,
    height: maxY - minY,
    area,
    panels: movedPanels,
    cuts: cuts.map(([a, b]) => [move(a), move(b)]),
    folds: folds.map(([a, b]) => [move(a), move(b)]),
  };
}

export function structuralCount(panels: PanelDef[]) {
  return panels.filter((panel) => panel.tone !== "slot").length;
}
