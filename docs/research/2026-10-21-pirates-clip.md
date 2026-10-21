# The clips of the pirates file

Date 2026-10-21. Round `pirates-clip`. Decisions:
[`2026-10-21-pirates-clip.md`](../decisions/2026-10-21-pirates-clip.md). The probes and their
outputs are in [`2026-10-21-pirates-clip/`](2026-10-21-pirates-clip/). Each command runs from the
root of the tree. The file of the user is
`~/Downloads/Disney_Themes_-_Pirates_Of_The_Caribbean.mid`. Its music is under copyright, so it
stays out of the repository.

## 1. The question

The user saw the polar bear "clipping / overlapping" and the drums of the badger "clipping" in
this file. The file is format 0: channels 1 to 9 play the accordion (program 21), channel 11 a
steel guitar (25), channel 12 steel drums (114), and channel 10 three side sticks. The merge rule
of the piano (design 3.7) gives one polar bear at the piano. The score has four players: the deer at
the harp, the polar bear, a badger at the snare drum, and a badger at the xylophone, which plays
the steel drum part (keys 53 to 62, below the bars 72 to 101). The measure that decides is the
depth of a part in another part over the whole song, at steps of 0.25 s.

## 2. The measures

### 2.1 The paws of the pianist

The accordion part stays in keys 57 to 86, so both paws play near the middle of the keys. The paws
of the studio polar bear are about 20 cm wide, and `PAW_TURN` turns each paw toward its forearm,
which comes in from the elbow at about 50°. Thus the claws point at each other.

| Palms apart (keys) | Palms apart | Paw gap, middle C | Paw gap, C5 |
|---|---|---|---|
| 14 | 19.1 cm | 0.0 cm, 13.7 cm of overlap | 0.0 cm |
| 20 | 27.4 cm | 0.0 cm, 5.9 cm of overlap | 0.0 cm |
| 24 | 33.4 cm | 0.6 cm | 1.3 cm |
| 26 | 37.0 cm | 3.4 cm | 4.2 cm |

`node docs/research/2026-10-21-pirates-clip/gapscan.ts 48,60,72,84` on `main`
(`gapscan-main.txt`). Turns of the elbows, the aim of the fingers, and no `PAW_TURN` left the paws
in each other in 80% to 97% of the samples, so the fix is in the split of the notes.

| Value of `apart` | Paw in paw, pirates | Worst in the piano demos | Right grip turn (base 5°) |
|---|---|---|---|
| `main` (none) | 4.7 cm, 96% over 0.5 cm | 4.8 cm, 62% to 91% | 5° |
| 22 | 1.1 cm, 4.4% | 1.1 cm, up to 8.9% | 17° |
| 24 | 0.2 cm, 0% | 0.1 cm, 0% | 19° |
| 25 | 0.2 cm, 0% | 0.0 cm, 0% | 20°, FAIL |

`pawdepth.ts <file> piano <step> 'piano.apart=<n>'` and
`pnpm arm-check pianist --base 39aa09c9 --variant a24 --set 'piano.apart=24'`. The arm gate fails a
grip turn more than 15° worse than the base. Without the shared move time (`HandNote.since`), the
pirates file kept a sample at 2.5 cm: the right paw came in before the left paw left.

### 2.2 The xylophone

On `main`, each of the 214 steel drum notes struck the lowest bar, at the far left, out of
reach. The right paw crossed the body to it.

| Variant | Mallets touch, 0.25 s | At 0.05 s | Forearms in body | Strikes within 5 mm |
|---|---|---|---|---|
| `main` | 19 of 248 | 44 of 1,238 | 5.3 cm, 100% | 0% |
| shift to the middle of the bars | 43 of 248 | | | 0% |
| shift to the top octave (`d38f02a9`) | 37 of 248 | | 3.6 cm, 44% | 51% |
| top, repeat rule, waits | 13 of 248 | 53 of 1,238 | | |
| top, repeat rule, waits, offsets ±3 cm (the round) | 2 of 248 | 12 of 1,238 | 3.5 cm, 11% | 0%, median 38 mm (L), 22 mm (R) |

`heldx.ts`, `xyerr.ts` (`xylophone-mallets.txt`), and `pnpm pose-depth xylophonist` with the file
added to `probeDemos()` in memory. The percussion test score keeps its keys. Its mallets touch in
3 and 3 of 768 samples at 0.05 s, against 4 and 5 on `main`, and its arms keep the values of `main`
(forearms 5.0 cm in 34% of the samples, against 4.9 cm in 40%).

A repeat gap of 4 cm to 12 cm gave more touches (118 to 150 of 1,238). A gap of 14 cm to 30 cm
removed them, but put the runs of the test score in one hand: its strikes within 5 mm fell from
8.6% to 0%, and the left arm failed the arm gate (folds p95 9, limit 8). A rest direction of 0
with no offsets left 3 of 1,238 touches, but turned the grip 36° from `ACCEPTED_GRIPS`.

### 2.3 All players and all demos

`pnpm clip-probe --base 39aa09c9` (`clip-demos.txt`, `clip-demos.json`) and
`pnpm clip-probe --midi <file> --base 39aa09c9`:

| File | Paw in paw, `main` | Paw in paw, round | Held across, `main` | Held across, round |
|---|---|---|---|---|
| pirates file | 4.7 cm, 94.0% over 1.5 cm | 0.2 cm, 0% | 7.3% | 0.8% |
| `bach-bwv1047` | 4.8 cm, 87.6% | 0.4 cm, 0% | 0% | 0% |
| `bach-bwv1048` | 4.8 cm, 80.4% | 0.0 cm, 0% | 0% | 0% |
| `bach-bwv1050` | 4.8 cm, 70.0% | 0.3 cm, 0% | 0% | 0% |
| `boulanger-matin` | 4.7 cm, 62.5% | 2.5 cm, 1.2% (a cellist) | 0% | 0% |
| 11 other files | at most 0.4 cm, 0% | the same | 0% | 0% |

In Boulanger, the third dog cellist goes 2.4 cm with one paw into the other in 15 of 1,123
samples, from 121 s to 127 s, on `main` too. Its notes mix pizzicato on the low strings with a
held arco note. This clip is open (`TODO.md`).

The probe found no overlap of footprints, no part under the floor, and no part of a player in a
near player in any file. A test move of the xylophone badger 0.7 m toward the snare drummer gave
one pair of footprints and 12.5 cm between the players, so these measures work.

`pnpm body-probe --base 39aa09c9` (`body-probe.txt`): the 95 bodies and the 23 players stay
equal, and only the 9 pose sets of the four pianists change. `pnpm arm-check --all --base
39aa09c9` gives no `FAIL` (`arm-check.txt`).

## 3. The result

The polar bear clipped because the hand split ignored the width of its paws. The paws now keep 24
semitones apart, and they go at most 0.2 cm into each other in the file and in the piano demos. The
badger clipped because each steel drum note struck one bar out of reach, and the two mallets met
on near bars. The part now plays in the top octave of the bars, a repeat on one bar stays in one
hand, and the mallets strike 3 cm apart along the bar. The mallets touch in 0.8% of the samples,
below the limit of 1%. The reach of the left arm and the swing of the resting heads stay open
(`TODO.md`).

The images give `main` on the left and the round on the right, as 2x crops:
`paws-29.5.webp` (the paws from the front and above at 29.5 s), `default-bear-29.5.webp`,
`xylo-7.webp` (the xylophone badger from the front at 7 s), `xylotop-20.webp`, and
`default-badgers-20.webp`. `render.ts` and `pawcam.ts` render them on a dev server of each tree,
and `pair.py` makes the pairs.
