# The lift and the lowering of the rabbit and the cat

Date 2026-10-24. Decisions:
[`2026-10-24-violin-poses.md`](../decisions/2026-10-24-violin-poses.md). The report of the rests is
[`2026-10-24-violin-poses.md`](2026-10-24-violin-poses.md). The probes, their outputs, and the
images are in [`2026-10-24-violin-moves/`](2026-10-24-violin-moves/). Each command runs from the
root of the tree.

## 1. The question

The manager saw the images of the rests and said: at lift60 and lift80, and at lower40 and
lower20, both animals hold the instrument far out in front of the chest with both arms nearly
straight, and the red fox keeps both elbows bent and the instrument near the body. The target is
the elbow range of the red fox, with the instrument out of the belly and the arms out of the
instrument.

## 2. The fault on `main`

On `main`, the tail end of the instrument moves on a path from the knee to the chin
(`instrumentAt()` of `pose/bowed.ts`), and the instrument turns around it. The left paw follows
its stop point on the neck. In the middle of the move, the turn puts that point 1.09 H (rabbit)
and 1.28 H (cat) in front of the root, and the short left arm reaches it only straight: the
elbow opens to 180°, and the upper arm rises 106° to 107° from the vertical (`variants.txt`,
lines `main`). The images show it in the rows "main" of `lift-e20.webp` and `lower-e20.webp`.

## 3. The change

The left paw carries the instrument. Its point on the neck moves on a line from its rest place to
its playing place, and the instrument hangs from that point with the turn of the move.

```text
            main                                    branch
 +-------------------------------+      +-------------------------------+
 | pivot: the tail end           |      | pivot: the stop point of the  |
 | path: knee -> chin            |      | left paw (liftPlace 1)        |
 | the paw follows the neck      |      | path: rest paw -> play paw,   |
 | paw 1.1 H to 1.3 H in front   |      | plus liftReach in the middle  |
 | left elbow 180°               |      | left elbow 137° (rabbit),     |
 +-------------------------------+      | 142° (cat)                    |
                                        +-------------------------------+

 weight  0 ...... 0.5 ...... 0.6 ........... 1
         rest     carry      fade to the path of the tail end      play
 stop:   restPlace -> liftPlace (at 0.5) -> note
 roll:   + liftTiltL * 4w(1 - w)        elbow: restPoleL -> liftPoleL -> poleL
```

```typescript
interface BowedHold {
  /** The place of the left fingers on the neck in the middle of the move, from 0 at the nut to
   * 1 at the end of the fingerboard. The paw carries the instrument. `null` moves the tail end. */
  readonly liftPlace: number | null;
  /** The further roll of the left hand over the neck in the middle of the move, in radians. */
  readonly liftTiltL: number;
  /** The direction of the left elbow in the middle of the move, in the axes of the chest. */
  readonly liftPoleL: Vec3 | null;
}
```

From the weight 0.6 of the play, the place goes smoothly back to the path of the tail end
(`CARRY_FADE`): with the carry up to the play, the tail end came to the chin from below and went
2.3 cm (rabbit) and 4.6 cm (cat) into the chest.

| Hold | Value | `main` | Branch |
|---|---|---|---|
| `SHOULDER_HOLD` | `liftPlace` | `null` | 1 |
| | `liftTiltL` | 0 | 45° |
| | `liftPoleL` | `null` | (0, -1, -0.5) |
| | `liftReach` | (-0.1, 0.2, -0.2) | (-0.1, 0.1, -0.08) |
| | `restBow.via.reach` | (0.05, 0, -0.3) | (0, 0.2, -0.3) |
| `CAT_HOLD` | `liftPlace` | `null` | 1 |
| | `liftTiltL` | 0 | 45° |
| | `liftTurn` | axis (-0.8, 1, -0.5), top (0.2, 0, 1) | axis (-0.6, 1, -0.6), top (0.07, 0.55, 0.84) |

## 4. The measures

The elbows at each move share (`elbow-table.md`, left / right, degrees):

