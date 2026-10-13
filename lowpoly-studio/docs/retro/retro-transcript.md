# Retro: the bear-studio session (a rigged low-poly bear conductor)

This report analyzes one agent session that built a low-poly, rigged bear conductor from one
reference sheet. The goal is to make the next model of the same kind faster and cheaper.

## Source and method

- **Transcript:** `bc84cf37-.../subagents/agent-a6922107027d2bdf6.jsonl`. It has 2,491 lines
  (107 MB), 590 tool calls, 1,152 assistant lines (558 API responses), and 154 images.
- **Scripts:** all scripts are in `scripts/` beside this file (first in a scratch folder of the
  session). They stream the file line by line and skip the base64 data.
  - `inspect.py`, `census.py`: the structure of the lines and the block types.
  - `briefs.py`: the briefs of the manager.
  - `extract.py`: one record per tool call, written to `events.json`.
  - `analyze.py`, `topics.py`, `phases.py`: the time split by round, by category, by topic,
    and by phase.
  - `params.py`, `tunes.py`: the hand-tuned numbers and the parameter sweeps.
- **Time:** all times are UTC from the time stamps (the local time is UTC minus 7 h).
  - Tool time is the union of the call intervals.
  - Model time is the active time minus the tool time. It includes the reading of the results
    and the images, the hidden thinking, and the writing of the next tool input.
- **Accuracy:** the category and topic rules use keywords. The shares are approximate (about
  plus or minus 10%). Most thinking blocks are empty in the file, so I report output tokens
  in place of the thinking text.

## 0. Key numbers

| Item | Value |
|---|---|
| Span of the session | 23:39 to 05:00, 5 h 21 min |
| Active agent time | 210 min in 4 rounds |
| Wait for the manager and the user | 111 min (3 waits: 20, 73, and 18 min) |
| Model time | 133 min (63% of the active time) |
| Tool time | 77 min (37%). Blender runs fill 68 min of it (89%) |
| Tool calls | 590: Bash 402, Read 158 (154 of them images), Write 30 |
| Process starts | 222 Blender runs, 167 headless Chromium runs |
| Code edits | 143 Bash calls edit code. 92 of them use an inline `patch()` helper with 416 replacement pairs. 116 pairs change only numbers |
| Parameter sweeps | 27 serial shell loops, 16.8 min of tool time |
| Failures | 5 tool errors and about 15 real failures. About 12 min lost in total |
| Output tokens | 786k. The context grew from 49k to 816k tokens |
| Final result (round 3) | 1,356 body triangles, 31 bones, 11 clips. IoU 0.952 / 0.960 / 0.949 / 0.914. Every clip passes the contact check (1 cm) and the fold check |
| Code at the end | 26 files, about 6,060 lines (Python, Node, three.js) |

## 1. Timeline

### 1.1 Rounds

The session had four rounds. A manager agent briefed each round after a review by the user.

```text
UTC  23:39       00:47  01:07      01:53          03:06               04:31  04:49   05:00
       |----R1-----|.wait.|----R2----|.....wait.....|---------R3---------|.wait.|--R4--|
         67 min      20     46 min        73 min            85 min         18   11 min
       first build         fix round +                 organic facets,          eyes, head,
       from the sheet      topology (user)             head, dark folds         ears, seed
                                                                                (stopped)
```

| Round | Wall | Tool | Model | Calls | Images | Blender runs | Browser runs | Output tokens |
|---|---|---|---|---|---|---|---|---|
| R1 first build | 67.3 min | 13.7 min (20%) | 53.7 min | 213 | 65 | 66 | 55 | 332k |
| R2 fix round + topology | 46.2 min | 12.3 min (27%) | 33.9 min | 173 | 52 | 61 | 58 | 189k |
| R3 organic facets, head, folds | 85.1 min | 48.1 min (56%) | 37.0 min | 178 | 32 | 87 | 51 | 220k |
| R4 eyes, head, ears, seed (stopped) | 11.4 min | 3.0 min (26%) | 8.5 min | 26 | 5 | 8 | 3 | 45k |
| **Total** | **210 min** | **77 min** | **133 min** | **590** | **154** | **222** | **167** | **786k** |

Milestones of round 1: the first Blender mesh at 21 min, the first compare (IoU) at 25 min, the
first rigged GLB with clips at 36 min, the first commit at 42 min, and the report at 67 min.

After the stop, other sessions did round 4 again and one more round. The git log shows two more
groups of commits (at 22:39 and 00:13 local time) on the head, the eyes, the ears, and the seed.
Those sessions are not in this transcript.

