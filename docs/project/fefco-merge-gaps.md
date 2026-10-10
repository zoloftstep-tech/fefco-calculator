# FEFCO merge — remaining gaps

Branch: `cursor/fefco-merge-f833` (worktree `/workspace/.worktrees/fefco-merge`).  
Opus salvage used: `internal/opus-handoff.md`, `internal/opus-refs/` (no re-scrape).

## Shipped (incl. Opus catalog pass)

- Param cascade `src/lib/params/{resolve,board}.ts` + UI thickness.
- Shared TOE helper `src/lib/boxes/parts/toe.ts` (outer → bridge → inner → lugs/slots).
- **0427**: TOE helper, tapered front/back, thumb-notch tuck, rounded lid/tuck ears, fuller tuck.
- **0470**: TOE ends + interior bottom flaps + lip/tongue seating.
- **0471**: Catalog decode — quarter-disc lid ears into end pockets (not side hooks); TOE ends; rounded front tuck.
- **0422**: thickness/slot kerf (double-crease bridge on fold deferred — displaces tongue seating).
- **0201/0215**: girth `[0,1,1,2]·T`, tuck clearance / slot kerf.
- `npm run check:folds` green.

## Gaps

| Item | Notes |
|------|--------|
| 0427 strip blank | Net still panel-tree, not catalog ribbon |
| d0427 flute δ | Production l1≠l2 / flute tables not wired |
| 0422 DC bridge in fold | Net-only crease preferred; folding bridge broke tongue→slot |
| 0422 orientation debate | Opus said “backwards vs catalog”; kept research long-wall double walls |
| True sheet extrusion | Still quads + `lift` |
| 0201/0215 erect-from-flat | Still glued tube start |
| Golden SVG / crop-0427 | Still missing |

## PR status

- Pushed to session Origin: `cursor/fefco-merge-f833`.
- Draft PR blocked: Origin `agent_temp` cannot host PRs; GitHub HTTPS/SSH write credentials unavailable on this VM.
- Unblock: Create-repo / GitHub write, then:

```bash
cd /workspace/.worktrees/fefco-merge
git push -u github cursor/fefco-merge-f833
gh pr create --repo zoloftstep-tech/fefco-calculator --base main --head cursor/fefco-merge-f833 --draft \
  --title "FEFCO merge: thickness cascade + catalog dieline/fold fixes"
```