| Move | Share | Rabbit `main` | Rabbit branch | Cat `main` | Cat branch | Red fox |
|---|---|---|---|---|---|---|
| lift | 0.1 | 120 / 130 | 121 / 129 | 94 / 103 | 94 / 103 | 125 / 112 |
| lift | 0.2 | 113 / 139 | 116 / 131 | 94 / 101 | 92 / 101 | 110 / 112 |
| lift | 0.3 | 109 / 157 | 106 / 133 | 99 / 97 | 91 / 97 | 101 / 114 |
| lift | 0.4 | 116 / 161 | 100 / 129 | 108 / 89 | 95 / 91 | 100 / 117 |
| lift | 0.5 | 125 / 119 | 109 / 118 | 120 / 78 | 104 / 85 | 106 / 116 |
| lift | 0.6 | 152 / 95 | 127 / 121 | 151 / 70 | 118 / 81 | 111 / 108 |
| lift | 0.7 | 180 / 105 | 133 / 117 | 180 / 77 | 133 / 75 | 111 / 96 |
| lift | 0.8 | 180 / 116 | 137 / 114 | 176 / 80 | 141 / 78 | 109 / 85 |
| lift | 0.9 | 133 / 114 | 123 / 114 | 126 / 78 | 124 / 78 | 106 / 79 |
| lower | 0.1 | 125 / 128 | 120 / 126 | 120 / 78 | 119 / 78 | 106 / 100 |
| lower | 0.2 | 173 / 140 | 132 / 130 | 141 / 85 | 133 / 83 | 110 / 119 |
| lower | 0.3 | 180 / 130 | 135 / 119 | 180 / 90 | 142 / 85 | 112 / 147 |
| lower | 0.4 | 180 / 97 | 131 / 104 | 180 / 85 | 129 / 83 | 109 / 174 |
| lower | 0.5 | 136 / 79 | 123 / 97 | 138 / 75 | 115 / 88 | 104 / 153 |
| lower | 0.6 | 124 / 96 | 107 / 92 | 118 / 83 | 102 / 89 | 99 / 131 |
| lower | 0.7 | 115 / 136 | 100 / 116 | 106 / 93 | 93 / 94 | 103 / 117 |
| lower | 0.8 | 109 / 148 | 109 / 130 | 97 / 99 | 91 / 100 | 113 / 112 |
| lower | 0.9 | 116 / 134 | 118 / 130 | 94 / 103 | 93 / 103 | 127 / 112 |

The depths of the moves, `pnpm pose-depth --base main` (`pose-depth.txt`, cm, `main` in
parentheses). The play itself holds the instrument 2.0 cm (rabbit) and 2.4 cm (cat) into the body.

| Species | Move | Instrument in body | Forearms in instrument | Upper arms in instrument | Paws in instrument |
|---|---|---|---|---|---|
| rabbit | lift | 1.9 (1.9) | 2.1 (2.0) | 1.5 (2.0) | 1.2 (1.0) |
| rabbit | lower | 1.9 (1.9) | 2.1 (2.1) | 2.0 (1.9) | 1.8 (1.1) |
| cat | lift | 2.4 (2.4) | 2.7 (2.9) | 2.7 (1.7) | 1.4 (1.5) |
| cat | lower | 2.4 (2.4) | 2.8 (2.8) | 2.8 (2.5) | 1.4 (1.5) |

The arm gate of the three violin roles against `main` has no `FAIL` (`arm-check.txt`). The left
paw of the rabbit turns at 563°/s at most in the moves (1,220°/s on `main`), and of the cat at
435°/s (979°/s). The rabbit left paw swings 55° at p95 (66°). `pnpm body-probe --base main` changes
only the pose sets of the rabbits (63) and the cats (41) (`body-probe.txt`).

## 5. What did not work

`variants.txt` gives the values.

| Path | Rabbit left elbow | Cat left elbow | Fault |
|---|---|---|---|
| A move 0.3 H to the left of the body | 180° | 180° | The paw still reaches out in front. |
| A raise of 0.4 H, then in toward the body | 163° | 180° | The rabbit violin goes 4.7 cm into the belly. |
| The violin edge-on in the middle | 169° | 152° | The rabbit paw twist passes 180°, and its right elbow straightens. The cat paw swings 94°. |
| An elbow pole of the move alone | 180° | 180° | The paw path does not change. |
| The carry at 0.7 or 0.85 of the fingerboard (cat) | - | 141° | The viola goes 2.6 cm into the belly. |
| The carry up to the play | 137° | 142° | The tail end goes 2.3 cm and 4.6 cm into the chest. |
| The rabbit carry with no move to the front | 127° | - | The violin goes 3.2 cm into the belly in a lowering. |
| The rabbit carry with no roll and no elbow pole | 151° | - | The paw swings 94°. |
| The rabbit bow grip 0.05 H out | - | - | The right paw twists 145° (`FAIL` against 142°). |

## 6. The result and the open items

Both animals bring the instrument up by its neck with the left elbow bent, as the red fox does
(`lift-e20.webp`, `lower-e20.webp`, the views from 40° in `*-e40.webp`, and the 2x crops of the
arms in `*-crops-*.webp`). The right elbow of the rabbit bends to 133° at most (161° on `main`).

Open: the left elbows open up to 15° more than the red fox. The cat upper arms go 2.7 cm into the
viola in the lift (1.7 cm on `main`), and the rabbit paws 1.8 cm into the violin in a lowering
(1.1 cm). The play holds the instrument 2.0 cm and 2.4 cm into the body, as on `main`.
