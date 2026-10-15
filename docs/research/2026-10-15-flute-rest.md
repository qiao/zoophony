# The flute rest of a real flutist for the tan fox (2026-10-15)

This report gives the measures and the probes of the branch `flute-rest`. The decisions are in
[`2026-10-15-flute-rest.md`](../decisions/2026-10-15-flute-rest.md). The probes, the logs, and the
images are in [`2026-10-15-flute-rest/`](2026-10-15-flute-rest/). Each probe runs from the root of
the worktree, for example `node docs/research/2026-10-15-flute-rest/places.ts`.

## The source

Patricia George, "Solving the Problem of Rests", The Instrumentalist, December 2018
([theinstrumentalist.com](https://theinstrumentalist.com/?p=5640)): the flute stands "vertically
on the right leg with the right hand on the right-hand keys".

A photo with a free license shows the same rest: "BSO woodwind players 1925" by Carl J. Horner,
public domain ([Wikimedia Commons](https://commons.wikimedia.org/wiki/File:BSO_woodwind_players_1925.jpg)),
in `bso-woodwinds-1925.webp`. The JPEG file of Commons has the SHA-256
`ff37d3f7038036de724b75f4e5f9bd196a96d93a6ad9e8cbf437da7ed11eb399`, and the WebP copy of 710 × 410
pixels has the SHA-256 `e258ca532723d2eb1300c06db2fffa0f9745f2b031043811a0e078456bdcad2d`. The fourth
seated player of the front row holds a silver flute upright with the right hand, and his left hand
rests on his left thigh. The caption of Commons names him "Principal oboe: Georges Laurent". Georges
Laurent was the principal flute of the Boston Symphony Orchestra until 1952
([Wikipedia](https://en.wikipedia.org/wiki/Georges_Laurent)).

## The pose code

The wind pose kept both palms on their grips, also in the rest pose. The new option
`WindHold.restFreeL` frees the left paw:

```typescript
/** The left paw of a wind hold that leaves its grip in the rest pose (fields of `LapHand` and the arc). */
export interface FreePaw {
  /** The place of the palm on the top of the left thigh (`LapPlace` of `pose/lap.ts`). */
  readonly lap: LapPlace;
  /** The side of the palm. */
  readonly palm: Vec3;
  /** The direction of the fingers, in the plane of the palm. */
  readonly fingers: Vec3;
  /** The move of the wrist from the straight line at the middle of the change, in H. */
  readonly arc: Vec3;
}
```

The rest wrist of a seated player follows the root. The rest wrist of a standing player is the
wrist of its hanging arm, which follows the shoulder. The lift and the lowering mix the wrist and
the hand by the weight `w` of the playing pose, and the arc adds `4 w (1 - w)` of its move:

```text
 weight w:   0 (rest)                 0.5                     1 (play)
             |                         |                        |
 left wrist  lap place -------- mix + full arc -------------- grip
 instrument  rest turn  -------------- mix ------------------ play turn
             (both use the same w, so the pose stays stateless)
```

`pnpm body-probe --base main` (`body-probe.txt`) gives 95 of 95 bodies and 23 of 23 players
equal. 1,416 of 1,492 pose sets are equal, and the 76 other sets are the 4 sets of each of the 19
tan flutists of the 10 demos with flutes.

## The fit

The search probes pose the first seated tan fox of the fit demos (`bach-bwv1050`,
`boulanger-matin`, and `beethoven-8`) with a hold in memory (`opt.ts`). They measure the deepest
point of the arms in the body and the flute (the sweep of `pnpm pose-depth flutist`), the flute in
the body, the gap from the flute and from the left paw to the body, the folded faces of the rest,
and the place of the foot joint. `opt-left.ts` is a random search of one side, and
`opt-local.ts` a hill climb of all values. The climbs ran on `main` c071bf2e. After the rebase onto
392dfe2c, `pnpm hold-fit` and `pnpm fold-probe` gave the same rows.

| Variant | Rest, lift, lower depth (cm) | Rest folds (L, R, other) | Foot joint from the right knee (cm) | Tilt | Log |
|---|---|---|---|---|---|
| Kept: foot at the outer side of the knee, arms down | 1.4, 1.4, 1.5 | 12 (3, 6, 3) | 5.7 out, 1.4 up, 2.6 forward | 10.7° | `elbows.txt` |
| Same flute, left elbow out to the side | 1.4, 1.4, 1.5 | 20 (11, 6, 3) | same | 10.7° | `elbows.txt` |
| Foot on the top of the knee | 1.6, 1.6, 1.6 | 10 (1, 9, 0) | 1.7 out, 7.6 up, 1.2 forward | 4.1° | `climb-top.txt` |
| Kept, with the elbow limited to 97% of the arm | 3.1 at best | 8 | as kept | 10.6° | `climb-bend.txt` |

- **The arc:** with no arc, the kept rest put the left forearm and upper arm up to 5.4 cm into
  the body in the lift and 5.3 cm in the lowering (`arc.txt`). The kept arc, 0.57 H out, 0.04 H
  up, and 0.31 H forward, gives 1.4 cm and 1.5 cm.
- **The left reach:** the kept rest place is 4.5% to 4.8% past the reach of the left arm
  (`reach-probe.txt`). The arm hangs straight, and the paw stops 2.3 cm to 2.4 cm short of the
  place. A place in reach held the paw 1.6 cm or more off the thigh, or bent the elbow into the
  flank (`climb-reach.txt`). The limit of 97% of the arm (`ARM_REACH`, `climb-bend.txt`, code
  that the branch does not keep) put the left upper arm 3.1 cm into the body at best.
- **The top of the knee:** the climb toward the top of the knee (`climb-mid.txt` from the kept
  rest, `climb-top.txt` from the top) found no rest within 1.5 cm there.

## The measures

| Measure | `main` 392dfe2c | Branch | Probe |
|---|---|---|---|
| Rest depth | 1.5 cm | 1.45 cm, left upper arm in the body | `pnpm hold-fit flutist --demo all --base main` (`hold-fit-base-main.txt`) |
| Lift depth | 1.5 cm | 1.45 cm, left upper arm in the body | same |
| Lowering depth | 1.5 cm | 1.49 cm, right upper arm in the body | same |
| Play depth | 1.2 cm | 1.2 cm | same |
| Play folds | 0.8% (105 of 13,744) | 0.8% (105 of 13,744) | `pnpm fold-probe flutist --base main` (`fold-probe-base-main.txt`) |
| Lift folds | 22.9% (71 of 310) | 19.7% (61 of 310) | same |
| Rest folds | 10 of 10 samples, at most 14 faces | 10 of 10 samples, at most 12 faces | `fold-compare.ts` (`fold-compare.txt`) |
| Left palm from the left knee | 24.0 cm in, 48.4 cm up, 20.7 cm forward | 10.7 cm out, 13.0 cm up, 11.8 cm back | `places.ts` (`places.txt`) |
| Right palm from the right knee | 0.7 cm in, 33.1 cm up, 16.9 cm forward | 9.3 cm out, 18.7 cm up, 7.2 cm forward | same |
| Tilt of the flute from vertical | 31.3° | 10.7° | same |
| Standing soloist, rest and lowering | not measured apart | 1.36 cm and 1.45 cm | `pnpm hold-fit flutist --demo all --json` (mozart-k315) |

## The images

- `rest-compare.webp`: the rest of `main` (top row) and of the branch (bottom row) from the
  front, the left, and the right, beside the crop of the photo of 1925 (`compose.py`).
- `close-views.webp`: `pnpm close-views flutist <dir> --base main`. The play moments do not
  change.
- `stand-rest.webp`: the rest of the standing soloist, with a moment of the rest and the query
  `stand` added to `ROLE_VIEWS` for this image only. The left arm hangs as the arms of each
  standing player at rest.
