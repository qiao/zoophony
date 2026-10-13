# The studio polar bear as the pianist

On 2026-10-12, the user decided: "replace the polar bear pianist by the polar bear model from the
lowpoly studio folder". This report gives the facts behind the decisions of
[`2026-10-12-studio-polar-bear.md`](../decisions/2026-10-12-studio-polar-bear.md): the source
file, the scale, the seat, the fit of the hold, the folded faces, the tests, the size, and the
images. The measures come from the branch `studio-polar-bear` on 2026-10-12. The route is the
route of the studio bear ([`2026-10-12-studio-bear.md`](2026-10-12-studio-bear.md)). The script
`2026-10-12-studio-polar-bear/measure-folds.ts` gives the numbers of section 5 again
(`node docs/research/2026-10-12-studio-polar-bear/measure-folds.ts` in the root of the
repository).

## 1. The source

`lowpoly-studio/animals/polar-bear/out/polar-bear.glb` (sha256 `cc2e3a7a1852…`) is the build of
the pianist role (`lowpoly-studio/roles/pianist/role.toml`).

| Part | Content | In the app |
|---|---|---|
| Scene nodes | `bench`, `piano`, and 10 keys `piano_key_*`, outside the rig | None. The app has its own piano and bench. The export reads the bench and the keys only for the scale and the place. |
| Mesh | `Polar Bear`: the fur and the gloss (eyes, nose, claws), 2,692 faces after the weld | All faces. A studio body has a budget of 3,000. |
| Skin | 36 joints: the body bones of the biped template, and four digits `finger1` to `finger4` on each paw | The 30 body bones and two eye bones. The four digits of a paw become its one `fingers` bone. |
| Corrective shapes | `arm_down_L`, `arm_down_R`, `legs_straight_L`, `legs_straight_R` | The two arm shapes. The leg shapes straighten the legs, and the pianist never stands. |
| Clips | `reference`, `ready`, `play`, `chord`, `rest`, `performance` | None. The export reads `reference` for the driver of the arm shapes. |

The bind pose of the role is seated: the hips keep their standing height (0.30 units), and the
legs bend for the seat, so the soles float 0.10 units above the floor. The seated clips drop the
hips to 0.20 units. The bench (top 0.085 units) and the piano (top of the keys 0.388 units) of the
GLB file are in the dropped frame of the studio, where the field of the soles is on the floor.

## 2. The export of a seated body

```text
 polar-bear.glb (studio units, faces +z)
      |
      | readSkeleton(): 4 digits of each paw --> one `fingers` bind (middle of the digit heads)
      | weldMesh():     digit weights add up on `fingers`; the props stay out
      v
 sceneFrame()
      | scale = 0.70 m (PIANO.keyTop) / top of `piano_key_*` (0.388 units) = 1.805
      | drop  = lowest point of the skin (0.089 units): the soles on the floor
      | shift = front edge of `bench` --> front edge of PIANO_BENCH (0.093 units forward)
      v
 src/models/studio/polar-bear.ts: StudioBody + floor [0, 0, -0.167] + seatHeight 0.118
```

```typescript
/** The new fields of a studio body (`models/studio-format.ts`). */
interface StudioBody {
  /** The point on the floor under the body: the origin of the studio after the shift. */
  readonly floor: Vec3;
  /** The top of a flat bench under a seated body, in meters, or `null` for a standing body. */
  readonly seatHeight: number | null;
}

/** The settings of an animal of `tools/studio-body.ts`. */
interface AnimalSettings {
  readonly landmark: 'shoulders' | 'keys';
  /** The height of the landmark in the app, in meters. */
  readonly height: number;
  readonly seated: boolean;
  readonly constant: string;
}
```

The first export dropped the body by the hips of the clip `ready` (0.100 units), as the scene of
the studio does. The skin of the studio is 0.011 units outside its field, so the feet went 2 cm
into the stage, and `pose/seated-feet.test.ts` and `pose/rest-clearance.test.ts` failed. The
studio bear has the same offset (its soles are 1.8 cm under the floor).

## 3. The scale

The studio animal is 1.0 unit high when it stands.

