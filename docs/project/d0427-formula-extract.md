# d0427 — FEFCO 0427 DXF generator formula & topology extract

Source: `/tmp/d0427` → `https://github.com/bikinon/d0427.git` (Tim Gathercole; Java/Swing NetBeans app). Units in mm throughout allowances.

---

## 1. Repo, how it runs, purpose

| Item | Detail |
|------|--------|
| URL | `https://github.com/bikinon/d0427` |
| Purpose | Die-cut FEFCO **0427** style blank → DXF R12 (`CUT` / `CREASE` layers). README: open in AutoCAD / LibreCAD. |
| UI | **Swing** `JFrame0427` (`main` → Nimbus LAF → form). Buttons: **Create DXF Drawing**, **Calc Blank Size**. |
| Flow | UI → `getSizes()` → `draw0427cls.allowanceSetup()` → `Draw0427()` → write `.dxf` via `dxf12objects`. Blank size also feeds `BoardSz.CalcR2R()` (Elite/Iberica ups). |
| Style combo | UI lists `0427` / `0421` / `0422` but **create path always calls `Draw0427()`**; style field cleared. `DrawTOE()` exists for simpler TOE-only / 0423 swap — not wired from create button. |

---

## 2. Inputs & flute cases

**Pack size fields:** `lsz` × `wsz` × `dsz` → length × width × depth.

**Dim type** (`dimtype`):

- `ID: Internal Dimensions` — values used as-is → `idLength/idWidth/idDepth`.
- `OD: Outside Dimensions` — back-calc to ID using `allowanceSetup()` run with **L=W=D=0** (so additives only). Implementation is questionable (subtracts full `l1`/`w2` panel sizes, not pure caliper):
  - `idL = L − l1 − dmain`
  - `idW = W − w2 − dmain`
  - `idD = D − 2·dmain`
- `BB: Bend to Bend` — `idL = L − l1`, `idW = W − w1`, `idD = D − dmain` (same zero-dim allowance quirk).

**Flutes:** `E`, `B`, `C`, `BC`, `Carton Brd`.

**Slot types:** Rounded Ends (`slotType=0`), Square Ends (`1`), U Cut (`2`).

**Also:** output filename (default `drw0427.dxf`); parcel size check (`parcelSizes.checkSizes()` — RM letterbox/parcel limits).

---

## 3. `allowanceSetup()` — per-flute constants (mm)

Common structure after case body:

```
blks1 = (lug + dinr + dblbend + dotr) * 2 + l1
blkn2 = dinr + w1 + dmain + w2 + dfront
blks1IntLk = lug + dinr + dblbend + dotr + l1 - (l1 - l2)/2 + dside
```

Warning dialog if `depth > length`.

| Symbol | Role |
|--------|------|
| `dotr` | Outer TOE height (outer roll) |
| `dinr` | Inner TOE height (inner roll / base side panel height in flap math) |
| `dfront` | Front depth panel (arc-flap parent) |
| `dblbend` | Double-bend strip width (between outer/inner TOE) |
| `bofstL` / `bofstR` | Bend offsets L/R on base flaps / TOE outline |
| `bofst2` | Lid folder-flap inset (`ins1`/`ins2`) |
| `cofst` / `cofst2` | Cut offsets (TOE outline / arc-flap side inset) |
| `lug` | Lock-tab projection |
| `l2` | Lid panel length (score-to-score along length) |
| `l1` | Base panel length (longer than lid by double-bend allowance) |
| `w1` | Base width |
| `w2` | Lid width |
| `dside` | Lid side-folder flap depth |
| `dmain` | Main depth panel between lid and base |

### E flute

| Var | Formula |
|-----|---------|
| dotr | depth+1 |
| dinr | depth+0 |
| dfront | depth+1 |
| dblbend | **6** |
| bofstL / bofstR | **4** / **4** |
| bofst2 | **2** |
| cofst / cofst2 | **1** / **2** |
| lug | **3** (→ **2.5** if `dmain < 40`) |
| l2 | length+**2** |
| l1 | l2+(dblbend\*2+**2**) = length+**16** |
| w1 | width+**2** |
| w2 | width+**3** |
| dside | depth+**1.5** |
| dmain | depth+**2** |

### B flute

| Var | Formula |
|-----|---------|
| dotr | depth+2 |
| dinr | depth+0 |
| dfront | depth+1 |
| dblbend | **8** |
| bofstL / bofstR | **2** / **4** |
| bofst2 | **4** |
| cofst / cofst2 | **2** / **2** |
| lug | **4** |
| l2 | length+**3** |
| l1 | l2+(dblbend\*2+2) = length+**21** |
| w1 | width+**3** |
| w2 | width+**6** |
| dside | depth+**2** |
| dmain | depth+**3** |

### C flute