### 1.2 Phases

| Phase | Wall (min) | Tool (min) | Calls | Images |
|---|---|---|---|---|
| R1a study the sheet: masks, crops, row runs | 11.9 | 0.1 | 22 | 11 |
| R1b body distance field and silhouette fit | 9.2 | 1.6 | 18 | 2 |
| R1c Blender mesh (surface nets, decimation) | 1.6 | 0.1 | 7 | 0 |
| R1d viewer, compare page, frames page, shot tool | 4.3 | 0.2 | 15 | 1 |
| R1e details, paint, rig, IK solver, motions, export | 8.2 | 0.0 | 10 | 0 |
| R1f first full build, compare, face, clips, commit | 7.0 | 1.1 | 35 | 19 |
| R1g look tuning: light, belly, decimation, palette, beat | 18.0 | 7.5 | 78 | 26 |
| R1h viewer shot, close-ups, README, commit | 7.1 | 3.0 | 28 | 6 |
| R2a contact check and pose fixes | 11.8 | 2.9 | 27 | 4 |
| R2b face crops and fur color match | 2.5 | 0.5 | 11 | 2 |
| R2c topology measure, QuadriFlow, facet tuning | 10.8 | 1.7 | 40 | 14 |
| R2d snout and face on the new mesh | 5.7 | 0.9 | 25 | 10 |
| R2e rig recheck, facet measure, armpit, feet, seed | 8.2 | 3.0 | 40 | 14 |
| R2f full build, bow fix, README, commits | 7.2 | 3.3 | 30 | 8 |
| R3a gaps, head and snout from the side profile | 5.5 | 0.6 | 12 | 2 |
| R3b organic facets and light contrast | 5.3 | 2.3 | 14 | 2 |
| R3c face, neck, occlusion-bake fix | 3.3 | 1.3 | 9 | 3 |
| **R3d dark folds: correctives, fold check, weights, twist** | **52.5** | **32.1** | **101** | **17** |
| R3e contrast recheck and seed search | 13.2 | 10.5 | 14 | 1 |
| R3f final review, README, commits | 5.3 | 1.2 | 28 | 7 |
| R4 baseline, eye and ear measures, head loft | 11.4 | 3.0 | 26 | 5 |

The largest phase is R3d (52.5 min, 25% of the active time). Section 3.2 explains it.

### 1.3 Where the tool time went

| Kind of call | Calls | Tool time | Mean |
|---|---|---|---|
| Blender build and browser render in one command | 87 | 30.3 min (39%) | 20.9 s |
| Blender only (build, fit, remesh, check) | 114 | 29.9 min (39%) | 15.7 s |
| Full `build.sh` | 21 | 8.1 min (11%) | 23.1 s |
| Browser render only (Playwright and three.js) | 70 | 7.7 min (10%) | 6.6 s |
| Image measure or crop (Pillow) | 41 | 0.4 min | 0.5 s |
| Inspect code, git, edits with no run | 69 | 0.5 min | 0.5 s |
| Image reads (Read tool) | 154 | 0.1 min | 0.0 s |

The full build grew with each round: 12 s in R1, 31 s in R2, and 50 s in R3. The last build log
shows the stages: the field and the surface nets 1.6 s, the remesh with the organic pass 17.3 s,
the rig, the weights, and the clips about 6 s, and the contact and fold check 12.5 s. The
compare and the frames add about 15 s. About half of the check time goes to the `performance`
clip, which repeats all other clips.

### 1.4 Where the model time went

The model time (133 min) is larger than the tool time (77 min) in each round except R3.

| The model time before... | Gaps | Time | Mean |
|---|---|---|---|
| a build, render, or measure command | 255 | 61.5 min (48%) | 14.5 s |
| a code patch with a run | 143 | 38.2 min (30%) | 16.0 s |
| a new file (Write) | 30 | 21.1 min (17%) | 42.2 s |
| an image read | 154 | 6.5 min (5%) | 2.5 s |

- **Images:** 46 min of model time comes directly after an image result. The model looks at the
  image and decides the next step. This is 36% of the model time. The agent read 154 images
  in 111 batches. 90 batches held one image only.
- **New code:** the 30 Write calls hold 195k characters (the README 15k, `motion.py` 15k,
  `body.py` 14k, `organic.py` 10k). Each new module took 40 to 150 s to write.
- **Planning:** R1a (11.9 min) has almost no tool time. The model wrote 41k output tokens of
  hidden thinking there to choose the method.
- **Docs and git:** the README and the commits took about 7 min in total. This is small.

### 1.5 Context and cache

