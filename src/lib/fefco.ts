import {
  centroid,
  phase,
  polygonArea,
  rotX,
  rotY,
  vadd,
  type Pt,
  type Vec3,
} from "@/lib/math";

export type BoxId = "0201" | "0422" | "0427";

export type Dims = {
  L: number;
  W: number;
  H: number;
  G: number;
};

export type FaceFill =
  | "floor"
  | "front"
  | "side"
  | "back"
  | "flap"
  | "flapDark"
  | "lock"
  | "lid"
  | "tuck";

export type PanelTone = "body" | "flap" | "lock" | "lid" | "glue" | "floor";

export type WorldFace = {
  id: string;
  name: string;
  points: Vec3[];
  fill: FaceFill;
  stack: number;
  label?: string;
  /** bottom-left, bottom-right, top-left indices */
  labelAt?: [number, number, number];
};

export type NetModel = {
  width: number;
  height: number;
  area: number;
  panels: { points: Pt[]; tone: PanelTone; label?: string }[];
  cuts: [Pt, Pt][];
  folds: [Pt, Pt][];
};

export type Stage = {
  title: string;
  detail: string;
  at: number;
};

export type BoxMeta = {
  id: BoxId;
  code: string;
  title: string;
  group: string;
  summary: string;
  selfAssembly: boolean;
  formula: string;
  defaults: Dims;
  stages: Stage[];
};

type Axis = "x" | "y";

type PanelDef = {
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
  label?: string;
  labelAt?: [number, number, number];
  netLabel?: string;
};

type Xform = (p: Vec3) => Vec3;

const identity: Xform = (p) => p;

function xforms(panels: PanelDef[], t: number) {
  const byId = new Map(panels.map((p) => [p.id, p]));
  const cache = new Map<string, Xform>();

  const build = (id: string): Xform => {
    const cached = cache.get(id);
    if (cached) return cached;
    const panel = byId.get(id);
    if (!panel) throw new Error(`Нет панели ${id}`);
    const parent = panel.parent ? build(panel.parent) : identity;
    const rad = (panel.sign * panel.angle(t) * Math.PI) / 180;
    const xf: Xform = (local) => {
      const rotated = panel.axis === "x" ? rotX(local, rad) : rotY(local, rad);
      return parent(vadd(panel.hinge, rotated));
    };
    cache.set(id, xf);
    return xf;
  };

  for (const panel of panels) build(panel.id);
  return cache;
}

