# Research

These reports hold the facts behind the decisions of the design ([`../design.md`](../design.md) and
[`../design/`](../design/)).
Research agents wrote them on 2026-10-04. The audio spike report holds measurements of
2026-10-04 and 2026-10-05. The WebKit audio report, the step 2 targets report, the step 2 warm-up report, the step 5 frame report, the seating report, the sound quality report, the default demo report, the cinematic camera report, the room and mix report, and the cheerful demos report hold measurements of 2026-10-05. The demo loudness report and the joyful Ode to Joy report hold measurements of 2026-10-06. The animal anatomy plan report, the similar products report, the Blender models plan report, the Blender stage S1 report, and the proportions report hold research of 2026-10-07. The Blender rabbit report, the fox look report, the cat and hippo report, the gated fox spike report, and the report of the route B fox in the app hold research of 2026-10-08. The body revert report holds research of 2026-10-09. The arms close report holds research of 2026-10-10. The penguin body report holds research of 2026-10-11. The studio bear report holds research of 2026-10-12. The pianist rest report, the pianist lap report, the frame time report, the studio rabbit report, and the four retrospective reports hold research of 2026-10-13. The rabbit mesh retrospective report holds research of 2026-10-14. The cinematic light report holds research of 2026-10-17. The report of the cinematic light steps P0 to P2, the captured environment report, the shot light, lens, and haze report, the light frame cost report, the body shade report, the light color report, and the key light and beam report hold measurements of 2026-10-18. Each fact has a source URL, a source file and line
range, or a local test. "Not verified" marks a fact that the agent could not confirm.