- The context grew from 49k tokens to 497k at the end of R1 and to 816k at the end of R3.
- The images are about 105k tokens (mean 810 each), and the text results about 85k tokens.
  The tool inputs (patches and files) are about 221k tokens. The rest is the agent's own text
  and thinking.
- Each resume after a wait rebuilt the prompt cache: 501k tokens at 01:09, 481k at 03:07, and
  819k at 04:48. Three "thinking drop" events also rebuilt 352k and 435k tokens in R2 and 667k
  in R4.
- A fresh agent for each round, with a short handoff file, would start at about 50k to 80k
  tokens in place of 500k to 820k.

## 2. Tool use

### 2.1 Counts

| Tool | Calls | Notes |
|---|---|---|
| Bash | 402 | 222 start Blender, 167 start Chromium, 143 edit code, 27 are sweeps |
| Read | 158 | 154 images: 35 compare tiles, 35 motion frames, 34 face crops, 20 sheet crops, 20 debug close-ups, 10 facet and wire crops |
| Write | 30 | 29 repository files: modules, pages, the shot tool, the README (`build.py` twice). Scratch scripts went through Bash |

The agent edited code mostly through Bash with an inline Python helper:

```python
def patch(p, rep):
    s = open(p).read()
    for a, b in rep:
        assert a in s, (p, a)
        s = s.replace(a, b)
    open(p, 'w').write(s)
```

It used the Edit tool zero times. The helper let it patch and run the build in one call. It
also caused 2 syntax errors in patched text with nested triple quotes (04:09, 04:59).

### 2.2 The most repeated work

- **Build and look:** the main loop was "patch, rebuild in Blender, render in the browser, read
  the image". It ran about 150 times.
- **Number tuning:** 116 patch pairs change only numbers. By file: `motion.py` 44 (the poses
  and the beat path), `body.py` 30 (the body proportions), `details.py` 15 (the face parts),
  `paint.py` 7 (the colors). There were 29 more `sed -i` edits of numbers, 9 of them on the
  lights in `scene.js`.
- **Remesh settings:** `--quads` appears in 45 commands with 8 values (450 to 960). The seed
  search ran 6 times.

### 2.3 The slowest commands

| Time | Round | Command | Note |
|---|---|---|---|
| 199 s | R3 | Run the full checks for five remesh candidates | serial sweep |
| 126 s | R3 | Measure the IoU and the belly contrast for six remeshes | serial sweep |
| 121 s | R3 | Search remesh seeds and quad counts by IoU | serial sweep |
| 120 s | R1 | Try three light settings | hang, zsh split (see 2.4) |
| 120 s | R3 | Render the arm of a mesh built in the sheet pose | hang, missing GLB |
| 110 s | R3 | Render the arm of the sheet-pose field mesh | hang, missing GLB |
| 73 s | R3 | Fix the cue and the throat weights, test two seeds | serial sweep |
| 62 s | R1 | Keep face detail in decimation | dead end (see 3.1) |
| 55 s | R3 | 5 commands of "change a pose or a weight rule, then rebuild all clips" | full rebuild for a pose change |

### 2.4 Errors and failures

| Failure | Kind | Count | Cost |
|---|---|---|---|
| `set -- $cfg` does not split words in zsh. The sed wrote `0.45 2.9 0.35` into one light and empty values into two lights. The page failed, and the shot tool waited to the 120 s timeout | zsh, no fail-fast | 2 (00:22, 01:29) | 2.5 min and 0.5 min. It also broke `scene.js` and a Python constant |
| A `--no-rig` build failed, and a grep filter hid the traceback. The page then waited on a 404 for the GLB | headless page, no fail-fast | 1 (2 runs of 120 s and 110 s) | 5.5 min |
| The harness blocked `sleep 30` and `sleep 100` | harness rule | 2 | under 1 min |
| `timeout` is not on macOS | macOS shell | 1 | under 0.5 min |
| `pgrep` at the end of a command exits 1 when no process remains, so a passing build showed as an error | shell | 2 | under 1 min, but confusing |
| Syntax or order errors in inline patches | edit method | 3 | about 2 min |
| Blender API: `select_set` on `None`, duplicate edges after a join, the Blender 5.2 action API (2 probes), `argparse` read the Blender flags, the glTF importer splits the vertices of each face | Blender | 6 | about 3 min |
| Environment: no Pillow in the Python of Blender, the wrong Playwright package path | setup | 2 | about 1 min |
| Viewer JavaScript: two "access before initialization" errors | three.js page | 2 | 1.5 min |

