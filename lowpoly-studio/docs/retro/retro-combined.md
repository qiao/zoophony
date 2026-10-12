# Combined retrospective: low-poly rigged model from a reference image

Date: 2026-10-12. Sources: the analysis of the bear agent (`retro-agent.md`) and the analysis of
the transcript of the stopped bear agent (`retro-transcript.md`). The manager merged the two.

## Where the time went

| Measure | Value |
|---|---|
| Total for the bear | 5 rounds, about 5.7 h of agent time over 7.5 h of wall time |
| Rounds 1 to 4 (transcript) | 210 min active, plus 111 min of waiting for reviews |
| Active time split | 63% model time (thinking, image reads, code), 37% tool time (89% of it Blender) |
| Image reads | 36% of model time came right after an image read; 90 of 111 image reads held one image |
| Sequential Blender runs | 52 of 85 min in the last round were 8-seed runs; 27 parameter sweeps one after another took 16.8 min |
| Dark-fold loop (round 3) | 52.5 min: 25 rebuilds, 11 runs only to find where the faces were |
| Code edits | 143 Bash edits through inline scripts; 145 of the edits changed only numbers |
| Context | grew to 816k tokens; each resume rebuilt the cache |

Command failures cost only about 12 min. The large costs were process costs.

## Causes, largest first

1. Late requirements: rounds 2 to 4 cost 142 min plus the waits; 60 to 70% could have been set at
   the start (topology style, light and contrast, color, round head, eyes, ears, symmetry, no
   folds at any seed).
2. A wrong manager instruction (remove the white eye rim, which the sheet has) cost three rounds of
   eye work. A brief with a measured crop for each visual claim would have stopped it.
3. Checks gave counts, not places, so the folds were fixed one at a time.
4. A monolithic build (64 s for any change) and sequential seed runs.
5. Constants in code named "bear", not in a config; measure scripts written again (3 eye measures).
6. Sheet limits: the 3/4 view turns the head more (IoU ceiling near 0.91); hanging arms hide the
   trunk width.

About 70 to 80% of the roughly 6,000 lines is generic for any standing animal. The bear part is
mostly number tables. The conducting motion works for any animal on the same skeleton.

## Recommendations, highest value first

| # | What | Effort | Saving on the next model |
|---|---|---|---|
| 1 | Brief template and intake checklist for the manager: measured target crops (facets, eyes, head, snout), light, color swatches, symmetry, limits. Each visual claim in a brief needs a crop of the sheet | 30 to 60 min | 1 to 2 review rounds |
| 2 | Reference sheet spec: same pose in all views, arms a little away from the body, stated camera, flat known background, 2x face sheet, facet crop, swatches | 30 min | 30 to 60 min; removes the 3/4 ceiling |
| 3 | Standard checks with limits; each failure names the clip, frame, bone, region, with a crop; one look-report page per build | 2 to 3 h | 50 to 70 min and about 1 round |
| 4 | Faster build: stage cache, 4 seeds in parallel, remesh gate that retries the next seed, shot tool that stops at the first page error | 2 to 3 h | 8-seed check from 8 to 10 min to about 2 min; a detail change from 64 s to about 5 s |
| 5 | Generic studio: `lowpoly-studio/` with one config per animal, a biped rig template, motion packs; the bear as the first animal and a regression test | 3 to 5 h | first round of a new animal from about 67 min plus 3 rework rounds to 30 to 45 min |
| 6 | Agent skill "lowpoly-animal-studio" with items 1 to 5 and the known traps (zsh word splitting, no `timeout` on macOS, slivers, inside-out meshes, tuning to one seed) | 1 to 2 h | planning and setup |
| 7 | A fresh agent for each round, with a handoff file (last finished step, next step) | 30 min | cheaper restarts; a round starts at 50k to 80k tokens, not 500k to 800k |

Estimate: with items 1 to 5, the next standing animal with the same role takes about 60 to 90 min
of agent time in 1 or 2 review rounds. The bear took about 5.7 h in 5 rounds.
