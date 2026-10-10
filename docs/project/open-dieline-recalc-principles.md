# open-dieline — merge-relevant recalculation principles

Source tree explored: `/tmp/open-dieline` (clone of BrownBear127/open-dieline). Compared against FEFCO host at `/workspace` (`PanelDef` in `src/lib/fold.ts`).

---

## 1. Stack, run, GitHub, version

| Item | Value |
|------|--------|
| Name | `open-dieline` |
| Version | **1.4.1** (`package.json`, CHANGELOG 2026-08-06) |
| GitHub | https://github.com/BrownBear127/open-dieline.git |
| Live | https://tool.konvolut.art |
| License | PolyForm Noncommercial 1.0.0 |
| Stack | Vite 6 + React 19 + TypeScript 6 + Tailwind 4 + Three.js 0.185; Vitest + Playwright |
| Run | Node ≥20; `npm install` → `npm run dev` → usually `http://localhost:5173` |
| Other scripts | `npm test` (vitest + style-gate), `npm run build`, `npm run typecheck`, `npm run e2e` |

All geometry runs in-browser; no server upload of imported dielines.

---

## 2. Architecture (absolute paths)

Plugin box modules self-register at import; UI never imports box internals for data — only side-effect imports to populate the registry.

| Role | Path |
|------|------|
| Types / contracts | `/tmp/open-dieline/src/core/types.ts` |
| Registry + `resolveParams` | `/tmp/open-dieline/src/core/registry.ts` |
| Geometry / path builder | `/tmp/open-dieline/src/core/geometry.ts`, `path.ts`, `primitives.ts` |
| Layers / styles | `/tmp/open-dieline/src/core/layers.ts`, `styles.ts` |
| Pieces validation | `/tmp/open-dieline/src/core/pieces.ts` |
| Imposition (not merge-core) | `/tmp/open-dieline/src/core/imposition.ts` |
| Box: RTE | `/tmp/open-dieline/src/boxes/reverse-tuck-end.ts` |
| Box: telescope | `/tmp/open-dieline/src/boxes/telescope/index.ts` (+ `tray.ts`, `liner.ts`) |
| Box: TTSL | `/tmp/open-dieline/src/boxes/tuck-top-snap-lock.ts` |
| Box: triangular tube | `/tmp/open-dieline/src/boxes/triangular-tube.ts` |
| Param hook | `/tmp/open-dieline/src/ui/useParams.ts` |
| App dataflow | `/tmp/open-dieline/src/ui/App.tsx` |
| Fold types / schedule / pose | `/tmp/open-dieline/src/fold/types.ts`, `schedule.ts`, `pose3d.ts` |
| Fold scene | `/tmp/open-dieline/src/fold/scene-spec.ts`, `scene-pose.ts`, `registry.ts` |
| Fold models | `/tmp/open-dieline/src/fold/models/*.ts` |
| Panelize from dieline | `/tmp/open-dieline/src/fold/derive/panelize.ts` |
| Fold validate | `/tmp/open-dieline/src/fold/validate.ts` |
| Export | `/tmp/open-dieline/src/export/svg.ts`, `dxf.ts` |

**Dataflow (App):** `useParams(boxId)` → `values` → `mod.generate(values)` → `GenerateResult` → Canvas + ExportBar; invariants re-run on every `values`/`result` change for UI warnings.

---

## 3. Param system

### Units (`BoxParamDef.unit`)

`mm` | `deg` | `bool` | `enum` — validated at `registerBox` (`registry.ts` `validateBoxParamDef`).

- `enum` requires non-empty `options`; default must be in options.
- `bool` default must be boolean.
- `mm`/`deg` default must be number; min/max checked if present.
- `derivedDefault` allowed **only** on `mm`/`deg`.

### `resolveParams` priority (high → low)

Documented and implemented in `/tmp/open-dieline/src/core/registry.ts` lines 118–178:

1. **User override** for that key (even if the param has `derivedDefault`)
2. **`derivedDefault(resolvedSoFar)`** — cascade over already-resolved prior params
3. **Static `default`**

Forward-reference guard: `derivedDefault` reads go through a Proxy; reading a declared key not yet written throws (prevents silent NaN).

Unknown override keys throw (`validateOverrideKeys`) — “fake knobs” forbidden.

### Override model (`useParams.ts`)

