# Retrospective: the low-poly bear conductor (bear-studio)

Scope: everything in `bear-studio/` from the first build to the round-head round (main
8ae25d46 plus branch `bear-head`, c528ca2e). The numbers come from the commit times, the run
logs in this folder, the stats files, and the agent reports. Where a number is an estimate,
the text says so.

## 0. The short version

- Five rounds took about 5.7 hours of agent time (67, 46, 85, about 60, and 85 minutes) over
  7.5 hours of wall time (16:39 to 00:13, with user reviews between).
- About half of the last two rounds was waiting for sequential Blender builds. In the last
  round, five 8-seed runs took about 52 of 85 minutes.
- Most of the rework came from requirements that arrived one at a time: the topology style,
  the eye style (removed, then restored), the round head (three rounds), the round snout, and
  "no folds at any seed". A one-page intake checklist would have fixed most of them in round 1.
- About 70% of the code is generic (sheet measure, field, remesh, mesh cleanup, paint, rig
  rules, checks, render tools, viewer). It is in one folder that is named after one bear and
  driven by Python constants, not by a config.
- The three things with the biggest payoff: a stage cache with parallel seed runs (cuts an
  8-seed check from about 8 minutes to about 2), a config-driven generic studio (cuts round 1
  of a new animal from about 67 minutes plus 3 rework rounds to an estimated 30 to 45
  minutes), and an intake checklist with fixed checks and limits.

## 1. Timeline and where the time went

| Round | Agent time | What changed | Main time sinks |
|---|---|---|---|
| 0: first build (16:39 to 17:46) | 67 min, 213 tool calls | Distance field from measured parts, decimated mesh, rig, 11 clips, viewer, compare tool | Writing the whole pipeline. Build 22 s |
| 1: topology, face, color, contacts (to 18:52) | 46 min, 173 calls | QuadriFlow remesh with mirror and chevrons; contact check | The user rejected the decimated topology after round 0, so the remesh was rewritten |
| 2: organic facets, round head, folds (to 21:30) | 85 min, 178 calls | Organic pass, soft light, head loft, arm correctives, twist bone, fold check, seed chosen from 8 | Fold fixes per pose; an 8-seed comparison by hand (8 builds in about 6 min) |
| 3: eyes, head ball, ears, seeds (21:48 to 22:39) | about 60 min (the first agent was stopped part way) | Eye layers with a white rim, head loft, ears, crotch mask, seed search fallback | Restart after a stop; one 8-seed run (7 min); 4 full builds |
| 4: round head, snout, eyes, folds at any seed (22:48 to 00:13) | 85 min | Round cap, narrow neck, snout rings, eye tool, sliver cleanup, untangle, direction fix, 6 weight rules, fold repair | Five sequential 8-seed runs: about 52 min of waiting |

### Build and check times (measured)

| Step | Time |
|---|---|
| `measure.py` (masks and row profiles) | under 2 s |
| `fit.py` (field against the masks, no mesh) | 5 to 10 s |
| Surface nets | 1.5 s |
| QuadriFlow remesh plus organic pass | 15 to 30 s (varies with the seed and the field) |
| Bone heat, weight rules, corrective shapes, baking 11 clips | about 15 s |
| Contact and fold check, all clips | about 12 s per pass (one more pass per repair round) |
| GLB only (`--no-shots`) | 45 to 60 s |
| Full `./build.sh` with all images | 64 s |
| `shoot.mjs compare` | about 2 s |
| One 8-seed run, sequential | 8 to 10 min (18 min once, when two seeds made inside-out meshes and huge logs) |

### Waiting versus thinking

- Round 4 compute: about 40 full seed builds (about 37 min), about 11 builds with a subset of
  clips (about 6 min), 14 builds with no rig (about 5 min), 3 final builds (about 4 min). That
  is about 52 minutes of the 85.
- Manual eye checks: about 12 head-crop images were made and read in rounds 3 and 4. Each one
  needed a scratch script (`headcrop.py`, written again in each round), a build, and a read.
- The checks are fast (2 to 12 s). The cost is the monolithic build: any change, also an eye
  radius or a paint color, re-runs the remesh, the rig, and the bake (about 50 s).

## 2. Generic and bear-specific parts

