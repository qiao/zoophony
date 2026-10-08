# Research

These reports hold the facts behind the decisions of the design ([`../design.md`](../design.md) and
[`../design/`](../design/)).
Research agents wrote them on 2026-10-04. The audio spike report holds measurements of
2026-10-04 and 2026-10-05. The WebKit audio report, the step 2 targets report, the step 2 warm-up report, the step 5 frame report, the seating report, the sound quality report, the default demo report, the cinematic camera report, the room and mix report, and the cheerful demos report hold measurements of 2026-10-05. The demo loudness report and the joyful Ode to Joy report hold measurements of 2026-10-06. The animal anatomy plan report, the similar products report, the Blender models plan report, the Blender stage S1 report, and the proportions report hold research of 2026-10-07. The Blender rabbit report, the fox look report, and the cat and hippo report hold research of 2026-10-08. Each fact has a source URL, a source file and line
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
