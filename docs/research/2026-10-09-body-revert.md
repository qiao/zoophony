# The revert of the animal bodies to 2026-10-06

Date: 2026-10-09. Branch: `worktree-agent-a124949e76c81f83f`, from `main` at `77347986`. The
decision file [`2026-10-09-body-revert.md`](../decisions/2026-10-09-body-revert.md) gives the
decisions.

## 1. Summary

The user asked to revert the models of the animals to 2026-10-06 18:58, when `main` was at
`d5869c21`. The branch gives each species its parametric body, its skeleton, and its colors of
that time. The 9 sculpts from Blender and the rigged red fox left the app. The crease normals and
the baked occlusion stay. The newer pose features stay, with new values where the old bodies need
them. The tools of Blender stay, and the app reads no output of them.

| Measure | `main` | This branch |
|---|---|---|
| Bodies from Blender in the app | 9 sculpts and 1 rigged body | none |
| Rest joints equal to `f0bad693` (20 species in 4 stances, and 23 players with their instruments) | no | 80 of 80 and 23 of 23 |
| Body meshes equal to `f0bad693` (20 species in 3 stances: places, bones, blends, finishes, colors) | no | 60 of 60 |
| Unit tests | 2,176 pass | 2,023 pass |
| First download (`pnpm size`) | 459,710 B after the removal of the rigged fox | 298,980 B |

The base of the body code is `f0bad693` (2026-10-07 00:28). `git log d5869c21..f0bad693 --
src/models` shows the commits between the two: the split of `biped.ts` into `trunk.ts`,
`arms.ts`, `legs.ts`, `eyes.ts`, and `body-frame.ts` (pure refactors, with their test moves), the
polar bear and its place at the piano, the crease normals, the weld of the normals, the baked
occlusion, the skin of two bones of the mesh data (with no part that uses it), a fix of the bow
stick in the fingers, the conductor stand, and the soft edge of the fur. The user keeps all of
them except the soft edge, which never reached a pixel, and which `11d1f851` removed. Thus the
look of the animals of `f0bad693` is the look of `d5869c21` with the polar bear.

## 2. Method

About 150 commits after `f0bad693` changed the bodies. A revert of each commit was not practical,
so the branch did this:

1. Removed the rigged red fox, its bind frames, its skin of four bones, and the branches of the
   test helpers for it. The red fox took the default skeleton.
2. Removed the 9 sculpts. The tools of Blender got their own copy of the packed formats
   (`tools/sculpt-format.ts` and `tools/rigged-format.ts`), so that they need no app code.
3. Restored the area files of the body (`trunk.ts`, `head.ts`, `eyes.ts`, `ears.ts`, `snouts.ts`,
   `tails.ts`, `face-patterns.ts`, `arms.ts`, `legs.ts`) and `shading.ts` from `f0bad693`. Then it
   put back the structure of the later commits: the skeleton table of `proportions.ts` with the
   defaults of `f0bad693`, the height map of the torso, the colors in `colors.ts`, and the name
   `DEFAULT_HEAD_HEIGHT`.
4. Refit the pose values that the old bodies need (section 3), and removed the dead code: the
   `fur` finish, the fillers, `splitByField()`, `sweep.ts`, and `hull.ts`.

Two scripts outside the repository proved the result. The first printed the rest joints and the
body points of each species on a chair, a low chair, a high stool, and standing, and the
skeleton of each player of each section, at `f0bad693` and on the branch. The second printed a
hash of the places, the bones, the blend weights, the finishes, and the colors of the mesh of
each species in three stances. Both gave no difference. The branch has no snapshot test of the
skeleton, because the user removed that kind of test on 2026-10-08.

The restore of each area in its own commit was not possible. The trunk, the head, the eyes, the
ears, and the snouts share the head module, and the arms and the legs share the values of the
frame with the trunk. The removal of the sculpts and the rigged fox failed 6 tests, and the same removal with
the default skeletons failed 13. Thus the bodies, the skeletons, and the pose fit came back in one
commit. The colors, the dead code, and the removal of the neck band have their own commits.

## 3. The pose fit

The pose features of 2026-10-07 and 2026-10-08 came with values for the cute bodies: wider
torsos, thick arms, and haunches with lower knees. On the old bodies, these failed the tests of
the behavior. The table gives each value that changed.