| Landmark | Scale | Height | Seated height | Seated shoulders | `H` |
|---|---:|---:|---:|---:|---:|
| Parametric polar bear of `main` (`pnpm body-probe`) | | about 1.19 m | | 0.86 m on the bench of 0.45 m | 0.418 m |
| Shoulder joints at 0.64 m when it stands (the default of the brief) | 0.966 | 0.97 m | 0.88 m | 0.55 m | 0.20 m |
| Top of the keys of the studio at 0.70 m (chosen) | 1.805 | 1.80 m | 1.64 m | 1.03 m | 0.382 m |

With the default landmark, the seated shoulders are 0.15 m below the keys of the app, so no paw
reaches a key. The studio built the pianist for its own keys, 0.06 units below the seated elbows,
so the keys keep the seated arms of the studio. `polar-bear-views.png` marks 1.8 m and shows the
bear 1.64 m high at the piano. The white keys of the studio are as wide as the claws (0.041 m at
this scale), and the keys of the app are 0.024 m wide, so each claw covers about two keys.

## 4. The seat and the fit of the hold

The body bottom over the bench: the lowest point is under the thighs at the front edge of the
bench (0.055 units after the studio drop), and the rump is 0.07 to 0.08 units high. The flat
bench of the app takes the lowest point, 0.118 m, so no part of the body goes into it. The legs
keep their seated bind pose, and the feet are on the floor. The knee joints are 0.38 m behind the
front of the keys, and the test of section 6 keeps the body 1 cm from the case.

The fit of the piano hold, in the order of the work. Each "before" value is a run of the test of
section 6 or of `pose/hands.test.ts`:

| Change | Before | After |
|---|---|---|
| Front of the keys from the floor point (`PIANO_FRONT_H`) | 0.55 H + 0.05 m: the belly (0.45 m forward) 15 cm in the keyboard | 1.45 H + 0.05 m (0.60 m) |
| Lean of the spine | 0°: the right paw 2.8 cm short of C3 | 20° (the studio clips lean 12°) |
| Reach of each paw over the other side (`reach`) | no limit: the right paw followed a melody of Bach out of its reach | left paw up to B♭4, right paw down to C4 |
| Palm place (`pianoKeyFront()`) | over the keys: the claws in the fallboard, then 0.04 m above the keys: 2.6 cm in the key bed | 0.02 m in front of the edge of the keys, 0.065 m above them |
| Rest place | 0.6 of the way to the knee: under the belly, then 0.25 H out: 3 cm in the sides of the belly | beside the knees, 0.6 H out, fingers forward and down |
| Path to the keys (`restArc`) | a straight line: 2.6 cm in the belly | 0.3 H out and 0.4 H up at the middle |

Two values meet a limit of another area. At 1.4 H, with the palm 0.04 m in front of the edge of
the keys, the paws went 3 cm into the belly. At 1.5 H, the duo of a violin and a piano got no
two-shot in `shots/prepare.test.ts`. The reach in the final hold, from `pose/hands.test.ts` with
the lean of 20°: the left paw reaches A0 to B♭4 and the right paw C4 to C8 with 97% of the arm.

## 5. Folded faces

The script poses the skin of the studio over a full play of each demo every 0.25 s, the rest pose,
and the lift of the arms every 0.1 s. A face is folded when its posed normal is more than 90° from
its bind normal moved by the mean of the skin matrices of its corners (the test of the studio).

| Body | Samples | Most folded faces | Samples with a fold | Folded faces of all samples, by the main bone |
|---|---:|---:|---:|---|
| Polar bear pianist | 2,510 | 15 (Bach, the rest pose) | 35.1% | head 1,022, neck 770, spine 568, upper arms 175, right forearm 19, right fingers 16 |
| Bear conductor | 6,200 | 9 (Beethoven 9, the lift) | 52.1% | left forearm 3,227, left upper arm 486, the other arm bones 141 |

The conductor keeps at most 9 folded faces, as on `main`. Of the folds of the pianist, 92% are
at the head, the neck, and the spine. The studio has corrective shapes for the arms and the legs,
and none for the neck. The cause of these folds stays open.

## 6. Tests

On `main`, `pnpm test` ran 2,037 tests in 200 files: 2,017 pass, and 20 skip. At the end of the branch,
`pnpm test` runs 2,047 tests in 202 files: 2,026 pass, and 21 skip. `pnpm test:perf` passes.
`pnpm body-probe --compare` gives 90 of 95 bodies and 22 of 23 players equal to `main`: the
different ones are the polar bear on each of its 5 supports and the pianist.

