# Opus implementer handoff (`bc-d3305d37-61c6-58a5-874b-6514abf1d469`)

Sources: `transcript.json` (186 msgs), `diff-metadata.json`, `events.json`  
Path: `/tmp/cursor/cloud-agent-transcripts/2026-10-10T14-25-54Z-69f6/bc-d3305d37-61c6-58a5-874b-6514abf1d469/`

## Recovered artifacts (coordinator, 2026-10-10)

Catalog GIFs/PNGs + Essential Image param scrape + pixel measures recreated at:

`/cursor/stores/bc-050aba31-e7f3-4787-bd7a-af49768a8603/internal/opus-refs/`

Files: `0201|0215|0422|0427|0470|0471.{gif,png}`, `essential-image-params.txt`, `measure-0470-0471.txt`.

## Meta

- `diff-metadata.json`: `"prUrl": null`, `"prStatus": null`, `"filesChanged": null`, lines null.
- `events.json`: `"count": 0`, `"events": []`.
- Tools used: `read_file` (45), `run_terminal_cmd` (23), `get_mcp_tools` (1), `grep` (1). **No Write/StrReplace/edit.**

## 1. Completed vs not

**Done (design / research only):**
- Read specs: `docs/merge-context.md`, `docs/fefco-types-research.md`, internals (`open-dieline-recalc-principles.md`, `d0427-formula-extract.md`, `transcript-fefco-calc-summary.md`).
- Studied host `fefco-calculator` at HEAD `1e3717a` (matches GitHub `main`).
- Used `/tmp/d0427` (Java oracle) and attempted/used `/tmp/open-dieline` (clone of `BrownBear127/open-dieline`; dest already existed).
- Downloaded Essential Image catalog GIFs → PNGs under `/tmp/refs`; measured 0470/0471 crease/cut columns; scraped 0470/0471 parameter HTML.
- `npm install` via tmux (`node_modules` ~448); only dirty file: `package-lock.json`.

**Not done:**
- No geometry/code rewrite; no feature branch (`git status` still `main`); no commit; no push; **no PR**.
- User follow-up `"Continue working"` → last assistant turn is unfinished architecture `thinking` (PanelDef / lift / params), then stop.
- Assistant text: *"Picking back up from the design phase: I'll create the feature branch and re-read the current source files before writing the new geometry code."* — branch never created in tool log.

## 2. Design conclusions (quotes / stdout)

**Gap vs current host (thinking msg[118]):**
> "the current code has 0422's wall orientation reversed and completely misses the real end-panel constructions for 0470/0471 and 0427."

**0427 catalog (thinking msg[84]):**
> "tapered front/back walls, base, lid with rounded ears, full-height tuck with locking ears and thumb notch, and end panels with double-crease walls and tabbed slots—no front roll-in."

Production pocket note (msg[83]): tapers + tuck locking ears into end pocket; lid ears inboard of inner walls (aligned with user/research).

**0422 (thinking msg[91]):**
> "0422 is essentially the body of 0427 minus the lid/back" — long walls with corner flaps trapped between outer/inner end walls with tabs into base slots; rebuild with shared TOE helper; current orientation "backwards relative to the catalog."