| Part | Generic | Bear-specific |
|---|---|---|
| Sheet intake (`measure.py`) | Masks and row profiles of 4 views on a plain background | The fixed column layout of this sheet, the background color |
| Field (`sdf.py`, `body.py` loft) | Primitives, smooth union, surface nets, a loft from front width and side depth | Every coordinate: `ARM_REF`, `LEG`, `SPINE`, `HEAD`, `SNOUT`, `TAIL`, the control points above height 0.45, `HEAD_FACE`, `HEAD_BACK` |
| Fit (`fit.py`, `views.py`) | Field-to-mask IoU per view, row edges | The 3/4 azimuth search range |
| Remesh (`retopo.py`, `organic.py`) | Warps, QuadriFlow with symmetry, mirror pairs, chevrons, organic collapses and flips, relax, jitter, sliver cleanup, untangle, direction fix | The warp centers (snout, paws, feet, neck), the protected regions |
| Paint (`paint.py`) | Palette, baked occlusion, region masks | The belly ellipse, the muzzle rule, the palette values |
| Details (`details.py`) | Layered eyes, a nose, a mouth line, shells for ears, claws, a prop | Their sizes and places |
| Rig (`rig.py`) | Biped bone layout, bone heat, trunk bands, chain and parent limits, ownership by part distance, repair of folds | The masks with coordinates (crotch, throat, shoulder tops), the twist start |
| Correctives (`corrective.py`) | Arm-down shapes with a driver | The sheet pose as the target |
| Motion (`pose.py`, `motion.py`, `anim.py`) | Two-bone IK, twist split, automatic clavicle, clip baking | All 11 conducting clips, the beat pattern, the baton |
| Checks (`contacts.py`, `facets.py`, `topology.py`, `eyes.py`, `ears.py`) | Contacts, folds, facet stats, facet contrast, feature sizes | Thresholds tuned on this sheet (white above 212 on a 202 background) |
| Render and viewer (`shoot.mjs`, `viewer/`) | Compare, frames, viewer with views and clips | The camera presets of this sheet |

About 4,500 of the 6,500 lines are generic in substance. They are not reusable today, because
the constants live in the modules and the names say "bear".

## 3. Loops and retries that a tool, a config, a cache, or parallel runs would remove

1. **Sequential seed runs.** The 8-seed runs were the largest single cost (about 52 min in round
   4, about 7 min in round 3, about 6 min in round 2). Blender used about 170% CPU per build on
   this machine, so 4 parallel builds would cut a run to about 2.5 minutes. A cache of the
   remesh per seed (keyed by a hash of the field inputs and the seed) would cut a rig-only change
   to about 15 s per seed.
2. **Monolithic build.** An eye size change cost a 64 s build. A stage graph (field, remesh,
   paint, details, rig, bake, check, shots) with cached outputs would make a details-only change
   take about 5 s.
3. **Fold whack-a-mole.** In round 4 the folds moved to a new place with each mesh change. Six
   weight rules were found one at a time from debug prints (four 8-seed runs). A standard debug
   report per build (each folded face with its place, weights, smallest angle, and rest
   direction) from the start would have shown in one run that most folds were slivers and
   inside-out faces, not weights. The debug print exists now (`BEAR_DEBUG=1`), but late.
4. **Scratch measure scripts.** `headcrop.py`, `rows.py`, a tan-region measure, and three
   versions of an eye measure were written as scratch code. The first eye measure used a single
   row and failed, the second took the background as white, and the third works. A generic
   feature measure (a color class and a region, measured the same way on the sheet and the
   render) would remove this.
5. **Unstable remesh.** For the same target of 900 quads, QuadriFlow gave 792 to 1,206 quads as
   the field changed. One head change gave a coarse mesh with a slit and folded faces; a warp of
   3.4 gave 32 inward faces. A remesh gate (quad count within 15% of the target, 0 inward faces,
   slivers under 1%) that retries the next seed by itself would have saved about 4 rounds of
   look-then-fix.
6. **Shell traps.** zsh does not split `$v`, so one 4-variant run wrote broken Python and was
   lost (about 2 min). `topology.py` with no arguments rewrote its history file. A small run
   script per study (variants as a list, results as JSON) avoids both.
7. **Stops and restarts.** One round stopped part way and a new agent restarted from a dirty
   worktree. A check-in file (the last finished step, the next step) would make a restart cheap.

## 4. Requirements that came late and should be fixed up front