| Report | Topic | Decisions that use it |
|---|---|---|
| [`audio-engines.md`](audio-engines.md) | Browser audio engines, SoundFonts, licenses, sizes, Safari codecs | The audio engine and the SoundFont |
| [`midi-sources.md`](midi-sources.md) | Licensed demo MIDI files, GM1, GS, and GM2 drum maps, the default program | The demo list, the channel 10 map |
| [`audio-scheduling.md`](audio-scheduling.md) | spessasynth queue, ports, seek, decode, speed; timers in hidden tabs | The worklet design, the sample decode, the port rule |
| [`musescore-export.md`](musescore-export.md) | The MuseScore export of the Boulanger score | The Boulanger demo file |
| [`audio-spike.md`](audio-spike.md) | The checks and targets of step 1 in Chrome, Firefox, and Playwright WebKit | The clock method of each browser, step 1 of the work order |
| [`webkit-audio.md`](webkit-audio.md) | The cause of the slow blocks and the lost time in Playwright WebKit | The `latencyHint`, the effects, the Safari check of step 1 |
| [`step-2-targets.md`](step-2-targets.md) | The score build, the audio render, the memory, and a late seek of each demo in Node | The step 2 targets of design 9.7, review finding F14 |
| [`step-2-warm-up.md`](step-2-warm-up.md) | The block render times at the first notes of each preset, before and after the warm-up | The warm-up of design 6.4, review of step 2 finding N2 |
| [`step-5-frame.md`](step-5-frame.md) | The frame target with `perf-60.mid` in Google Chrome, and the recordings of the step 5 review | The frame target of design 9.7 |
| [`seating.md`](seating.md) | The professional seating of a symphony orchestra, our layout against it, a species map and rows, and a check of the default camera | The cast of 4.3 and the rows of 4.5 (proposal of 2026-10-05) |
| [`default-demo.md`](default-demo.md) | The first download, the load, the memory, and the count-in of the Boulanger demo as the default demo | The default demo of design 2.2, the targets of 9.7 |
| [`sound-quality.md`](sound-quality.md) | A diagnosis of the sound with numbers, licensed sample sources and hall impulse responses, the cost of the processing, and an A/B test | The room, the mix, and the sound source (proposal of 2026-10-05) |
| [`cinematic-camera.md`](cinematic-camera.md) | How concert films cut and move the camera, shot rules for the stage, the API of `prepareShots()` and `cameraAt()`, and a prototype with frames of the real scene | The camera modes of 2.5 and the camera shots (proposal of 2026-10-05) |
| [`room-and-mix.md`](room-and-mix.md) | The stage pan, the hall reverb, the limiter, and the loudness of each demo as built, against the B2 render, with a check in headless Chromium | The output chain of design 6.8, the effects of 6.1, the demo gains (user decision of 2026-10-05) |
| [`demo-loudness.md`](demo-loudness.md) | The integrated loudness and the true peak of each demo through the output chain in headless Chromium, and the time to silence after a mute | The demo gains of design 6.8 (UX audit SD1), the speed of a mute of 6.6 (UX audit SD2) |
| [`cheerful-demos.md`](cheerful-demos.md) | Licensed cheerful pieces and the Ode to Joy excerpt, measured with the pipeline of the app: sections, players, stage, presets, memory, loudness | The demo list of design 8.2 (user decision of 2026-10-05), the riser height of 4.5 |
| [`2026-10-06-joyful-ode.md`](2026-10-06-joyful-ode.md) | Why the Ode to Joy excerpt of bars 216 to 330 is not joyful, and licensed candidates of a traditional and joyful version, with the theme, the choir, the seats, and the loudness of each | The Ode to Joy excerpt of design 8.2 (user request of 2026-10-06) |
| [`2026-10-06-skinned-bodies-plan.md`](2026-10-06-skinned-bodies-plan.md) | The rigid body parts of the animals with numbers, a welded skinned body, its risks, and small stages to build it | Option B of the animal models (user decision of 2026-10-06) |
| [`2026-10-06-shoulder-spike.md`](2026-10-06-shoulder-spike.md) | A prototype of the welded shoulder and elbow in the worst poses of the demos, with the volume, the folds, and the parameters for the weld stage | Stage S of the skinned bodies plan, and the shoulder fallback D2 |
| [`2026-10-07-animal-anatomy-plan.md`](2026-10-07-animal-anatomy-plan.md) | The lower bodies and the facets of `lowpoly-animals.png` against our animals, prototypes of animal legs and of five facet looks, the rig, and stages for two agents | The leg forms and the facet look (user report of 2026-10-07) |
| [`2026-10-07-blender-models-plan.md`](2026-10-07-blender-models-plan.md) | A spike of the red fox made with Blender around our rig: the pipeline, the packed format, the size, the test results, the risks, and stages for all species | The hand-made bodies of design 4.4 (option C, user decision of 2026-10-07) |
| [`2026-10-07-blender-s1.md`](2026-10-07-blender-s1.md) | Stage S1 of the Blender models: the recipe of the dog family, the red fox of `fox-views.png`, the tan fox, the wolf, their measures against the references, and side-by-side images | The sculpts of design 4.4 |
| [`2026-10-07-proportions.md`](2026-10-07-proportions.md) | The proportions of the four model sheets and of the scenes in head heights against our skeleton, the cost of each skeleton change with test experiments, and stages for a skeleton of each species | The skeleton of each species (user decision of 2026-10-07) |
| [`2026-10-07-similar-products.md`](2026-10-07-similar-products.md) | Existing products, open-source projects, and prior art compared to Zoophony | Product positioning and feature validation |
| [`2026-10-08-blender-rabbit.md`](2026-10-08-blender-rabbit.md) | The rabbit sculpt of `rabbit-views.png` on the skeleton of option A: the target rig, the recipe of the rabbit family, its measures, a side-by-side image, test runs with the new skeleton, and the steps for stage P1 | The rabbit sculpt of design 4.4 (stage P1) |
| [`2026-10-08-fox-look.md`](2026-10-08-fox-look.md) | A checklist of the visible features of `fox-views.png` with measures and color samples, the state of each feature on the red fox, the colors in the views page and the default view, a side-by-side image, and what the wolf and the dog can reuse | The fox sculpts and colors of design 4.4 and 4.5 |
| [`2026-10-08-cat-hippo.md`](2026-10-08-cat-hippo.md) | Feature checklists of the cats and the hippos of the scenes, the option A row of the hippo and the limit of the seat arc, the clearances of the contrabass, an experiment with a standing hippo, side-by-side images, and notes for the rest of stage P4 | The cat and hippo sculpts of design 4.4, the hippo skeleton of 4.3, and the hippo colors of 4.5 |
| [`2026-10-08-fox-spike-gated.md`](2026-10-08-fox-spike-gated.md) | Route B of the fox spike: a red fox modeled in Blender with silhouette gates on the camera of `fox-views.png`, a new skeleton with automatic weights, a palette pass, the IoU of each view, the GLB size, and the cost for all species | The choice of the model route for all species (spike of 2026-10-08) |
| [`2026-10-09-body-revert.md`](2026-10-09-body-revert.md) | The revert of the animal bodies to 2026-10-06: the base commit, the probes of the skeletons and the meshes, the values of the pose fit, two side-by-side images, and the differences that remain | The parametric bodies, the skeletons, and the colors of design 4.3 to 4.5, and the holds of 5.3 |
| [`2026-10-08-fox-b-app.md`](2026-10-08-fox-b-app.md) | The route B red fox in the app: the plan that drives its skeleton with the pose code, the packer, the bind frames, the measures of the hold and the clearance, the changed tests, the stage and sheet images, and the steps for the next species | The rigged body of design 4.4 and 4.7 |
| [`2026-10-08-fox-feet.md`](2026-10-08-fox-feet.md) | The floating feet of the seated red fox: the cause in the model sheet, the stretch of the lower legs to the floor, the feet test of each seated body, and the stage and sheet images before and after | The rigged body of design 4.4 and the chair of design 4.5 |
| [`2026-10-10-arms-close.md`](2026-10-10-arms-close.md) | The arms of the players moved close to the body after the gap of 0.01 H went: the angle of each upper arm before and after, the method, the changed poses, the poses that the body stops, the gaps to the references, the open faults, and two side-by-side images | The elbow directions of design 5.2 and 5.3 |
| [`2026-10-11-penguin-body.md`](2026-10-11-penguin-body.md) | The penguins of `orchestra-latest.png` and `orchestra-side.png` in parts of the body height, the egg body built in code after them, the compare of `pnpm choir-check` before and after, the rounds, and the clearance of the folder and the flippers | The egg body of the penguin of design 4.4, the folder hold of 4.6 |
| [`2026-10-12-studio-bear.md`](2026-10-12-studio-bear.md) | The studio bear of `lowpoly-studio/` in the app: the source file, the two routes and the measures of their skin in the conductor poses of all demos, the wrists, the scale, the fit of the conductor motion, the tests, the size, and the images | The studio body of design 4.4, the conductor of 5.4 |
| [`2026-10-13-pianist-rest.md`](2026-10-13-pianist-rest.md) | The rest pose of the pianist on main, on the branch, and in the rest clip of the studio: the share of each upper arm that the back view shows, the trunk lean, the places of the wrists and the elbows, the variants, the arc of the lift and the lowering, the sweep, the folds, and the rest views | The rest lean and the rest place of the pianist of design 5.2 and 5.3 (user report of 2026-10-13) |
| [`2026-10-13-pianist-lap.md`](2026-10-13-pianist-lap.md) | The rest position of a real pianist before a performance, the rest pose of the pianist on main, on the branch, and in the `ready` clip of the studio: the trunk lean, the head pitch, the paws, the elbows, the depths, the random search of the lap on the round belly, the lift, the folds, and the pose hash of the other players | The lap pose of the pianist (user request of 2026-10-13) |
| [`2026-10-13-frame-time.md`](2026-10-13-frame-time.md) | The frame time of the high tier: the instruments and the power state of the GPU, the profile of the encoders, the spike of the main thread, the GPU work of other processes, the frozen frames, and each measure with its load | The frame target of design 9.7 (user approval of 2026-10-12 and 2026-10-13) |
| [`2026-10-13-frame-retro.md`](2026-10-13-frame-retro.md) | The retrospective of the frame-time rounds: the times, the proposals of the agents, the decisions of the manager, and the measured gains | The self-check of the GPU row, the GPU-phase guard, and the fixed seeks of `pnpm frame` (design 9.7) |
| [`2026-10-13-route-3-retro.md`](2026-10-13-route-3-retro.md) | The retrospective of the studio polar bear pianist: the times of the task, the proposals of the agents, the decisions of the manager, the measured gains, and the process for the next task | The check cache by tree, the sweep of each role, `pnpm pose-depth --set`, and the brief template of route 3 |
| [`2026-10-13-pose-review-retro.md`](2026-10-13-pose-review-retro.md) | The retrospective of the pianist rest rounds: the times, the proposals of the agents, the decisions of the manager, and the measured gains | The lowering set of the sweep, the pose hashes of `pnpm body-probe`, `pnpm pose-depth --gaps`, and the brief template of route 3 |
| [`2026-10-13-studio-rabbit.md`](2026-10-13-studio-rabbit.md) | The studio rabbit violinist in the app: the body, the height against the red fox, the chair, the standing body, the size of the violin by the rule of a violin shop, the hold, the results, and the longer arms of round 4 | The studio body of the rabbit of design 4.4, the violin scale of 4.6 (user decisions of 2026-10-13) |
| [`2026-10-13-rabbit-retro.md`](2026-10-13-rabbit-retro.md) | The retrospective of the rabbit task: the rounds with their times, the costs that the agents named, the decisions of the manager, and the measured gain of `pnpm hold-reach` | `pnpm hold-reach`, the arm reach of `pnpm studio-body --inspect`, and the brief template of route 3 |
| [`2026-10-14-rabbit-mesh-retro.md`](2026-10-14-rabbit-mesh-retro.md) | The retrospective of the rabbit mesh task: the times of the five rounds, each item of the agents with its decision, and the measures of the new tools | `pnpm rig-mesh --check`, `--glb` of the probes, `pnpm hold-reach --set`, the gzip budget of a studio body mesh, and section 7 of the brief template of route 3 |
| [`2026-10-11-short-legs.md`](2026-10-11-short-legs.md) | The legs of the reference images against the parametric bodies, in the height of the seated trunk: the seat, the knee, the shin, the standing legs, the long trunk of the bear conductor, and the sheet checks before and after the change | The skeleton of design 4.3, the legs and the seats of 4.5 (user request of 2026-10-11), and the trunk of the bear (manager decision) |
| [`2026-10-11-low-seats.md`](2026-10-11-low-seats.md) | The chairs at 0.75 head heights: the seats of each species, the trials of the seat height and of the cello, the pose fits, the sheet checks before and after, and the before and after images of the seated animals | The seat height of design 4.3 and 4.5 (user decision of 2026-10-11) |
| [`2026-10-17-cinematic-lighting.md`](2026-10-17-cinematic-lighting.md) | The light and the render of the stage against `orchestra-latest.png`: the tone, the floor, and the shadow map with measures, the findings, the options with their costs, and a plan in phases | Design 4.1 and 4.5, light and render (proposal of 2026-10-17) |
| [`2026-10-18-cinematic-light.md`](2026-10-18-cinematic-light.md) | The steps P0 to P2 of the cinematic light: the look lab against `orchestra-latest.png` at the start and the end, the floor and the grade under AgX alone, the error of the lookup table, the time of the bake, and the gap under the feet of the conductor | Design 4.5, light and render, the floor, and the post effects (decisions of 2026-10-18) |
| [`2026-10-18-captured-environment.md`](2026-10-18-captured-environment.md) | Step P3 of the cinematic light: the captured environment of each layout against `orchestra-latest.png`, and the time of a capture | Design 4.5, light and render, the captured environment (decisions of 2026-10-18) |
| [`2026-10-18-shot-light-lens-haze.md`](2026-10-18-shot-light-lens-haze.md) | Step P4 of the cinematic light: the lens, the room haze, and the light of each shot kind, with the distance of each camera of the planner | Design 4.5 and 5.6, the shot light, the lens, and the room haze (decisions of 2026-10-18) |
| [`2026-10-18-light-frame-cost.md`](2026-10-18-light-frame-cost.md) | The GPU time of each step of the cinematic light on `perf-60.mid`, measured in turns with no Metal trace, and the failure of the Metal trace | Design 9.7, the frame target, and the steps of the cinematic light (2026-10-18) |
| [`2026-10-18-body-shade.md`](2026-10-18-body-shade.md) | The share of each light on the fronts of the players, and the look lab before and after the narrow side lights and their shadows | Design 4.5, the side lights and the fill light of the players (2026-10-18) |
| [`2026-10-18-light-color.md`](2026-10-18-light-color.md) | The variants of the light color, the wood, the floor shadows, and the haze against `orchestra-latest.png` | Design 4.5, the colors of the lights, the wood, and the haze (2026-10-18) |
| [`2026-10-18-key-beam.md`](2026-10-18-key-beam.md) | The professional light setup, the shadow directions of the reference, the variants of the key light and the beam, and the pool of the key light | Design 4.5, the place of the key light and the fan of the beam (2026-10-18) |
| [`2026-10-21-free-soundfonts.md`](2026-10-21-free-soundfonts.md) | Survey of free high-quality SoundFonts in 2026 across SF2, SF3, and open multi-sample formats | Reference for audio assets and sound quality |
| [`2026-10-29-network-load.md`](2026-10-29-network-load.md) | The network load of the production build: the gzip of the preset and demo files, the phone and desktop load before and after, and the open candidates of the load | Design 6.2, 6.3, 7.2, and 8.3, the gzip of the preset and demo files |