Headless WebGL had no failure. The flags in the brief (`--use-angle=metal --enable-gpu
--ignore-gpu-blocklist`) worked on the first run. Only deprecation warnings showed
(`PCFSoftShadowMap`, `THREE.Clock`).

Total direct loss from failures: about 12 min (6% of the active time). The failures are a small
cost. The large costs are the loops in section 3 and the late requirements in section 4.

## 3. Loops and dead ends

### 3.1 Dead ends and replaced methods

| Method | Status | Cost |
|---|---|---|
| Visual hull from the three views | Rejected by reasoning before the first build. With three views it gives box sections, and in the side view the arms merge with the body | 0 min of tools (part of the 12 min planning) |
| Free decimation of the dense field mesh, with face-detail vertex weights | Used in R1. Six probe runs on flipped faces and face weights (R1g, about 6 min). Replaced in R2 by the QuadriFlow mirrored remesh after the user said the topology looked wrong | about 6 min in R1, and the base of the R2 rework |
| Random color jitter for each face | Added in R1, tuned twice, removed in R2 | about 2 min |
| Facet measure from the image (shading steps) | Added in R2. It swings between remesh runs and misses edges on soft renders. Replaced by mesh measures | about 4 min |
| Bone-heat automatic weights | Used in R1. Then rules were added on top: spine bands for the trunk (R2), crotch, throat, and joint masks, and limits on child weights along the limbs (R3) | part of R3d |
| In-and-out vertex jitter for a hand-made look | Added in R2, removed in R3 | about 3 min |
| Seed choice by IoU only (R2), then by IoU and contrast (R3) | A later session chose the first seed whose clips pass | 6 seed searches, 10.5 min of tool time |

### 3.2 The fold loop (R3d, 52.5 min)

The mesh is bound with the arms raised, because a conductor holds the arms up. The sheet pose
has the arms down. Linear blend skinning then folds the skin under the arms and at the elbows.

```text
 add correctives (shape keys) ---> build all clips (35-55 s) ---> fold check
          ^                                                          |
          |                                                     FAIL (1-31 faces)
          |                                                          v
 patch a weight rule, a pose, <--- read the faces, render the  <--- "locate" run
 a twist bone, or the clavicle     spot (image)                      (16-38 s)
```

- About 25 rebuilds of all clips, 18 to 55 s each.
- 11 "locate the turned faces" runs (4.7 min of tool time, and the model time around them).
  The build log said "turned faces 3", but it did not say where.
- The fold limit was defined inside the loop. At 04:09 the check split into "turned past
  90 degrees" (a report) and "folded past 120 degrees" (a failure). Then all clips passed at
  once.
- The fixes that worked are generic for any biped: 2 corrective shapes for the arms down,
  forearm twist bones, a clavicle that follows a raised arm, weight limits along the limb
  chains, and an occlusion bake that keeps the arms apart from the trunk.
- A remesh with a new seed brought the folds back in 5 clips (03:49). Each new mesh needed
  pose fixes again.

### 3.3 Light and color tuning

The agent ran Blender or the browser 41 times for the light and the colors.

- **R1:** 20 runs on the albedo and on the hemisphere, key, and fill lights, with 4 sweeps (one
  hang).
- **R2:** 7 runs to match the fur hue and saturation. The measure came first, so this went
  fast.
- **R3:** 14 runs on the belly contrast, the key direction, and the occlusion. Some came after
  a new seed changed the contrast.

The sheet has a soft studio light with a bright fill. The viewer started with a hard key light.
A light preset that matches the generator of the sheet would remove most of these runs.

### 3.4 Face and head

The face topic took 105 calls, 44 images, and about 29 min. The snout changed form 5 times in
R2 (disk, ball, capsule, then a color rule for the corners). The head changed again in R3
(dome, cone snout) and in R4 (head loft, neck groove). No early measure of the head profile,
the ears, or the eyes existed. The ear measure came only in R4: the render ears were 8% to 30%
smaller than the sheet ears.

### 3.5 Checks that came late

| Check | Round | Who asked |
|---|---|---|
| Silhouette IoU of 4 views, field IoU, mesh validity | R1 | the brief and the agent |
| Contact check of each clip (1 cm limit) | R2 | the manager |
| Face crops, facet crops, fur color (hue, saturation) | R2 | the manager |
| Facet size, slivers, mirror share | R2 | the manager (after the user) |
| Belly contrast, mesh regularity (valence, edge directions) | R3 | the manager |
| Fold check of each clip frame (turned and folded faces) | R3 | the agent, after the manager's "dark folds" |
| Ear size and eye size against the sheet | R4 | the manager |
| Seed robustness (the full check on several seeds) | R4 | the manager |