**0470/0471 pixel decode (tool stdout msg[116]) — green=crease, red=cut runs, e.g. 0470:**
- row 94 green `[(205, 239)]`, red `[(150, 202), (241, 292)]`
- col 203 green full band; col 328 red outer cut
- Asymmetry: top edge stops ~x=294, bottom extends to x=328 (extra flap D')

**0470 fold model (thinking msg[117]):** band panels A–C: B = outer end wall attached to back wall; A = inner lock panel with tongue into B–C lock hole; C = interior bottom flap; D = front-wall end flap trapped between B and A. Double-crease roll + tabs into base slots.

**0471 vs research (thinking msg[171]):**
> research says "hooks in end slots" vs catalog decode "quarter-disc tuck tongues going into end pockets" — *"I'll trust my image decode"* (catalog wins per research rule).

**Catalog formulas (tool stdout msg[102], sample):**
- 0471 `TTH = 0.8*PH3`; `TL = W/(3*NTongues)`; `TO = W/8`; `Lss = L+2*BCDC2Y`; `Wss = W+Wlc+2*C90Y`; `Hss1 = H+Hlc+2*C90Y`; `PH` involves `W+C90X+switch(DT,...)`.
- DT: inner `dtID=-1`, outer `dtOD=1`, score-to-score `dtSS=0`; thickness as `d()`.

**d0427 strip (thinking msg[63]):** X layout: front + arc flaps, lid `w2`, back `dmain`, base `w1`, inner front `dinr`; `blkn2` from those; front height = depth, back = depth+2; lid ears inboard; TOE outer / double crease / inner + lugs / lock holes.

**Architecture intent (thinking msg[185]/msg[117] end):**
- Param cascade: board caliper E/B/C/BC → thickness derived-overridable (0.3–8); derived tuck/ear/lug/flap; unknown override keys throw (open-dieline principle).
- Skip full "Ideal t=0" mode (z-fighting) — known gap.
- `PanelDef` + hinge + lift; slots as hole decals; per-style fold steps; `build` → panels/cavity/notes; shared TOE helpers; 0471 reuses 0470 builder; `check-folds` + runtime warnings.

## 3. Catalog URLs and local paths Opus used

**URLs:**
- Base HTML: `https://www.theessentialimage.com/Packaging%20Catalogue/Html5_Packaging/Corrugated_Standards_Library/FEFCO_Standards_Library/F_0400/` (+ `/0427/0427.htm`, `0470/0470.htm`, `0471/…`, param pages `*_Main_Parameters.htm`, `*_Panel_Parameters.htm`, …)
- GIFs 0400: `…/Res/Corrugated/FEFCO/0400/{0427,0422,0470,0471}%202d%203d.gif`
- GIFs 0200: `…/Res/Corrugated/FEFCO/0200/{0201,0215}%202d%203d.gif`
- Refs: `https://github.com/BrownBear127/open-dieline`, target `https://github.com/zoloftstep-tech/fefco-calculator`

**Local (Opus VM):**
- `/tmp/refs/` — `0201|0215|0422|0427|0470|0471`.{gif,png}, `0427.htm`, `0470.htm`, `0471.htm`, crops `0470-top/bot.png`, `0471-top.png`
- `/tmp/d0427/` — `draw0427cls.java`, `BoardSz.java`, …
- `/tmp/open-dieline/` — esp. `src/core/registry.ts`, `src/ui/useParams.ts`, `src/fold/schedule.ts`

**Note:** on *this* environment `/tmp/refs` is gone. Store copies exist under `internal/opus-refs/` (gifs/pngs + `measure-0470-0471.txt` matching tool stdout) — not written by Opus tools in this transcript.

## 4. Key host files Opus studied

| Path | ~LOC (wc) |
|------|-----------|
| `src/lib/boxes/mailer0427.ts` | 424 |
| `src/lib/boxes/sleeve0215.ts` | 482 |
| `src/lib/boxes/tray0422.ts` | 284 |
| `src/lib/boxes/wrap0470.ts` | 267 |
| `src/lib/boxes/wrap0471.ts` | 211 |
| `src/lib/boxes/rsc0201.ts` | 209 |
| `src/lib/fefco.ts` | 251 |
| `src/lib/fold.ts` | 210 |
| `src/lib/raster.ts` | 277 |
| `src/lib/math.ts`, `project.ts`, `fefco-types.ts` | — |
| `src/components/calculator.tsx` | 542 |
| `src/components/drawings.tsx` | 372 |
| `scripts/check-folds.ts` | 239 |
| `package.json` — `"dev": "next dev -H 0.0.0.0 -p 4317"` | |

Workspace remote was `origin.cursor.com/.../tmp-924de5149a68d5f2.git` (not GitHub); gh oauth for `zoloftstep-tech` present but unused for push/PR.

## 5. Intended next coding steps (Opus stated)

1. Feature branch + rewrite six styles with thickness slabs / TOE helpers.
2. Param system + UI: size + board + derived overrides/reset; invalid sizes → empty; bad overrides → inline error + fallback.
3. Restructure: shared params/fold utils/parts; per-style `build`; registry; 0471 via 0470; cavity for dim annotations; memoize `getNet`.
4. Fold schedules with real insertion order; tab angle during TOE descent; `check-folds` invariants.
5. Then push to GitHub + draft PR (planned, never executed).

## 6. Not recoverable from dead Opus VM

- Live `/tmp/refs`, `/tmp/d0427`, `/tmp/open-dieline` on that VM (gone here).
- Unfinished in-memory architecture after last `thinking` (no persisted design doc/plan from Opus).
- npm-install tmux session / dirty `package-lock.json` on that checkout.
- **Recoverable elsewhere:** design reasoning + measure stdout inside `transcript.json`; catalog images/measure text may already be in `internal/opus-refs/`.