## Scripts

The `scripts/` folder holds the scripts that the agents ran. They are research evidence, not
app code.

| Folder | Language | Used by |
|---|---|---|
| `scripts/spessasynth/` | Node 24 ES modules | `audio-engines.md`, `audio-scheduling.md` |
| `scripts/midi/` | Python 3, standard library only | `midi-sources.md` |
| `scripts/musescore/` | Python 3, standard library only | `musescore-export.md` |
| `scripts/spike/` | Node 24 ES modules, Playwright, geckodriver | `audio-spike.md`, `default-demo.md` |
| `scripts/step-2-warm-up/` | Node 24, TypeScript | `step-2-warm-up.md` |
| `scripts/webkit-audio/` | Node 24, Playwright, the `jsc` shell of macOS | `webkit-audio.md` |
| `scripts/step-5/` | Node 24, Playwright, Python 3 with Pillow | `step-5-frame.md` |
| `scripts/room-and-mix/` | Node 24, TypeScript, Playwright, Python 3 with numpy and scipy | `room-and-mix.md`, `cheerful-demos.md` |
| `scripts/demo-loudness/` | Node 24, TypeScript, Playwright | `demo-loudness.md` |
| `scripts/cheerful-demos/` | Node 24, TypeScript, Python 3, standard library only | `cheerful-demos.md` |
| `scripts/joyful-ode/` | Node 24, TypeScript, Playwright, Python 3, standard library only, zsh | `2026-10-06-joyful-ode.md` |
| `scripts/blender-rabbit/` | Blender 5.2 Python, Python 3 with Pillow | `2026-10-08-blender-rabbit.md` |
| `scripts/fox-look/` | Blender 5.2 Python, Python 3 with Pillow, Node 24 with Playwright | `2026-10-08-fox-look.md` |
| `scripts/cat-hippo/` | Blender 5.2 Python, Python 3 with Pillow, Node 24 with Playwright, Vitest | `2026-10-08-cat-hippo.md` |
| `../../tools/spike/fox-gated/` | Blender 5.2 Python with OpenVDB, Python 3 with Pillow, numpy, and scipy (through uv), zsh | `2026-10-08-fox-spike-gated.md` |
| `scripts/short-legs/` | Python 3 with Pillow (through uv), Node 24, TypeScript | `2026-10-11-short-legs.md` |
| `scripts/low-seats/` | Python 3 with Pillow (through uv) | `2026-10-11-low-seats.md` |

