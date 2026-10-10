import type { Dims } from "@/lib/fefco-types";
import { asNumber, resolveParams, type OverrideMap, type ParamDef } from "@/lib/params/resolve";

/** Default caliper ≈ E-flute board (mm). */
export const DEFAULT_THICKNESS = 1.5;

/** Girth compensation coefficients from the glue flap, matching open-dieline RTE pattern. */
export const GIRTH_COMP_FROM_GLUE = [0, 1, 1, 2] as const;

export function tuckClearance(thickness: number) {
  return 0.5 + thickness;
}

/** Ideal double-crease bridge width for roll-end mailers (CardboardShaper-style 2t+0.4). */
export function rollBridge(thickness: number) {
  return Math.max(4, Math.round((2 * thickness + 0.4) * 10) / 10);
}

export function slotKerf(thickness: number) {
  return Math.max(1.2, thickness + 0.4);
}

const BOARD_DEFS: ParamDef[] = [
  { key: "L", unit: "mm", default: 300, min: 1 },
  { key: "W", unit: "mm", default: 200, min: 1 },
  { key: "H", unit: "mm", default: 80, min: 1 },
  { key: "G", unit: "mm", default: 0, min: 0 },
  { key: "T", unit: "mm", default: DEFAULT_THICKNESS, min: 0.5, max: 8 },
  {
    key: "tuckClearance",
    unit: "mm",
    default: 2,
    derivedDefault: (p) => tuckClearance(asNumber(p, "T")),
  },
  {
    key: "bridge",
    unit: "mm",
    default: 4,
    derivedDefault: (p) => rollBridge(asNumber(p, "T")),
  },
  {
    key: "slotKerf",
    unit: "mm",
    default: 1.9,
    derivedDefault: (p) => slotKerf(asNumber(p, "T")),
  },
];

export type BoardResolved = {
  L: number;
  W: number;
  H: number;
  G: number;
  T: number;
  tuckClearance: number;
  bridge: number;
  slotKerf: number;
};

export function resolveBoard(dims: Dims, overrides: OverrideMap = {}): BoardResolved {
  const base: OverrideMap = {
    L: dims.L,
    W: dims.W,
    H: dims.H,
    G: dims.G,
    T: dims.T,
    ...overrides,
  };
  const resolved = resolveParams(BOARD_DEFS, base);
  return {
    L: asNumber(resolved, "L"),
    W: asNumber(resolved, "W"),
    H: asNumber(resolved, "H"),
    G: asNumber(resolved, "G"),
    T: asNumber(resolved, "T"),
    tuckClearance: asNumber(resolved, "tuckClearance"),
    bridge: asNumber(resolved, "bridge"),
    slotKerf: asNumber(resolved, "slotKerf"),
  };
}

export function boardT(d: Dims) {
  return Number.isFinite(d.T) && d.T > 0 ? d.T : DEFAULT_THICKNESS;
}