| Var | Formula |
|-----|---------|
| dotr | depth+3 |
| dinr | depth+1 |
| dfront | depth+2 |
| dblbend | **14** |
| bofstL / bofstR | **3** / **6** |
| bofst2 | **6** |
| cofst / cofst2 | **2** / **3** |
| lug | **5** |
| l2 | length+**5** |
| l1 | l2+(dblbend\*2+2) = length+**35** |
| w1 | width+**5** |
| w2 | width+**9** |
| dside | depth+**2** |
| dmain | depth+**5** |

### BC flute

| Var | Formula |
|-----|---------|
| dotr | depth+7 |
| dinr | depth+4 |
| dfront | depth+4 |
| dblbend | **20** |
| bofstL / bofstR | **5** / **10** |
| bofst2 | **10** |
| cofst / cofst2 | **4** / **4** |
| lug | **5** |
| l2 | length+**7** |
| l1 | l2+(dblbend\*2+2) = length+**49** |
| w1 | width+**7** |
| w2 | width+**14** |
| dside | depth+**4** |
| dmain | depth+**7** |

### Carton Brd

| Var | Formula |
|-----|---------|
| dotr | depth+0 |
| dinr | depth−0.5 |
| dfront | depth+0.5 |
| dblbend | **2** |
| bofstL / bofstR | **0.5** / **1** |
| bofst2 | **0.5** |
| cofst / cofst2 | **0.5** / **1.5** |
| lug | **2.5** |
| l2 | length+**0** |
| l1 | l2+(dblbend\*2) = length+**4** *(no +2)* |
| w1 | width+**0** |
| w2 | width+**1** |
| dside | depth+**0** |
| dmain | depth+**0.5** |

**Example E, ID 200×150×50:**  
l2=202, l1=216, w1=152, w2=153, dside=51.5, dmain=52, dfront=51, dotr=51, dinr=50, dblbend=6, lug=3  
blks1=(3+50+6+51)\*2+216=436, blkn2=50+152+52+153+51=458.

---

## 4. `Draw0427()` topology

Coordinate frame: turtle graphics via `Xaxis`/`Yaxis` (±1) and `absMove`/`relMove`/`Line`. Origin top-left of lid.

### Derived before draw

```
inr2otr = (l1 − l2) / 2          // half of base-vs-lid length growth (double-bend related)
ba = floor(sqrt(w1² + dmain²) − w1 + 5)   // angled cut on lid side folder
fa = (dside < 80) ? 10 : 15               // other angle on lid folder
flapLen = min(dfront − 2·cofst, w1/2)     // arc flap truncated so it misses TOE inner flap
```

### Panel chain order (conceptual N2 blank span)

Along “width/depth” axis (`blkn2`):

1. **`dinr`** — contributes to blank (inner TOE / side height on base)  
2. **`w1`** — base bottom  
3. **`dmain`** — main depth wall (hinge between base and lid)  
4. **`w2`** — lid top  
5. **`dfront`** — front depth / arc-flap panel  

Along “length” (`blks1`): TOE stack both ends + `l1`:

`lug + dinr + dblbend + dotr` (each end) + `l1`.

### Draw sequence (what the code actually emits)

**A. Lid (at origin)**

1. `folderflap(w2, dside, ba, fa, bofst2, bofst2, 0, 0)` — top lid side flap (angled trapezoid folder).  
2. Cut angled line `(dmain−dinr, inr2otr−bofstL)` toward TOE.  
3. Crease along lid length `l2` (drawn twice / reset).  
4. Mirror `Yaxis=-1`: second `folderflap` + same angled cut (bottom lid side).  
5. **Arc flaps** on front: inset `cofst2`, then `arcflap(dfront−2·cofst, flapLen, …)` top & bottom; cut connecting line of length `l2 + 2·(inr2otr−bofstL)`.

**B. Move to base**

`relMove(w2 + dmain, inr2otr − bofstL)` — jump across lid width + main depth, nudge by half length delta.

**C. Base + TOE**

1. `toe(w1, slotVert=+1)` — full turn-over-end: outline `bofstL → dotr → dblbend → dinr`, lugs, reverse outline, **two crease lines** across double bend, lock slots (`TheSlot`, width `dblbend+1`).  
2. `TheFlap(w1, bofstL)` — left base end flap (with lug/dblbend/dotr stack or square-off).  
3. Creases for left/right base folds length `l1 − 2·bofst*`.  
4. Cut right edge at `dinr`.  
5. `TheFlap` right (top), then bottom-right (`Yaxis=-1`), then `toe(w1, −1)` other end, then bottom-left `TheFlap`.

### Helpers

**`toe(dis, slotVert)`** — TOE section for panel width `dis` (=`w1`):