The reports name the files of a temporary research folder. Use this map to find them here:

| Name in a report | Location in this repository |
|---|---|
| `ss/<file>`, `scratchpad/ss/<file>` | `scripts/spessasynth/<file>` |
| `scratchpad/midinfo.py`, `mscxinfo.py`, `pieceinfo.py`, `scrape_mutopia.py` | `scripts/midi/<file>` |
| `musescore/<file>.py`, `scratchpad/musescore/<file>.py` | `scripts/musescore/<file>.py` |

Some inputs and outputs of the scripts are now in the repository:

- `GeneralUserGS.sf3` was at `assets/soundfont/GeneralUserGS.sf3` until the SoundFont of
  design 6.2 replaced it. `tools/build-soundfont.ts --fetch-only` downloads it into its cache
  folder, and `BASE_SOUNDFONT` of `tools/soundfont-recipes.ts` gives its URL and SHA-256.
- The five Mutopia demo files and the Boulanger demo file are in `demos/src/`. On 2026-10-05,
  the user replaced three of them (design 8.2). `demos/README.md` gives the current files.
- The Boulanger score with the lyrics removed is at `demos/boulanger/matin-nolyrics.mscz`.
- The fixed pipeline scripts are in `tools/musescore/`. `demos/README.md` describes the fix.