export function facesFrom(panels: PanelDef[], t: number): WorldFace[] {
  const map = xforms(panels, t);
  return panels.map((panel) => {
    const xf = map.get(panel.id)!;
    return {
      id: panel.id,
      name: panel.name,
      points: panel.poly.map(([x, y]) => xf([x, y, 0])),
      fill: panel.fill,
      stack: panel.stack,
      label: panel.label,
      labelAt: panel.labelAt,
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
        Math.abs(perp(panel.poly[i])) < 1e-4 &&
        Math.abs(perp(panel.poly[j])) < 1e-4;
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
  return {
    width: maxX - minX,
    height: maxY - minY,
    area: movedPanels.reduce((sum, panel) => sum + polygonArea(panel.points), 0),
    panels: movedPanels,
    cuts: cuts.map(([a, b]) => [move(a), move(b)]),
    folds: folds.map(([a, b]) => [move(a), move(b)]),
  };
}

export const CATALOG: Record<BoxId, BoxMeta> = {
  "0201": {
    id: "0201",
    code: "0201",
    title: "Четырёхклапанная",
    group: "02 · складные коробки",
    summary:
      "Классический рукав FEFCO 0201. Клеевой клапан соединяет обечайку, верх закрывается в два шага: сначала малые клапаны, затем большие.",
    selfAssembly: false,
    formula: "[2 × (Д + Ш) + клапан] × (В + Ш)",
    defaults: { L: 300, W: 200, H: 150, G: 30 },
    stages: [
      { title: "Открыта", detail: "клапаны наружу", at: 0.04 },
      { title: "Малые клапаны", detail: "Ш-стороны", at: 0.5 },
      { title: "Большие клапаны", detail: "ложатся сверху", at: 1 },
    ],
  },
  "0422": {
    id: "0422",
    code: "0422",
    title: "Самосборный лоток",
    group: "04 · самосборные",
    summary:
      "Лоток без крышки. Торцы поднимаются, ушки заходят внутрь, боковые стенки накрывают их замками. Клей и скотч не нужны.",
    selfAssembly: true,
    formula: "дно Д × Ш, стенки В, ушки и двойные замки",
    defaults: { L: 320, W: 220, H: 70, G: 0 },
    stages: [
      { title: "Плоский лист", detail: "до сгиба", at: 0.02 },
      { title: "Торцы", detail: "стенки вверх", at: 0.3 },
      { title: "Ушки", detail: "внутрь короба", at: 0.5 },
      { title: "Боковины", detail: "стенки вверх", at: 0.72 },
      { title: "Замки", detail: "накрывают ушки", at: 1 },
    ],
  },
  "0427": {
    id: "0427",
    code: "0427",
    title: "Лоток с крышкой",
    group: "04 · самосборные",
    summary:
      "Самосборное основание с передним замком, откидная крышка и язычок. Сборка идёт с плоского листа в масштабе введённых размеров.",
    selfAssembly: true,
    formula: "лоток + крышка Д × Ш и язычок",
    defaults: { L: 300, W: 220, H: 80, G: 0 },
    stages: [
      { title: "Плоский лист", detail: "до сгиба", at: 0.02 },
      { title: "Торцы", detail: "стенки вверх", at: 0.16 },
      { title: "Ушки", detail: "внутрь короба", at: 0.3 },
      { title: "Задняя стенка", detail: "под крышку", at: 0.52 },
      { title: "Передний замок", detail: "фиксирует ушки", at: 0.6 },
      { title: "Крышка", detail: "накрывает верх", at: 0.8 },
      { title: "Язычок", detail: "заправляется внутрь", at: 1 },
    ],
  },
};

function rscPanels(d: Dims): PanelDef[] {
  const { L, W, H } = d;
  const f = W / 2;
  const drop = Math.min(H * 0.008, 1);
  const fixed = () => 90;
  const small = (t: number) => phase(t, 0.06, 0.46, -42, 90);
  const big = (t: number) => phase(t, 0.54, 0.98, -42, 90);

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
    },
    {
      id: "front",
      name: "Передняя стенка",
      parent: "floor",
      hinge: [0, 0, 0],
      axis: "x",
      sign: -1,
      angle: fixed,
      poly: [
        [0, 0],
        [L, 0],
        [L, -H],
        [0, -H],
      ],
      fill: "front",
      tone: "body",
      stack: 0,
      label: "OptoPack",
      labelAt: [0, 1, 3],
    },
    {
      id: "back",
      name: "Задняя стенка",
      parent: "floor",
      hinge: [0, W, 0],
      axis: "x",
      sign: 1,
      angle: fixed,
      poly: [
        [0, 0],
        [L, 0],
        [L, H],
        [0, H],
      ],
      fill: "back",
      tone: "body",
      stack: 0,
      label: "OptoPack",
      labelAt: [1, 0, 2],
    },
    {
      id: "left",
      name: "Левая стенка",
      parent: "floor",
      hinge: [0, 0, 0],
      axis: "y",
      sign: 1,
      angle: fixed,
      poly: [
        [0, 0],
        [0, W],
        [-H, W],
        [-H, 0],
      ],
      fill: "side",
      tone: "body",
      stack: 0,
    },
    {
      id: "right",
      name: "Правая стенка",
      parent: "floor",
      hinge: [L, 0, 0],
      axis: "y",
      sign: -1,
      angle: fixed,
      poly: [
        [0, 0],
        [0, W],
        [H, W],
        [H, 0],
      ],
      fill: "side",
      tone: "body",
      stack: 0,
    },
    {
      id: "flap-front",
      name: "Большой клапан · передний",
      parent: "front",
      hinge: [0, -H, 0],
      axis: "x",
      sign: -1,
      angle: big,
      poly: [
        [0, 0],
        [L, 0],
        [L, -f],
        [0, -f],
      ],
      fill: "flap",
      tone: "flap",
      stack: 4,
    },
    {
      id: "flap-back",
      name: "Большой клапан · задний",
      parent: "back",
      hinge: [0, H, 0],
      axis: "x",
      sign: 1,
      angle: big,
      poly: [
        [0, 0],
        [L, 0],
        [L, f],
        [0, f],
      ],
      fill: "flapDark",
      tone: "flap",
      stack: 4,
    },
    {
      id: "flap-left",
      name: "Малый клапан · левый",
      parent: "left",
      hinge: [-(H - drop), 0, 0],
      axis: "y",
      sign: 1,
      angle: small,
      poly: [
        [0, 0],
        [0, W],
        [-f, W],
        [-f, 0],
      ],
      fill: "flap",
      tone: "flap",
      stack: 2,
    },
    {
      id: "flap-right",
      name: "Малый клапан · правый",
      parent: "right",
      hinge: [H - drop, 0, 0],
      axis: "y",
      sign: -1,
      angle: small,
      poly: [
        [0, 0],
        [0, W],
        [f, W],
        [f, 0],
      ],
      fill: "flapDark",
      tone: "flap",
      stack: 2,
    },
  ];
}

function buildRscNet(d: Dims): NetModel {
  const { L, W, H, G } = d;
  const f = W / 2;
  const width = 2 * (L + W) + G;
  const height = H + W;
  const panels: NetModel["panels"] = [];
  const cuts: [Pt, Pt][] = [];
  const folds: [Pt, Pt][] = [];
  const sizes = [L, W, L, W];
  const names = ["Д", "Ш", "Д", "Ш"];

  const rect = (
    x: number,
    y: number,
    w: number,
    h: number,
    tone: PanelTone,
    label?: string,
  ) => {
    panels.push({
      points: [
        [x, y],
        [x + w, y],
        [x + w, y + h],
        [x, y + h],
      ],
      tone,
      label,
    });
  };

  let x = G;
  sizes.forEach((w, i) => {
    rect(x, f, w, H, "body", names[i]);
    rect(x, 0, w, f, "flap");
    rect(x, f + H, w, f, "flap");
    folds.push([
      [x, f],
      [x + w, f],
    ]);
    folds.push([
      [x, f + H],
      [x + w, f + H],
    ]);
    if (i < 3) {
      cuts.push([
        [x + w, 0],
        [x + w, f],
      ]);
      folds.push([
        [x + w, f],
        [x + w, f + H],
      ]);
      cuts.push([
        [x + w, f + H],
        [x + w, height],
      ]);
    }
    x += w;
  });

  cuts.push([
    [G, 0],
    [width, 0],
  ]);
  cuts.push([
    [G, height],
    [width, height],
  ]);
  cuts.push([
    [width, 0],
    [width, height],
  ]);

  if (G > 0) {
    const bevel = Math.min(G * 0.3, H * 0.15);
    const p: Pt[] = [
      [G, f],
      [0, f + bevel],
      [0, f + H - bevel],
      [G, f + H],
    ];
    panels.push({ points: p, tone: "glue", label: "клей" });
    for (let i = 0; i < 3; i++) cuts.push([p[i], p[i + 1]]);
    folds.push([
      [G, f],
      [G, f + H],
    ]);
    cuts.push([
      [G, 0],
      [G, f],
    ]);
    cuts.push([
      [G, f + H],
      [G, height],
    ]);
  } else {
    cuts.push([
      [0, 0],
      [0, height],
    ]);
  }

  return {
    width,
    height,
    area: panels.reduce((sum, panel) => sum + polygonArea(panel.points), 0),
    panels,
    cuts,
    folds,
  };
}

function ear(
  span: [number, number],
  depth: number,
  dir: 1 | -1,
): Pt[] {
  const [a, b] = span;
  const m = Math.max(1.6, Math.abs(b - a) * 0.08);
  const sign = b > a ? 1 : -1;
  const start = a + sign * m;
  const end = b - sign * m;
  const midTip = a + (b - a) * 0.68;
  const notch = a + (b - a) * 0.42;
  return [
    [start, 0],
    [end, 0],
    [end, dir * depth * 0.56],
    [midTip, dir * depth],
    [notch, dir * depth * 0.7],
    [start, dir * depth * 0.2],
  ];
}

function selfLockPanels(d: Dims, lid: boolean): PanelDef[] {
  const { L, W, H } = d;
  const E = Math.min(L * 0.44, Math.max(H * 0.9, 18));
  const R = Math.max(10, H * 0.78);
  const inset = Math.max(2.5, Math.min(8, L * 0.025));
  const tuck = Math.min(H * 0.68, Math.max(14, W * 0.4));
  const tuckInset = Math.max(4, L * 0.045);

  const ends = (t: number) => phase(t, 0.02, lid ? 0.16 : 0.3, 0, 90);
  const ears = (t: number) => phase(t, lid ? 0.12 : 0.22, lid ? 0.3 : 0.5, 0, 94);
  const frontWall = (t: number) => phase(t, lid ? 0.28 : 0.42, lid ? 0.46 : 0.7, 0, 90);
  const backWall = (t: number) => phase(t, lid ? 0.34 : 0.42, lid ? 0.52 : 0.7, 0, 90);
  const locks = (t: number) => phase(t, lid ? 0.42 : 0.64, lid ? 0.58 : 0.98, 0, 166);
  const lidAngle = (t: number) => phase(t, 0.56, 0.8, 0, 90);
  const tuckAngle = (t: number) => phase(t, 0.76, 1, 0, 106);

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
      angle: frontWall,
      poly: [
        [0, 0],
        [L, 0],
        [L, -H],
        [0, -H],
      ],
      fill: "front",
      tone: "body",
      stack: 1,
      label: "OptoPack",
      labelAt: [0, 1, 3],
      netLabel: "Перед",
    },
    {
      id: "front-lock",
      name: "Передний замок",
      parent: "front",
      hinge: [0, -H, 0],
      axis: "x",
      sign: -1,
      angle: locks,
      poly: [
        [inset, 0],
        [L - inset, 0],
        [L - inset, -R],
        [inset, -R],
      ],
      fill: "lock",
      tone: "lock",
      stack: 5,
      netLabel: "Замок",
    },
    {
      id: "back",
      name: "Задняя стенка",
      parent: "floor",
      hinge: [0, W, 0],
      axis: "x",
      sign: 1,
      angle: backWall,
      poly: [
        [0, 0],
        [L, 0],
        [L, H],
        [0, H],
      ],
      fill: "back",
      tone: "body",
      stack: 1,
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
      stack: 1,
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
      stack: 1,
      netLabel: "Торец",
    },
    {
      id: "ear-lf",
      name: "Ушко · левое переднее",
      parent: "left",
      hinge: [0, 0, 0],
      axis: "x",
      sign: -1,
      angle: ears,
      poly: ear([0, -H], E, -1),
      fill: "flap",
      tone: "flap",
      stack: 0,
    },
    {
      id: "ear-lb",
      name: "Ушко · левое заднее",
      parent: "left",
      hinge: [0, W, 0],
      axis: "x",
      sign: 1,
      angle: ears,
      poly: ear([0, -H], E, 1),
      fill: "flap",
      tone: "flap",
      stack: 0,
    },
    {
      id: "ear-rf",
      name: "Ушко · правое переднее",
      parent: "right",
      hinge: [0, 0, 0],
      axis: "x",
      sign: -1,
      angle: ears,
      poly: ear([0, H], E, -1),
      fill: "flapDark",
      tone: "flap",
      stack: 0,
    },
    {
      id: "ear-rb",
      name: "Ушко · правое заднее",
      parent: "right",
      hinge: [0, W, 0],
      axis: "x",
      sign: 1,
      angle: ears,
      poly: ear([0, H], E, 1),
      fill: "flapDark",
      tone: "flap",
      stack: 0,
    },
  ];

  if (!lid) {
    panels.push({
      id: "back-lock",
      name: "Задний замок",
      parent: "back",
      hinge: [0, H, 0],
      axis: "x",
      sign: 1,
      angle: locks,
      poly: [
        [inset, 0],
        [L - inset, 0],
        [L - inset, R],
        [inset, R],
      ],
      fill: "lock",
      tone: "lock",
      stack: 5,
      netLabel: "Замок",
    });
  } else {
    panels.push(
      {
        id: "lid",
        name: "Крышка",
        parent: "back",
        hinge: [0, H, 0],
        axis: "x",
        sign: 1,
        angle: lidAngle,
        poly: [
          [0, 0],
          [L, 0],
          [L, W],
          [0, W],
        ],
        fill: "lid",
        tone: "lid",
        stack: 3,
        label: "OptoPack",
        labelAt: [3, 2, 0],
        netLabel: "Крышка",
      },
      {
        id: "tuck",
        name: "Язычок",
        parent: "lid",
        hinge: [0, W, 0],
        axis: "x",
        sign: 1,
        angle: tuckAngle,
        poly: [
          [tuckInset, 0],
          [L - tuckInset, 0],
          [L - tuckInset, tuck * 0.86],
          [L * 0.8, tuck],
          [L * 0.2, tuck],
          [tuckInset, tuck * 0.86],
        ],
        fill: "tuck",
        tone: "flap",
        stack: 6,
        netLabel: "Язычок",
      },
    );
  }

  return panels;
}