New behavior tests:

- `pose/test-pianist-clearance.ts` (2 shard files, one demo with a piano each, about 12 s): the
  skin of the GPU (`posedCorner()`) over a full play, the rest pose, and the lift. No point of a
  paw or a claw more than 1.5 cm under the skin of the trunk, the head, and the legs, or in a
  closed shell of the piano off the keyboard. The paws stay off the bench, and the body keeps
  1 cm from the case. The test failed with each "before" value of section 4 that it covers.
- `tools/studio-body.test.ts`: the digits of each paw on its finger bone, the soles of a seated
  body on the floor, the keys below the seated elbows, and the body on its bench.
- `pose/hand-notes.test.ts`: a melody changes hands past the reach of a hand.
- `models/props.test.ts`: the bench fits the legs of the studio polar bear, and keeps 0.45 m for
  the parametric biped and the penguin.
- `tools/close-views.test.ts` and the gallery query of the line of a close view.

Checks that the studio polar bear failed, because they were tuned on the parametric bodies:

- `models/species.test.ts`: the face of the polar bear (the low round ears and the long muzzle)
  and its row of the shape table of 4.3. The ear type `low-round` and the snout type `roman` went.
- `pose/hands.test.ts`: the reach of each key from A0 to C8 with C3 for the right hand and C5 for
  the left hand. It now checks each key in the reach of each hand of the hold. The palm on the
  closed shell of the thigh: the skin of a studio body blends the thighs into the hips, and the
  body is one shell with the arms, so the test checks that the paw is near the lap. The palm
  places read the palm offsets of the hold.
- `models/props.test.ts`: the bench of 0.45 m for the polar bear.
- `models/layout-scene.test.ts`: the key front reads `PIANO_FRONT_H` and the floor point.

The stage of the Boulanger demo grows from 11.301 m to 11.347 m. The other demos keep their
stages.

## 7. Size

`pnpm build && pnpm size` gives the first download after gzip:

| State | Size |
|---|---:|
| `main` (a9b811ea) | 327,410 B |
| After the studio polar bear (051adaac) | 344,921 B |
| End of the branch | 344,919 B |

The packed studio polar bear is about 17.5 kB after gzip, as the packed studio bear. The limit is
1,000,000 B.

## 8. Images

- [`pianist-views.webp`](2026-10-12-studio-polar-bear/pianist-views.webp):
  `pnpm close-views pianist` from the front, the left side, the right side, and the back, at a
  chord of three keys in each paw, between two chords, and in the rest pose. The bear leans over
  the keys and plays with the paws in front of its belly. The open lid hides most of the bear in
  the front view. In the rest pose, the paws hang beside the knees.
- [`sheet-main-and-branch.webp`](2026-10-12-studio-polar-bear/sheet-main-and-branch.webp):
  `polar-bear-views.png` above the sheet page of `main` (the parametric polar bear, about 1.19 m high, on
  the bench of 0.45 m) and of the branch (the studio polar bear, on its bench of 0.118 m). The
  studio bear has the size and the round form of the sheet. Its bench is much lower than the bench
  of the sheet, and its trunk leans to the keys. `pnpm sheet-check polar-bear` gives no IoU,
  because the sheet has no matte (`tools/sheet-mattes/`).
- The snapshot `docs/snapshots/2026-10-12-139e626d/` shows the default view during play and the
  close view of each gallery model.

## 9. Open problems

- Up to 15 faces fold at the neck and the head in the pianist poses (section 5). A neck
  corrective shape of the studio, or a smaller turn of the head of the pianist, could remove them.
- The paws reach only from A0 to B♭4 and from C4 to C8, so a wide melody changes paws in the
  middle of the keyboard.
- The bench is 0.118 m high. The bench of `polar-bear-views.png` is about 0.41 m high: the studio
  fitted short legs to the round body of the sheet.
- The digits of a paw curl together. A press of each digit on its own key needs four finger bones
  in the player.
- The sheet has no matte, so `pnpm sheet-check polar-bear` gives no IoU. A matte config needs a
  rule that keeps the cream fur and leaves out the white keys.
