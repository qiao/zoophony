# The pedals of the piano and the foot of the pianist

Date 2026-10-24. Round `polar-bear-arms`. Decisions:
[`2026-10-24-piano-pedals.md`](../decisions/2026-10-24-piano-pedals.md). The target of the foot is
[`piano-technique.md`](../reference/piano-technique.md), section 6. The probes, their outputs, and
the images are in [`2026-10-24-piano-pedals/`](2026-10-24-piano-pedals/). Each command runs from
the root of the tree. "Before" is `d13b1dc6`.

## 1. The question

The user looked at close-ups of the polar bear pianist and said: "the piano is missing the
pedals". The piano had a plain box under the case and no pedals. The goal is a pedal lyre with
three pedals in real sizes, and the right foot of the pianist on the damper pedal, with the heel
on the floor and the ball of the foot on the pedal. The probe numbers and the images decide.

## 2. The sizes

All sources opened on 2026-10-24. The model value is before `PIANO_SCALE` (1.16).

| Part | Real size | Model value | Source |
|---|---|---|---|
| Pedal top above the floor, 1 inch from the front edge | 46 mm to 87 mm (Steinway B: 87 mm) | 60 mm | [1] |
| Pedal travel | 21 mm to 25 mm | 23 mm | [1] |
| Pedal length overall | 175 mm to 219 mm | | [2] |
| Pedal pin to the lyre rod hole (inside the box) | 59 mm to 83 mm | | [2] |
| Pedal in front of the box | about 110 mm to 125 mm (derived from [2]) | 120 mm | [2] |
| Lyre height | 584 mm (23 in) | 605 mm, case bottom to floor | [3] |
| Top bar of the lyre | 305 × 60 mm | 305 × 50 × 60 mm | [3] |
| Box at the bottom of the lyre | 216 mm wide, 79 mm deep | 216 × 79 mm, 15 mm to 105 mm above the floor | [3] |
| Pedal spacing | not found | 72 mm, a third of the box (derived) | |
| Foot plate of a pedal | not found | 45 × 70 mm, shank 28 mm wide | |
| Pedal tips behind the front edge of the keys | not found | 50 mm | |

1. Piano Technicians Guild. "Sustain pedal height and travel." Discussion forum, measures by
   F. Gadd on nine pianos. https://my.ptg.org/discussion/sustain-pedal-height-and-travel
2. Schaff Piano Supply. "Grand piano pedals" (solid brass pedals S-974 to S-997).
   https://www.howardpianoindustries.com/grand-piano-pedals
3. Steve's Piano Service. "Grand piano legs and pedal lyre" (lyre SH845).
   https://www.stevespianoservice.com/Online-Piano-Parts-Catalog/grand-piano-legs-and-pedal-lyre.htm

The lyre has the bar under the case, two posts that spread from the box to the bar, and the box.
The soft pedal, the sostenuto, and the damper pedal come out of the box toward the player, in
`INSTRUMENT_COLORS.brass`. The damper pedal is a second piece on the `slide` bone. The piano has
1,050 triangles (930 before, limit 2,000).

## 3. The foot

`feet.ts` poses the pianist at each step of the demos, or of a MIDI file, and measures the posed
skin of the feet against the pedals and the box. `pedal-midi.ts` writes a test file with the
pedal down in each odd bar.

```bash
node docs/research/2026-10-24-piano-pedals/feet.ts 0.25
node docs/research/2026-10-24-piano-pedals/pedal-midi.ts scratch/pedal-test.mid
node docs/research/2026-10-24-piano-pedals/feet.ts 0.05 scratch/pedal-test.mid
```

| Measure (right foot) | Demos, play (`feet-demos.txt`) | Pedal file, play (`feet-pedal-test.txt`) | Demos, lift |
|---|---|---|---|
| Lowest point of the foot above the floor | 0.07 cm | -0.09 to 0.07 cm | 0.00 to 1.01 cm |
| Sole above the top of the damper pedal at rest | 0.15 cm | -2.36 to 0.15 cm | 0.14 to 1.90 cm |
| Sole above the sostenuto pedal | none over it | none over it | none over it |
| Foot in the box of the lyre | none | none | none |
| Toe tip, in front of the box front (-83.9 cm) | -80.6 cm | -81.2 to -80.6 cm | |

The pressed pedal goes down 2.67 cm, so the sole stays 0.3 cm above it. The left foot keeps the
bind: 0.18 cm above the floor, left of the soft pedal. The foot turns up about 20° on the pedal at
rest and about 12° on the pressed pedal.

The legs reach the pedal. The ankle moves 12 cm in and 3 cm forward, and the hip to the ankle is
0.45 m of the 0.57 m of the leg. The paw is 24 cm wide, so the pedal lies under its inner edge,
and the paw stays 1 cm right of the sostenuto pedal.

Two variants failed:

| Variant | Fault |
|---|---|
| The heel pivot at the rearmost point of the foot | the heel 2 cm above the floor |
| A mix of the bone rotations from the bind in the lift | the sole 6 mm into the edge of the pedal |

The heel of the skin follows the shin by about half. Thus the probe counts the shin weights below
15 cm too.

## 4. The other players and the size

`pnpm body-probe --base d13b1dc6` (`body-probe.txt`): all 95 bodies stay. The pose code changes
the pose sets of the 4 pianists only. The pedals grow the floor footprint of the piano, so the
stage of `bach-bwv1050` moves 1 cm, and its two hippos and its conductor change pose sets through
their places. The other demos keep their layouts.

`pnpm size --base d13b1dc6` (`size.txt`): the first download grows by 1,418 B, to 743,605 B.

## 5. The images

| File | Content |
|---|---|
| `piano.png` | the piano alone from the side of the player, and the lyre from the player side, the left, and the right (gallery `page=instruments`) |
| `stage.png` | the stage camera at az 150 and az -150, elevation 40, pedal file at 12 s (pedal down) |
| `feet-play.png` | the feet in the play from the front (through the lyre), the right, and the left (gallery) |
| `feet-rest.png` | the same views in the rest pose (`&rest`) |
| `feet-press.png` | 2x crops of the stage from the right (left column) and the left, pedal up at 9.5 s (top) and down at 12 s (bottom) |

## 6. The result

- The piano has a lyre with three brass pedals. No pedal floats or goes into the lyre or the floor.
- In the play, the right heel stays on the floor, and the ball of the foot lies on the front of
  the damper pedal. The foot follows the pressed pedal down.
- From the sides, the raised right paw reads as a foot on the pedals (`feet-press.png`).

## 7. The open faults

- The case shades the pedals in the light of the gallery (`piano.png`).
- From the stage camera at elevation 40, the bear and the keys hide the pedals and the feet
  (`stage.png`).
- No demo has CC 64 on the piano, so the damper pedal moves only with a file of the user.
- The pedal goes straight down, where a real pedal turns around its pin.