Each check is generic. With all of them in the first build, R2 to R4 would have started from
numbers in place of a review by eye.

### 3.6 What would have removed the loops

| Tool, config, cache, or parallel run | What it removes | Estimated saving |
|---|---|---|
| A cache of the remeshed body, keyed by the body config and the seed | 17 s of each pose or weight rebuild (about 25 rebuilds in R3d) | about 7 min of tool time |
| No contact check on the `performance` clip (it repeats the other clips) | about 6 s of each build | about 3 min |
| A sweep runner that runs Blender jobs in parallel (4 to 6 workers) | the serial seed and setting sweeps (16.8 min) | about 10 to 12 min |
| A failure locator in the build log: clip, frame, bone, side, region, and a crop image of each failing face | the 11 "locate" runs and the model time around them | about 10 to 15 min |
| A shot tool that stops at the first page error, and a check that the GLB exists | the 3 hangs | about 8 min |
| Tuning numbers in a config file (JSON), with sweeps that edit the config and never the code | the zsh and patch errors, and 145 number edits in code | about 5 min, and safer sweeps |
| One review sheet image for each build (the sheet beside the render: 4 views, face, facets, joints, with the numbers on it) | most of the 154 single image reads | about 15 to 20 min of model time |
| A light preset for the sheet | most of the 41 light and color runs | about 10 min |

## 4. Requirements that came late

| Requirement | Source and time | Rework in this transcript | A standard brief or sheet spec fixes it up front? |
|---|---|---|---|
| Contact check with a limit, worst value of each clip | manager, R2 | R2a, 11.8 min (with the pose fixes) | Yes: a standard check list |
| A bigger beat pattern at the chest, a longer baton | manager, R2 | about 3 min in R2a | Yes: a motion spec with the size and the place |
| Face: a larger muzzle, a larger nose | manager, R2 | R2d, 5.7 min | Partly: a face crop sheet and a feature measure |
| Eyes "with no white ring" | manager, R2 (a wrong claim) | small in R2. R4 and a later round reversed it | Yes: the brief names each feature from a measured crop. The agent checks a visual claim against the sheet before it acts |
| Fur color within a small margin | manager, R2 | R2b, 2.5 min | Yes: a color target in the check list |
| "Topology aligned and natural" | **user**, R2 (01:21) | R2c to R2e, about 25 min, and the R1 decimation work (about 6 min) | Yes: a topology spec (mirrored, edge flow, facet size in px, organic variation) |
| Organic facets, low facet contrast, soft light | manager, R3 | R3b and R3e, about 18 min | Yes: the topology spec and a light preset |
| Head with a dome, a snout that projects | manager, R3 | R3a and R3c, about 9 min | Partly: a side-profile measure of the head |
| No dark folds in the 4 views and the frames | manager, R3 | R3d, 52.5 min | Partly: a fold check and a rig template from the first build. The tension between the bind pose and the sheet pose stays |
| Eyes with a white rim, the head as a ball, larger ears | manager, R4 | R4, 11.4 min, and two later rounds | Yes: feature measures (eyes, ears, neck line) in the first build |
| Seed robustness | manager, R4 | R4 and a later round | Yes: a standard check "N of M seeds pass" |

Agent time in R2 to R4 is 142 min, and the waits add 111 min. A standard brief, a sheet spec,
and the check list would remove an estimated 60% to 70% of that rework. The rest is real
refinement by eye.

The 3/4 view stayed near IoU 0.91 in all rounds. The sheet's 3/4 view has the head turned more
and the arms further forward than the other views. One rigid pose cannot match it. A sheet spec
with one pose in all views fixes this.

## 5. Generic and bear-specific parts

```text
 reference sheet --> measure.py --> masks, row runs --> body field (sdf.py + body.py)
                                                              |
       fit.py (IoU of the field) <----------------------------+
                                                              v
 retopo.py (QuadriFlow, mirror, warps) --> organic.py --> paint.py (palette, regions, occlusion)
                                                              |
 rig.py (bones, weights) --> corrective.py --> pose.py (IK) --> motion.py (clips) --> anim.py
                                                              |
                         contacts.py (contact + fold check) --+--> out/bear.glb
                                                              |
 shoot.mjs + viewer/compare.js + frames.js --> IoU, crops, frames, review images
```