The repository does not hold the other inputs and outputs: the split preset files in `split/`,
the other downloaded Mutopia files, the OpenScore `.mscz` files with lyrics, and the MuseScore
test exports.

On 2026-10-05, step 2 removed `src/spike/midi-score.ts`, the temporary parser of the spike.
`scripts/spike/block-times.ts` and `scripts/webkit-audio/prepare.ts` import it. To run them
again, check out commit `80cf371`, the last commit with that file. `tools/measure-targets.ts`
times the render of each demo with `score/`, as `block-times.ts` did for the Beethoven demo.

The folder `step-2-targets/` holds the raw output of `tools/measure-targets.ts` for
[`step-2-targets.md`](step-2-targets.md).
The folder `step-5-frame/` holds the raw output of `tools/measure-frame.ts` for
[`step-5-frame.md`](step-5-frame.md).

To run the spessasynth scripts again:

1. Install `spessasynth_core@4.3.22` in the folder of the scripts.
2. Copy `GeneralUserGS.sf3` from the cache folder of `tools/build-soundfont.ts` to the parent
   folder.
3. Run a script with `node <file>.mjs`.

The size entries `entry-ss.js` and `entry-tone.js` also need `spessasynth_lib@4.3.14`,
`tone@15.1.22`, `vite`, and `esbuild`.