| Requirement | When it came | Cost |
|---|---|---|
| Hand-made, mirrored, organic topology | After round 0 | Round 1 rewrote the mesh step; round 2 added the organic pass |
| Facet size and soft, low-contrast light | Rounds 1 and 2 | Light and contrast tuning, a contrast tool |
| Neutral brown, not red | Round 1 | Palette tuning |
| Eye style (dark iris, thin white rim, highlight) | Round 1 removed the rim by an error of the brief; round 3 restored it; round 4 sized it | Three rounds of eye work and three eye-measure versions |
| Head as a round ball, distinct from the shoulders | Rounds 2, 3, and 4 | Three head lofts |
| Round, smooth snout | Round 4 | Snout rings, tan limit |
| No folds at any seed | Round 4 | Mesh cleanup, 6 weight rules, the repair loop |
| Bind pose in the middle of the motion range | Round 0 (right from the start) | None. This was the one early decision that held. |
| Symmetry | Round 1 | The mirror pairs in the remesh |

These belong in an intake checklist with a reference crop for each (a facet crop, an eye crop,
a head crop) and a measured target, so the first build can be checked against them.

## 5. A proposed standard

### 5.1 Reference sheet spec

- 4 views of one pose on one sheet: front, side (facing right), back, and 3/4 front-right, the
  same scale, one ground line, a plain background of one known color (for example RGB 202).
- The same pose and the same head turn in all views (the bear sheet turns the head more in the
  3/4 view, which capped the 3/4 IoU near 0.91).
- Arms slightly away from the body (an A-pose of 15 to 30 degrees), so the arms do not merge
  with the trunk in the front mask. The bear sheet's hanging arms forced the body to guess the
  trunk width above height 0.45.
- A face sheet at 2x or more: front and side of the head, for the eyes, the nose, and the ears.
- A facet crop at full size (chest and belly), as the style target for size and contrast.
- At least 500 px of figure height per view (the bear had 528 to 539 px).

### 5.2 Config for a new animal (one file, for example `animal.yaml`)

```yaml
sheet: reference/bear-views.png
views: {front: [0, 470], side: [470, 735], back: [735, 1150], three_quarter: [1150, 1536]}
background: [202, 202, 203]
height: 1.0                      # model units, soles to ear tops
template: biped                  # rig template
parts:
  trunk: {loft: masks, above_arms: [[0.45, null], [0.70, 0.174], [0.795, 0.115]]}
  head: {loft: masks, cheek: [0.83, 0.153], temple: 0.92, cap: 0.93, top: 0.978, chin: 0.75, blend: 0.035}
  snout: {cone: [[0, 0.832, 0.165], [0, 0.845, 0.232]], radii: [0.06, 0.052], color: muzzle}
  arm: {shoulder: [0.16, 0.662, 0.015], elbow: [0.271, 0.5, 0.0], wrist: [0.331, 0.4, 0.045]}
  leg: {hip: [0.115, 0.3, 0.0], knee: [0.125, 0.165, 0.012], ankle: [0.133, 0.07, -0.01]}
  ears: {center: [0.088, 0.9565, 0.058], radii: [0.0405, 0.043, 0.027], yaw: 35, roll: 10}
  tail: {center: [0, 0.255, -0.14], radii: [0.032, 0.036, 0.026]}
eyes: {center: [0.043, 0.892], radius: 0.0135, iris: 0.86, rim_color: [236, 232, 224]}
palette: {fur: [117, 70, 38], belly: [141, 88, 51], muzzle: [214, 164, 108]}
facets: {quads: 900, seeds: [3, 1, 5, 6, 2, 4, 7, 8], dense: [snout, paws, feet]}
bind_pose: {shoulder_flex: 40, shoulder_abduct: 10, elbow_flex: 25}
props: [{name: baton, bone: hand_R, length: 0.36}]
clips: conductor                 # a clip set
```

The bear's constants map one to one onto this file; nothing in it needs code.

### 5.3 Bone names and the rig template

The 31 bones of the bear are a good biped template: `root`, `hips`, `spine`, `spine1`,
`chest`, `neck`, `head`, `ear_L/R`, `clavicle_L/R`, `upper_arm_L/R`, `forearm_L/R`,
`forearm_twist_L/R`, `hand_L/R`, `fingers_L/R`, `thigh_L/R`, `shin_L/R`, `foot_L/R`,
`toes_L/R`, `tail`, plus one prop bone. Optional: `jaw`, `tail1..n`. The weight rules of
`rig.py` are template rules once their coordinates come from the joints of the config: trunk
bands, chain and parent limits, ownership by part distance (trunk, upper arm, forearm, paw), the
twist start, the crotch, throat, and shoulder-top masks, no ear weight on the body, and the
repair of folds.