| Part | Generic for any standing animal | Animal-specific (config) | Role-specific (conductor) |
|---|---|---|---|
| `measure.py`, `views.py`, `fit.py` | masks, cameras, IoU, row runs | the view columns of the sheet, the 3/4 azimuth | none |
| `sdf.py` | primitives, blends, surface nets | none | none |
| `body.py` | the loft trunk and the part model | the tables `ARM_REF`, `LEG`, `SPINE`, `HEAD`, `SNOUT`, `TAIL`, the head profile | none |
| `retopo.py`, `organic.py`, `facets.py`, `topology.py` | mirrored remesh, organic pass, facet measures | the warp centers (head, snout, feet), the quad count, the seed | none |
| `paint.py`, `details.py` | palette, regions, occlusion bake, eye plates | the region rules (tan muzzle, belly, inner ears), the claws, the nose | the baton |
| `rig.py`, `corrective.py`, `pose.py`, `anim.py` | biped skeleton, weight rules, twist bones, clavicle follow, correctives, IK, export | the joint places (from `body.py`), the ears, the tail | the baton bone |
| `contacts.py` | contact and fold check, limits | the part list | the baton as a part |
| `motion.py`, `pattern.py` | the clip format and the time base | none | all 11 clips, the 4/4 path |
| `shoot.mjs`, `viewer/` | render, compare, crops, frames, viewer | the light preset of the sheet | the clip notes and the tempo slider |
| `ears.py`, `eyes.py` | feature measures | the feature list | none |

About 80% of the code is generic. The bear-specific part is mostly numbers: about 20 tables in
`body.py`, the region rules in `paint.py`, the face parts in `details.py`, and the warps in
`retopo.py`. The conductor part (`motion.py`, `pattern.py`, the baton) works for any animal on
the same skeleton.

## 6. Recommendations

The list is in the order of value: the time saved on the next model for the effort to build.

### 6.1 A standard check list with limits in every build (highest value)

**Scope:** one `checks.json` report and one exit code from `build.sh`. Each check has a limit
and a "where" field that names the clip, the frame, the bone, the side, and the region.

```typescript
export interface CheckLimits {
  /** Minimum silhouette IoU for each view of the sheet. */
  iouMin: { front: number; side: number; back: number; threeQuarter: number };
  /** Deepest contact of a paw, a claw, a forearm, or a prop inside the body, in cm on a 1 m model. */
  contactMaxCm: number;
  /** A face that turns past this angle from its rest normal fails the build. */
  foldMaxDeg: number;
  /** A face that turns past this angle shows in the report only. */
  turnReportDeg: number;
  /** Maximum fur hue difference in degrees, and saturation difference, against the sheet. */
  colorMax: { hueDeg: number; saturation: number };
  /** Ratio of the render's fine facet contrast to the sheet's, as [min, max]. */
  contrastRatio: [number, number];
  /** Median facet edge in px at the sheet scale, as [min, max]. */
  facetEdgePx: [number, number];
  /** Maximum share of slivers (smallest angle under 15 degrees). */
  sliverMax: number;
  /** Minimum share of mirrored vertices. */
  mirrorMin: number;
  /** Feature sizes (eyes, ears, nose, muzzle) as a ratio of the sheet's, as [min, max]. */
  featureRatio: [number, number];
  /** Remesh seeds to test, and how many of them must pass all checks. */
  seeds: { tested: number; mustPass: number };
}

export interface CheckFailure {
  check: 'iou' | 'contact' | 'fold' | 'color' | 'contrast' | 'facet' | 'feature' | 'seed';
  clip: string | null;
  frame: number | null;
  bone: string | null;
  side: 'L' | 'R' | null;
  /** Measured value and its limit. */
  value: number;
  limit: number;
  /** Path of a close-up image of the failing spot. */
  crop: string | null;
}
```

**Effort:** 1 to 2 h. Most measures exist in `contacts.py`, `corrective.py`, `facets.py`,
`ears.py`, and `compare.js`.

**Saving:** about 50 to 70 min on the next model. The fold loop gets a locator and a fixed
limit. The color, contrast, facet, and feature gaps show in round 1 in place of rounds 2 to 4.
The seed check removes a later round.

### 6.2 A brief template for the manager, and a rule to check visual claims

**Scope:** one Markdown template. It fills in the facts that came late this time:

- **Topology:** mirrored, edge flow along the forms, organic triangles, the target facet edge
  in px at the sheet scale, no color jitter.
- **Light:** the light preset of the sheet (soft studio light, bright fill, low facet
  contrast).
- **Face and head:** each feature with a measured crop of the sheet: the eyes (dark iris, thin
  white rim, highlight), the muzzle, the nose, the ears, the head as a ball, the neck line.
- **Motions:** the clip list with the size and the place of each gesture (the beat pattern at
  the chest, as wide as the arms reach).