- State = **`overrides: Partial<Record>` only**, not full resolved map.
- Every render: `values = resolveParams(mod, overrides)`.
- Changing an upstream override (e.g. `thickness`) immediately re-derives downstream unset fields (e.g. `tuckClearance`).
- `setValue` / `resetOne` / `reset`; `overriddenKeys` drives UI “manual vs derived” styling.
- Switching `boxId` clears overrides (render-phase reset + guard against cross-box key bleed).

### FEFCO contrast

FEFCO host (`/workspace/src/lib/fefco-types.ts`) exposes flat `Dims { L,W,H,G }` with no override/derivedDefault cascade — this is the main portable principle for the merge.

---

## 4. Supported box styles / FEFCO codes

| Registry id | Name | Topology | FEFCO code? |
|-------------|------|----------|-------------|
| `rte` | Reverse Tuck End | `linear` | **None** (cartons / folding carton; not corrugated FEFCO catalog) |
| `telescope` | Telescope 3-piece (lid/base/optional liner) | multi-piece | **None** (tray/telescope, not FEFCO-coded) |
| `ttsl` | Tuck Top Snap Lock | linear body + snap base | **None** |
| `ttb` | Triangular tube | tube | **None** |

**No FEFCO codes anywhere** in open-dieline (grep clean). Closest conceptual cousins for FEFCO merge:

- RTE / TTSL ≈ slotted carton with tuck ends (not 0201 RSC).
- Telescope ≈ tray/lid systems (feels nearer 04xx trays) but geometry is production-calibrated folding carton, not FEFCO board styles.

FEFCO host codes today: `0201`, `0215`, `0422`, `0427`, `0470`, `0471`.

---

## 5. Concrete formulas — Reverse Tuck End

File: `/tmp/open-dieline/src/boxes/reverse-tuck-end.ts`

### Params (defaults)

| Key | Default | Notes |
|-----|---------|-------|
| L, W, D | 55, 55, 117 mm | inside finished dims |
| thickness | 0.3 mm | drives girth + tuckClearance |
| tuckDepth / tuckRadius | 12 / 3 | |
| tuckClearance | default 0.5; **derived** | see below |
| tuckLock | 20 | friction lock width; 0 disables |
| dustFlapDepth | 14 | |
| flapNotch / creaseRelief | 3 / 3 | |
| glueSize / glueSide | 12 / `'left'` | |

### derivedDefault — tuck inset

```ts
// reverse-tuck-end.ts ~143
derivedDefault: (p) => 0.5 + (p.thickness as number),
```

Used as `tInset = tuckClearance` in generate (~308); tongue left/right:

```ts
const xt1 = lid.start + tInset;
const xt2 = lid.end - tInset;
```

### Thickness / girth compensation

```ts
// ~272
const GIRTH_COMP_FROM_GLUE = [0, 1, 1, 2] as const;
// panel order from glue side; glueOnRight → reverse table
const wP1 = L + comp[0] * t;
const wP2 = W + comp[1] * t;
const wP3 = L + comp[2] * t;
const wP4 = W + comp[3] * t;
const hBody = D;
const hLid = W;          // lid height = W; NO girth on lid height
const hTuck = tuckDepth;
```

Sum of coeffs = 4 → total unfold width adds `4*t` (invariant `unfold-width`).

### Relief / scoring clearance

```ts
const xGapVal = Math.max(flapNotch > 0 ? flapNotch : 0, creaseRelief > 0 ? creaseRelief : 0);
const reliefGap = (xGapVal > 0 ? xGapVal : 3) + t;  // +t dust-flap clearance
const notchHeight = Math.max(3, reliefGap * 0.6);
```

Creases: vertical body folds at `x1,x2,x3` tagged `fold:P1>P2` etc.; lid/dust hinges tagged `fold:…`. Glue flap cut uses `GLUE_CHAMFER = 5` (`primitives.ts`). Friction lock: `LOCK_HEIGHT=1.5`, `LOCK_CHAMFER=2`.

### Tuck radius clamp (generate)

```ts
const effectiveR = Math.max(0, Math.min(r, hTuck, tongueHalfWidth));
```

### Telescope (secondary, portable compensation pattern)

`/tmp/open-dieline/src/boxes/telescope/index.ts` generate (~742+):

```ts
lidPanelX = baseWidth + 2 * lidMarginX;
lidPanelY = baseLength + 2 * lidMarginY;
```