| Value | Before | Now | Fault before |
|---|---|---|---|
| Right elbow of the violin and the viola at the frog | (0.5, -1, -1) | (1, -1, -1) | the bow arm 0.065 H into the chest at the frog on the E string |
| Play shift of the violin | 0.08 H left, 0.05 H down, 0.1 H forward | 0.05 H down, 0.15 H forward | the same, and the bow forearm 0.007 H into the long muzzle of the red fox |
| Play shift of the viola | 0.08 H left, 0.05 H down, 0.04 H forward | 0.05 H down, 0.04 H forward | the bow arm 0.045 H into the chest of the cat |
| Forward turn of the right shoulder of the violin | 20° | 30° | with 0.15 H forward, the arm needed the tip help |
| Hair of the rest bow of the cello | down and out, (1, -1, 0.3) | down, (0, -1, 0.3) | the bow hand beside the knee, the forearm 0.07 H into the thigh, and 1,493° a second in the lift |
| Piano hold | the values of option A of the polar bear | the values before option A | the left palm 0.23 H from the thigh (limit 0.2 H) |
| Flute while it plays | no turn, left elbow (-1, 0, -1) | right end 20° back and 30° down, left elbow (-1, 0.5, -1) | the left upper arm 0.067 H into the chest of the tan fox |
| Turn of the horn | 10° forward, 10° right | 12° forward, 12° right | the bell 0.045 H into the right shin of the pig |
| Left palm of the horn | 0.8 of a half turn, 0.6 of the coil radius | 0.9 and 0.8 | with the turn of 12°, the palm at 0.98 of the arm length |

The other features keep their values: the left hand of the conductor, the bow stick in the
fingers, the rest places on the lap, the hanging arms of the standing players, the seated feet on
the floor, and the tip help of a short bow arm. No body of 2026-10-06 needs the tip help, so its
test now poses the rabbit with its violin 0.3 H forward. The limits of the hanging arms of the
bear and the elephant go back to 40° and 45°, because their torsos are no longer plump.

## 4. The visual check

`pnpm screenshots <dir> --sheet --play` made the screenshots at `f0bad693` and on the branch. The
two images put them side by side, with `f0bad693` at the left.

![The species sheet: f0bad693 at the left, the branch at the right](2026-10-09-body-revert/species-sheet.webp)

![The default demo during play: f0bad693 at the left, the branch at the right](2026-10-09-body-revert/default-demo-play.webp)

The forms and the colors of the animals are the same. The meshes are equal to the bit (section
1). These differences remain:

1. **The scene.** The stage, the hall, the light, and the camera of 2026-10-07 and 2026-10-08
   stay: the stage with cut corners and a raised lip, the dark walnut planks, the pool of the key
   light, the visible beam, and the higher default view. The gallery stage is lighter and
   warmer.
2. **The light on the colors.** The base colors are the colors of 2026-10-06, but the key light
   and the grade of 2026-10-07 light them. Thus the lit fur reads lighter and more saturated: for
   example, the orange of the red fox and the brown of the bear are brighter than on
   `f0bad693`.
3. **The arms.** The newer holds move the arms: the conductor raises the baton and the left hand
   beside the head, the winds hold the elbows out and forward, the bassoon turns its lower end
   forward and to the right, the horn and the flute have their new turns, and the bow arms of the
   violins hold the elbow out at the frog.
4. **The piano.** The open piano shows its strings and its soundboard (an instrument change of
   2026-10-07).
5. **The views page.** The sheet pages of `views.html` came after `f0bad693`. They now show the
   old bodies, so the fox, the rabbit, the dog, and the polar bear no longer look like their model
   sheets.

## 5. Open problems

- The colors have no tuning for the light of 2026-10-07. The user asked for the colors of that
  time, so the branch keeps them as they were.
- The turn of the horn passes the tests with no margin: a turn of 11° or 13° fails one of the
  shin test, the reach of the left palm, or the rest clearance of a standing horn soloist.
- The flute tilts 30° down while it plays, more than a real flute. A smaller tilt put the left
  upper arm of the tan fox into its chest.
- The contrabass stays open, as before: at the tip of a down-bow on its low strings, the bow hand
  of the hippo goes into its belly (design 5.3).