- **Checks:** the limits of 6.1.
- **Rule:** the manager attaches a crop of the sheet to each visual claim. The agent checks
  each visual claim against the sheet before it acts. This rule stops errors such as "no white
  ring".

```typescript
export interface RoundBrief {
  /** One gap for each item, with the evidence. */
  gaps: Array<{
    item: string;
    /** What the sheet shows, in measured terms. */
    sheetFact: string;
    /** Path of a crop of the sheet that shows the fact. */
    sheetCrop: string;
    /** The check that proves the fix, with its limit. */
    check: keyof CheckLimits | 'by-eye';
  }>;
  /** Values that must not get worse, for example the IoU of each view. */
  keep: Partial<CheckLimits>;
}
```

**Effort:** 30 min.

**Saving:** 1 to 2 review rounds. Each round costs 45 to 85 min of agent time and 20 to 70 min
of waiting.

### 6.3 A reference sheet spec

**Scope:** a one-page spec for the user or for the image generator.

| Item | Spec | Reason from this session |
|---|---|---|
| Views | front, side, back, 3/4, and a top view if possible | the 3/4 view disagreed with the others |
| Pose | the same pose in all views. Arms slightly away from the body (A-pose) | in the side view the arms merged with the body. The 3/4 view had the head turned more |
| Camera | orthographic, or a stated focal length and distance | the perspective of the views needed a fit |
| Layout | one view in each fixed cell, or one file for each view | the view columns are hard-coded in `measure.py` |
| Background | flat, one color, no ground shadow | the masks needed hole fills and speck removal |
| Light | soft, even, stated (key direction, fill) | 41 light and color runs |
| Scale | one ground line and one height in all views | the row runs and the scale |
| Face sheet | a front and a side close-up of the head at 2x | the eyes, the ears, and the snout came late |
| Palette | swatches of the main colors | the fur hue needed 3 runs |

**Effort:** 30 min to write. It adds work for each new sheet.

**Saving:** 30 to 60 min, and the 3/4 IoU limit of 0.91 goes away.

### 6.4 A generic "animal studio" pipeline with a config for each animal

**Scope:** move the numbers out of the code into one config file for each species and one
motion pack for each role. Rename `tools/bear/` to a generic package.

```typescript
export interface AnimalConfig {
  /** Species id, for example 'bear' or 'fox'. */
  id: string;
  sheet: {
    path: string;
    /** Pixel columns of each view: [x from, x to]. */
    columns: Record<'front' | 'side' | 'back' | 'threeQuarter', [number, number]>;
    /** Camera azimuth of the 3/4 view in degrees. */
    threeQuarterAzimuthDeg: number;
    lightPreset: 'soft-studio' | 'hard-key';
  };
  /** Joint places and part sizes in model units (the model is 1 unit tall). */
  body: {
    trunk: Array<{ height: number; width: number; depth: number }>;
    head: { center: [number, number, number]; radius: number; profile: Array<[number, number]> };
    snout: { from: [number, number, number]; to: [number, number, number]; radii: [number, number] };
    arm: { shoulder: [number, number, number]; elbow: [number, number, number]; wrist: [number, number, number] };
    leg: { hip: [number, number, number]; knee: [number, number, number]; ankle: [number, number, number] };
    ears: { center: [number, number, number]; size: [number, number]; tiltDeg: number } | null;
    tail: { center: [number, number, number]; radii: [number, number, number] } | null;
  };
  remesh: {
    quads: number;
    /** Seeds to test. The build keeps the first seed that passes all checks. */
    seeds: number[];
    /** Regions that get smaller facets: center, radius, and scale. */
    warps: Array<{ center: [number, number, number]; radius: number; scale: number }>;
    organic: { collapseShare: number; flipShare: number; relax: number };
  };
  paint: {
    /** sRGB colors from the sheet. */
    palette: Record<'fur' | 'belly' | 'muzzle' | 'nose' | 'eye' | 'innerEar' | 'claw', [number, number, number]>;
    regions: Array<{ name: string; rule: string }>;
  };
  /** Bind pose of the arms, in degrees. */
  bind: { shoulderFlex: number; shoulderAbduct: number; elbowFlex: number };
  /** Motion pack of the role, for example 'conductor'. */
  role: string;
  checks: CheckLimits;
}
```

**Effort:** 3 to 5 h of agent time. The code exists. The work is to move the constants and to
test the move with the bear (the same IoU and checks).