- Outline steps: `-cofst,+bofstL` → `+dotr` → `+2·cofst,+dblbend` → `+dinr` → lug strip → reverse `-dinr,-dblbend,-dotr,-bofstR`.  
- Lug count by `dis`: `<50` none; `<101` one; `>900` three; else two. Lug angle `lugAng=2`. Two-lug lug width `max(floor(dis/6), 25)`.  
- Creases: across at outer and inner faces of `dblbend`.  
- Slots under lugs: `TheSlot` with `slotw = dblbend+1`.

**`TheFlap(w1, bofstSd)`** — vertical flap on base ends:

- Height budget `flap = lug+dinr+dblbend+dotr+bofstSd`, capped at `floor(w1/2)`, with snap rules to avoid half-lugs / keep ≥10 from edge.  
- If `flap ≤ bofstSd+dotr` → square flap.  
- Else: crease `dinr`, cut outer, then angled waste (`fa` by `dinr` bands 35/50/75/120/180 → fa 10…35), `WasteRemoval=6`.

**`folderflap(dis, flap, a1, a2, ins1, ins2, r1, r2)`** — lid side: inset cuts, crease `dis−ins1−ins2`, trapezoid sides `a1`/`a2` up `flap` (=`dside`).

**`arcflap(dis, flapLen, r1)`** — crease `-dis`, circular arc (radius ≈ panel depth), optional chord chop if `flapLen < dis`, then vertical cut `-flapLen`.

---

## 5. vs idealized score-to-score (no thickness)

Idealized 0427 (zero board thickness) typically:

- Lid length = base length = L  
- Lid width = base width = W  
- Depth panels = D  
- No double-bend strip; no lug/slot geometry; no cut offsets  

This generator differs systematically:

| Ideal | d0427 practice |
|-------|----------------|
| L = L | `l2 = L + a`, `l1 = l2 + 2·dblbend + 2` (Carton: `+2·dblbend` only) → base longer than lid by ~2·dblbend+2 |
| W = W | `w1 = W+…`, `w2 = W+…` (lid usually wider: E +3 vs base +2; BC +14 vs +7) |
| D = D | Separate depth adds: `dmain`, `dfront`, `dside`, `dotr`, `dinr` all `D + δ_flute` |
| Single crease at fold | **Double bend** strip `dblbend` (6…20 mm) with two creases + lock slots |
| No material gap | `bofst*`, `cofst*` pull flaps/cuts off score lines |
| Flat flaps | Lug tabs + slots sized to `dblbend+1`; arc flaps on front; angled folder flaps on lid |
| Blank ≈ L×(2D+W) style | Blank: `blks1` includes 2×(lug+dinr+dblbend+dotr)+l1; `blkn2 = dinr+w1+dmain+w2+dfront` |

**Merge implication:** web calc “ideal” dielines need a flute/caliper layer: apply these δ tables (or a simplified thickness model) before drawing; assembly viz must include **TOE double roll + lug-into-slot**, lid side folders, and front **arc** tuck — not a single tongue into a slot.

**OD/BB path caveat:** `getSizes()` calls `allowanceSetup` with zero L/W/D, so subtracted “calipers” are the constant terms of formulas (and for BB/OD length, a large synthetic `l1`). Prefer re-deriving ID↔OD from flute caliper explicitly rather than copying that path blindly.

---

## 6. Key paths & signatures

| Path | Role |
|------|------|
| `/tmp/d0427/draw0427cls.java` | Allowances + geometry |
| `/tmp/d0427/JFrame0427.java` | Swing UI, `getSizes`, create/blank actions |
| `/tmp/d0427/JFrame0427.form` | NetBeans form |
| `/tmp/d0427/dxf12objects.java` | DXF R12 turtle (`Line`, `arc`, `arc2`, moves) |
| `/tmp/d0427/BoardSz.java` | Rule-to-rule / ups on Elite/Iberica |
| `/tmp/d0427/parcelSizes.java` | OD vs RM letterbox/parcel limits |
| `/tmp/d0427/README.md` | One-line purpose |

**`draw0427cls` (extends `dxf12objects`):**

```
public String Draw0427()
public void allowanceSetup()
public String DrawTOE()
protected void TheFlap(double w1, double bofstSd)
protected void TheSlot(double dis, double slotw)
protected void toe(double dis, int slotVert)
private void folderflap(double dis, double flap, double a1, double a2,
                        double ins1, double ins2, double r1, double r2)
private void arcflap(double dis, double flapLen, double r1)
```

**`JFrame0427`:**

```
public static void main(String[] args)
public void getSizes()
// actions: createDxfActionPerformed, btnBlkSzActionPerformed
```

**`dxf12objects` (selected):**

```
protected String dxf_header12()
protected boolean Line(double xval, double yval, String layer)
protected boolean arc(...); protected boolean arc2(...)
protected void relMove(double relX, double relY)
protected void absMove(double posX, double posY)
```

**`BoardSz`:** `public String CalcR2R()`  
**`parcelSizes`:** `public void checkSizes()`