Thickness **decoupled** into explicit knobs (merge lesson): `rootJog`, `innerWallReduction`, `wallTopCompensation` (defaults 0.5 / 0.8 / 0.5) instead of hard-coding `±t` / `2t`. Still uses `thickness` for gusset `reach = height − t` and liner fit.

### TTSL derivedDefaults (ratio cascade)

`/tmp/open-dieline/src/boxes/tuck-top-snap-lock.ts`:

- `lockFlapDepth = 0.7 * W`
- `lockReceiveWidth = (39.5/85) * L`
- `lockReceiveDepth = 0.2 * W`
- `lockTabWidth = (31.5/85) * L`

Same girth table `[0,1,1,2]` on body panels when thickness > 0.

---

## 6. Fold / assembly vs FEFCO `PanelDef` tree

### open-dieline model

1. **2D generate first** → `GenerateResult` (cut/crease/halfcut paths + `fold:Parent>Child` tags).
2. **`panelizeFoldModel`** (`fold/derive/panelize.ts`) extracts planar faces from cut/crease graph, builds parent/child `FoldPanel` tree from fold tags, attaches hinge lines.
3. **`FoldModel`**: `{ panels, steps, dieline, seams? }` (`fold/types.ts`).
   - `FoldPanel`: polygon (flat net coords, CCW), `parent`, `hingeLine`, `foldAngle` (rad), optional `angleFn`, `liftOffset`, `vertexClamp`.
   - `FoldStep`: `{ panelIds, t0, t1, ease }` — timeline schedule.
4. **`foldPose(t, model)`** (`schedule.ts`): per-panel angle from step local progress + easing.
5. **`pose3d`**: Rodrigues rotation about hinge; parent×child transform compose.
6. **Multi-piece scenes** (`scene-spec.ts` + `fold/registry.ts`): `FoldSceneSpec` with per-piece `foldWindow` and `assemblyTrack` keyframes (telescope lid/base/liner assemble after fold).

RTE schedule example (`fold/models/reverse-tuck-end.ts`): body panels 0–0.35 → bottom dust → bottom tuck → bottom lid → top dust → top tuck → top lid; all non-root angles `−π/2`.

### FEFCO `PanelDef` (`/workspace/src/lib/fold.ts`)

Hand-authored tree: `{ id, parent, hinge, axis:'x'|'y', sign, angle:(t)=>deg, poly, fill, tone, lift? }`.

- Net + folds derived **from** panels (`netFromPanels`), not the reverse.
- No separate schedule object — each panel’s `angle(t)` encodes phase.
- Axis-aligned hinges only (rotX/rotY), not arbitrary crease hinges.

### Merge implication

Portable idea: **single parametric generate → tagged creases → derived fold tree + timed steps**. FEFCO currently inverts that (panels define net). For correct close/assemble viz, either:

- adopt schedule + hinge-from-crease panelization, or
- keep `PanelDef` but drive `poly`/hinges from a thickness-aware generator (open-dieline’s order of truth).

---

## 7. Invariants / validation

### Box invariants (`BoxInvariant` in types.ts)

Shared by CI tests and UI warnings:

- `severity?: 'error' | 'warning'` (default error).
- `check(params, result) → { ok } | { ok:false, message, tags? }`.
- `tags` highlight matching `DielinePath.tags` in Canvas.

RTE examples: `unfold-width`, `lid-equals-w`, `tuck-lock-fits`, `no-nan`, `no-bleed`, `bounds-cover`, `tuck-radius-clamped` (warning), `no-cut-self-intersection`.

Fold build path: `assertBoxInvariants` throws `InvalidBoxParamsError` on error-severity failures only (warnings pass).

### Fold-model validation (`validateFoldModel`)

Structural checks: unique ids, exactly one root with `foldAngle===0`, finite polygons CCW area > 0, hinge on parent+child edges, `liftOffset` leaf-only, step coverage, etc.

### Register-time validation

Param unit/default/options/`derivedDefault` legality at `registerBox`.

---

## 8. Export layers (cut / crease / halfcut)

### Canonical buckets (`core/layers.ts`)

Order: `cut` → `crease` → `halfcut` → `dimensions`.

`LineType` → bucket: cut/crease/halfcut 1:1; dimension/annotation/bleed → `dimensions`.