**Saving:** about 30 to 40 min on the next model. The viewer, the compare page, the shot tool,
the rig, the IK solver, the motions, the export, and the checks need no new code. R1a, R1d, and
R1e (24 min) shrink to a config and a body fit.

### 6.5 A standard rig template from the first build

**Scope:** the bone names, the bind pose, and the deformation aids that R3 added, in the first
build for each biped animal.

- **Bones (31):** `root`, `hips`, `spine`, `spine1`, `chest`, `neck`, `head`, `ear_L/R`,
  `clavicle_L/R`, `upper_arm_L/R`, `forearm_L/R`, `forearm_twist_L/R`, `hand_L/R`,
  `fingers_L/R`, `thigh_L/R`, `shin_L/R`, `foot_L/R`, `toe_L/R`, `tail`, and a prop bone
  (`baton`).
- **Bind pose:** the arms at the middle of the role's range (40 degrees forward, 10 degrees out,
  the elbows 25 degrees more bent).
- **Aids:** corrective shapes for the arms down to the sheet pose, clavicle follow, a forearm
  twist bone with about 55% of the twist, weight limits along the limb chains, the trunk
  weighted by spine bands, and the face rigid on the head bone.

**Effort:** about 1 h, as part of 6.4.

**Saving:** about 30 min. These aids came in R3 after 52 min of the fold loop.

### 6.6 A faster build loop

**Scope:**

- A cache of the remeshed body (keyed by a hash of the body config and the seed).
- A `--clips` flag that checks only the changed clips, and no check on `performance`.
- A sweep command that runs Blender jobs in parallel and writes one table.
- A shot tool that stops at the first page error and checks that the GLB exists.
- Shell rules for macOS zsh in the brief: no `set -- $var` for splitting, no `timeout`, no
  `sleep` waits (use Monitor), and `pgrep ... || true` at the end of a command.

**Effort:** 1 to 2 h.

**Saving:** about 20 to 25 min of tool time on a model of this size (see 3.6). A pose or weight
round drops from 35 to 55 s to about 15 to 20 s for each rebuild.

### 6.7 One review sheet for each build

**Scope:** one image that puts the sheet beside the render, with the numbers printed on it:
the 4 views with the IoU, the face crops (front, side, 3/4), the facet crops (chest, shoulder,
head), the joint close-ups of the worst frames, and the 4/4 path. Long edge at most 1,600 px.

**Effort:** about 1 h. The crops exist in `compare.js` and `frames.js`.

**Saving:** about 15 to 20 min of model time, and a smaller context. The agent read 154 images
in 111 batches, and 46 min of model time came after image results.

### 6.8 A fresh agent for each round, with a handoff file

**Scope:** the manager starts a new agent for each round. The agent reads a handoff file: the
README, the last `checks.json`, the review sheet, and the list of open limits.

**Effort:** 30 min (a template for the handoff file).

**Saving:** the context of a resumed round started at 480k to 820k tokens, and each resume
rebuilt the cache. A fresh round starts at about 50k to 80k tokens. This saves tokens and cost
more than wall time.

### 6.9 An agent skill: "lowpoly-animal-studio"

**Scope:** a skill that holds the steps of 6.4, the brief of 6.2, the sheet spec of 6.3, the
check list of 6.1, the rig template of 6.5, and the traps of section 2.4.

**Effort:** 1 to 2 h after 6.1 to 6.7.

**Saving:** it removes most of the 12 min planning phase (41k thinking tokens), and the setup
probes (the Blender Python, the Playwright path, the action API).

### 6.10 Summary of the estimates

| Recommendation | Effort | Saving on the next model |
|---|---|---|
| 6.1 check list with limits and a locator | 1 to 2 h | 50 to 70 min, and 1 round |
| 6.2 brief template and the visual-claim rule | 30 min | 1 to 2 rounds |
| 6.3 reference sheet spec | 30 min | 30 to 60 min |
| 6.4 generic pipeline with a config | 3 to 5 h | 30 to 40 min |
| 6.5 rig template | 1 h (in 6.4) | about 30 min |
| 6.6 faster build loop | 1 to 2 h | 20 to 25 min |
| 6.7 review sheet | 1 h | 15 to 20 min |
| 6.8 fresh agent for each round | 30 min | tokens and cache cost |
| 6.9 agent skill | 1 to 2 h | about 10 min, and fewer setup errors |

The bear took 210 min of agent time in 4 rounds, plus 111 min of waits and two more rounds in
later sessions. With 6.1 to 6.7, the next animal of the same kind can take an estimated 60 to
90 min of agent time in 1 or 2 review rounds. This estimate assumes a sheet that follows 6.3
and a biped animal with the same role.