### 5.4 Standard checks and limits

| Check | Limit that worked here |
|---|---|
| Silhouette IoU per view | front, side, back at least 0.94; 3/4 at least 0.90 |
| Fur color median (HSV) | hue within 1°, saturation within 0.02, value within 0.03 |
| Facet median edge | within 10% of the facet crop |
| Slivers (smallest angle under 15°) | under 1% |
| Mirrored vertices | at least 99% |
| Vertices of valence 6 | 30% to 50% (organic, not a grid) |
| Facet contrast (fine spread of the belly) | within 15% of the sheet |
| Eyes (outline, rim) | outline within 8%, rim within 0.0003 |
| Ears (width, height) | within 10% |
| Faces that point into the body, rest mesh | 0 |
| Contact (paws, claws, forearms, prop) | at most 1 cm per 1 m of height |
| Folded faces (past 120°) in any clip | 0 after the repair |
| Seeds that pass all checks | all of the listed seeds |
| Full build | at most 90 s |

### 5.5 Folder layout

```text
lowpoly-studio/
  studio/            generic code: measure, field, remesh, cleanup, paint, rig, motion, checks
  templates/biped/   bone layout, weight rules, clip sets (conductor, idle, wave, ...)
  viewer/            generic viewer and compare pages, views from the config
  animals/<name>/
    reference/       the sheet, the face sheet, the facet crop
    animal.yaml      the config
    clips.py         clips of this animal only, when the template sets are not enough
    out/             GLB, stats, compare and look report, frames
```

## 6. Things to create

| Thing | Scope | Saves (estimate) |
|---|---|---|
| Stage cache plus a parallel seed runner | Split `build.py` into cached stages keyed by input hashes; run N seeds in a pool of 4 Blender processes; one JSON summary | An 8-seed check from 8 to 10 min to about 2 to 2.5 min; a details-only change from 64 s to about 5 s. In round 4 that is about 40 of 52 minutes |
| Remesh gate | After the remesh: quad count, inward faces, slivers, a slit test; on failure the next seed, by itself | About 4 look-then-fix loops per animal |
| Look report page | One HTML page per build: sheet beside render for the four views, the head, the face, the facets, the eyes, and the ears, with each measure and its limit | The scratch crop scripts and about 12 manual crop reads per round |
| Generic feature measure | One tool for eyes, ears, nose, tan regions: a color class, a region, the same measure on sheet and render, robust to the background | Three rewrites of the eye measure; the tan-region guesswork |
| Fold debug report | Each build writes the folded, repaired, and inward faces with place, weights, smallest angle, and rest direction | Most of the four extra 8-seed runs of round 4 |
| Generic studio (refactor of bear-studio) | Move the constants into `animal.yaml`, rename modules from "bear", keep the bear as the first animal and a regression test | Round 1 of a new animal from about 67 min plus 3 rework rounds to about 30 to 45 min |
| Intake checklist and skill | An agent skill "low-poly model from a reference sheet": the sheet spec, the checklist of section 4 with crops, the config, the run loop, the checks and limits, the known traps (zsh splitting, sunk details, undercuts, slivers, inside-out meshes, tuning to one seed), and the report template | The late requirements of section 4 and the restart cost |
| Live motion driver | Port `pose.py` (IK, twist, clavicle) to TypeScript for tempo and cues from a score | Needed before the bear can conduct the app's scores; not a time saving for modeling |

## 7. Honest notes

- The seed search hid the fold problem for one round. Fixing the causes took one full round,
  and the real causes were mostly mesh defects (slivers, inside-out faces), not weights.
- The fold repair is a safety net. It runs in 4 of 8 seeds today (1 round each). A wider repair
  created a 1.17 cm contact at the elbow, so it must stay small.
- Some limits were tuned on this one sheet (the white threshold of 212, the crop boxes). They
  need a second animal before they are a standard.
- The eye error of round 1 came from the brief, not from the build. A measured target per
  feature, decided at intake, would have caught it.