### Styles (`core/styles.ts`)

| Type | Stroke | Notes |
|------|--------|-------|
| cut | `#000000` 0.4 | solid |
| crease | `#00FF00` 0.4 | dash `4 2` |
| halfcut | `#FFFF00` 0.4 | dash `1 1` |

### SVG (`export/svg.ts`)

`<g id="CUT|CREASE|HALFCUT|DIMENSIONS" data-name="…">`. Manufacturing mode: only cut/crease/halfcut, stroke 0.25 solid, round caps; no texts/dimensions.

### DXF (`export/dxf.ts`)

Layers `CUT` / `CREASE` / `HALFCUT` only; dimension/annotation/texts excluded. R12 ASCII, mm, no Y-flip in v1.

**halfcut usage:** telescope tongue folds (A/B wall styles in `tray.ts`); RTE has no halfcut paths (layer row shown empty/disabled in UI).

---

## 9. Portable to Next.js FEFCO app vs irrelevant

### Portable (merge these)

1. **Override + `derivedDefault` cascade** (`resolveParams` / `useParams`) so changing L/W/H/thickness recomputes dependent clearances without stale state.
2. **Thickness / compensation tables** — progressive girth `[0,1,1,2]*t`; tuck clearance `base + t`; explicit compensation knobs (telescope pattern) when `t` coupling is wrong.
3. **Generate as single source of truth** for net geometry; fold viz consumes tagged creases / panelize or regenerated `PanelDef.poly`.
4. **Invariant checks** on generate output (bounds cover, no NaN, self-intersection, dimension consistency) shared by UI + tests.
5. **Layer taxonomy** cut/crease/(halfcut) with manufacturing export filter — if FEFCO ships SVG/DXF.
6. **Primitives library idea** — friction lock, relief slots, glue chamfer as shared mm helpers.
7. **Fold schedule** (phased `t0–t1` + ease) for realistic close sequence vs single global `t` per panel only.
8. **Multi-piece scene tracks** if any FEFCO style needs lid-on-base assembly (less critical for 0201).

### FEFCO-irrelevant / do not port as core

| Area | Paths | Why skip |
|------|-------|----------|
| Imposition / nest | `core/imposition.ts`, `ui/Imposition*` | Print-sheet nesting estimator |
| Overlay calibration | `overlay/*` | Import production SVG 1:1 compare |
| Artwork editor / fold template upload | `ui/editor/*`, fold capabilities flags | Packaging artwork workflow |
| i18n zh/en | `i18n/*`, `LocalizedText` | FEFCO app is RU/EN-oriented; keep one locale model |
| Vite app shell / Tailwind engineering chrome | `ui/App.tsx` layout | Host is Next 15 + shadcn |
| PolyForm NC license coupling | LICENSE | Legal; principles ≠ copy code blindly |
| Carton-specific styles (RTE/TTSL/telescope) as FEFCO codes | `boxes/*` | No FEFCO IDs; formulas are patterns, not drop-in 0201/0427 |
| Vercel analytics, announcement modal | assorted UI | Product chrome |

### Suggested merge mapping (for coordinator)

| open-dieline principle | FEFCO touchpoint |
|------------------------|------------------|
| `resolveParams` cascade | Replace ad-hoc dim edits in box modules with derived glue/flap/slot sizes from `Dims` + board caliper |
| Girth / clearance `+t` | Feed into `rsc0201`, `mailer0427`, wraps when net edges depend on board |
| `generate` → net | Keep FEFCO codes; rewrite each `*Panels(d)` to recompute `poly`/cuts from dims every call (already mostly pure — ensure no cached stale geometry) |
| Fold steps | Enrich `angle(t)` with phased schedules matching real close order (user complaint: folds not realistic) |
| Invariants | Add checks: net width/height vs L+W+…+glue, flap fits aperture |

---

## Key file citation index

- Priority / cascade: `registry.ts` 118–178; `useParams.ts` 1–78
- RTE math: `reverse-tuck-end.ts` 143, 272–308, 458–497, 591–805
- Fold schedule RTE: `fold/models/reverse-tuck-end.ts` 12–67
- Layers/export: `layers.ts`, `styles.ts`, `export/svg.ts`, `export/dxf.ts`
- FEFCO PanelDef: `/workspace/src/lib/fold.ts` 47–62