export function getPanels(id: BoxId, dims: Dims): PanelDef[] | null {
  if (id === "0201") return rscPanels(dims);
  if (id === "0422") return selfLockPanels(dims, false);
  if (id === "0427") return selfLockPanels(dims, true);
  return null;
}

export function getFaces(id: BoxId, dims: Dims, t: number) {
  const panels = getPanels(id, dims);
  if (!panels) return [];
  return facesFrom(panels, t);
}

export function getNet(id: BoxId, dims: Dims): NetModel {
  if (id === "0201") return buildRscNet(dims);
  const panels = getPanels(id, dims);
  if (!panels) {
    return { width: 0, height: 0, area: 0, panels: [], cuts: [], folds: [] };
  }
  return netFromPanels(panels);
}

export function warningsFor(id: BoxId, d: Dims) {
  const messages: string[] = [];
  if (id === "0201") {
    if (d.L < 60 || d.W < 60 || d.H < 30) {
      messages.push("Размер меньше минимума 60 × 60 × 30 мм из расчёта 0201.");
    }
    if (d.L < d.W) {
      messages.push(
        "Лучше держать Д ≥ Ш: при Д < Ш малые клапаны пересекаются при закрытии.",
      );
    }
    if (d.L + d.W > 3140) {
      messages.push("Д + Ш больше 3140 мм — заготовка шире типичного формата листа.");
    }
    if (d.H + d.W > 1390) {
      messages.push("В + Ш больше 1390 мм — заготовка выше типичного формата листа.");
    }
    if (d.G === 0) {
      messages.push("Клеевого клапана нет. Стык обечайки нужно закрыть отдельно.");
    }
    if (d.G >= Math.min(d.L, d.W)) {
      messages.push("Клеевой клапан слишком широк относительно стенок.");
    }
    return messages;
  }

  if (d.L < 80 || d.W < 60 || d.H < 25) {
    messages.push("Для ручной сборки удобнее размеры не меньше 80 × 60 × 25 мм.");
  }
  if (d.H > Math.min(d.L, d.W)) {
    messages.push(
      "Высота больше меньшей стороны. Замки и язычок рассчитаны на лоток, где В меньше Д и Ш.",
    );
  }
  if (d.H > d.W * 0.95 && id === "0427") {
    messages.push("Крышка с язычком садится увереннее, когда высота меньше ширины.");
  }
  return messages;
}

export function flapNote(id: BoxId, d: Dims) {
  if (id === "0201") return `клапаны по ${fmtMm(d.W / 2)} мм`;
  const lock = Math.max(10, d.H * 0.78);
  if (id === "0422") return `замки по ${fmtMm(lock)} мм`;
  return `язычок ${fmtMm(Math.min(d.H * 0.68, Math.max(14, d.W * 0.4)))} мм`;
}

function fmtMm(n: number) {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(n);
}

export function serializeNet(net: NetModel, title: string, note: string) {
  const cuts = net.cuts
    .map(([a, b]) => `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`)
    .join("");
  const folds = net.folds
    .map(([a, b]) => `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${net.width}mm" height="${net.height}mm" viewBox="0 0 ${net.width} ${net.height}">
  <title>${escapeXml(title)}</title>
  <desc>${escapeXml(note)}</desc>
  <g id="cut" fill="none" stroke="#000" stroke-width="0.25">${cuts}</g>
  <g id="crease" fill="none" stroke="#cf5656" stroke-width="0.25" stroke-dasharray="3 2">${folds}</g>
</svg>`;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function panelCentroid(points: Pt[]) {
  return centroid(points);
}
