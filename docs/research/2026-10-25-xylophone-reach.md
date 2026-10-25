# The reach, the runs, and the soles of the xylophone badger

Date 2026-10-25. Round `xylophone-reach`. Decisions:
[`2026-10-25-xylophone-reach.md`](../decisions/2026-10-25-xylophone-reach.md). The probes and
their outputs are in [`2026-10-25-xylophone-reach/`](2026-10-25-xylophone-reach/). Each command
runs from the root of the tree, and the base is `main` at `b2f59e6a`. No demo has a xylophone
part (`which.txt`), so the measures read the percussion test score of `tools/probe-demos.ts` and
the steel drum part of the file of the user `~/Downloads/Disney_Themes_-_Pirates_Of_The_Caribbean.mid`
("pirates"), as in [`2026-10-25-xylophone-sway.md`](2026-10-25-xylophone-sway.md).

## 1. The question

Three faults stayed after the sway round: the sharp bars stood about 11 cm out of reach, a scale
stayed in one hand so that the right paw reached across the body, and the soles sank into the
floor. The user prefers a smaller instrument over longer arms. The measures are the strikes
within 5 mm of their bars, the depth of the paws in the body, the sole corners, and the gates.

## 2. The cause of the reach

A smaller xylophone alone did not help: at 0.30 m, the bars were in reach, but the paws went
9.2 cm into the belly in 44% of the play samples. For a near bar, the grip of the mallet comes
to its home in front of the shoulder, inside the leaned chest. The arms reach the bars only in
a band about 0.12 m deep: nearer bars put the paws into the belly, and the arms do not reach
farther bars. The home, the poles, the pitch, and the bar height do not widen the band
(`pd-front.txt`, `pd-home.txt`, `pd-pole.txt`, `pd-pitch.txt`, `pd-height.txt`). So the bars
fit into the band: 3 cm wide, 12 cm to 8 cm long, the sharp row 0.5 cm behind the natural row,
and each sharp bar struck 2 cm from its near edge, as a real player strikes it.

| Front edge (bars 12 to 8 cm) | Paws in body, max and share | Test score, worst miss | L wrist bend p95 (gate) |
|---|---|---|---|
| 0.40 m, offsets 3 cm | 2.9 cm, 11.2% | 17 mm | 64°, FAIL (`main` 35°) |
| 0.41 m, offsets 3 cm | 2.5 cm, 5.9% | 26 mm | 58°, FAIL |
| 0.42 m, offsets 3 cm | 2.0 cm, 3.1% | 35 mm | 53°, FAIL |
| 0.42 m, offsets 2 cm (branch) | 1.6 cm, 0.6% | 26 mm | 49° |

`pnpm pose-depth xylophonist --set ...` (`pd-front-final.txt`, `pose-depth.txt`) gives the paws
and the worst miss, and `pnpm arm-check xylophonist --variant ...` (`arm-scan.txt`) the wrist.
The arm gate fails a paw swing more than 15° over the base. The offsets move the left mallet
nearer to the player and the right mallet farther, so that the heads keep apart.

## 3. The runs

`alternateHands()` kept a scale in one hand, and on the test score the right paw played the
lowest bars across the body. The branch gives each hand a reach of 0.53 m on the floor plane
from its shoulder joint: a run that leaves the reach of one paw goes on in the other paw, as
the double strokes of a real player (`docs/reference/percussion-technique.md` 9). With no reach
(`xylophone.reach=10`), the right paw reached 67% of its strikes (`scan.txt`).

A scratch rule of full alternation let a strike pass the last bar of the other hand by one step.
It changed the hands in 43% to 51% of the fast pairs of the test score (`main` 4%), but each head
passed the other head at one height, and the shafts touched: `held across` 3.9% to 7.1% of the
samples, a `CLIP` (`clip-alternate.txt`). The rule with a pass only to the other row, a wider V,
and a lift of 0 also clipped. The alternation stays open.

## 4. The measures

| File, measure | `main` | branch |
|---|---|---|
| Test score, strikes within 5 mm, L / R | 46% / 26% | 100% / 93% |
| Test score, median miss, L / R | 26 / 95 mm | 0 / 0 mm |
| Test score, worst miss | 316 mm | 26 mm |
| Test score, hand changes of fast pairs, longest run in one hand | 4%, 29 | 3%, 30 |
| Pirates, strikes within 5 mm, L / R | 90% / 89% | 100% / 100% |
| Pirates, worst miss | 122 mm | 0 mm |
| Pirates, hand changes, strikes L / R | 20%, 82 / 132 | 14%, 28 / 186 |
| Pirates, head gap min, mallets touch | 2.5 cm, 0.4% | 1.6 cm, 0.1% |
| Test score, sole sink max, sole corner lift max | 5.8 mm, 8.8 mm | 0.0 mm, 0.0 mm |
| Pirates, sole sink max, sole corner lift max | 5.8 mm, 8.8 mm | 0.0 mm, 0.0 mm |
| Center of mass inside the soles, min | 0.4 cm (posed), 9.6 cm (bind) | 9.7 cm |
| Eye line max, test score / pirates | 3.0° / 4.5° | 3.0° / 4.6° |
| Paws, forearms, upper arms in body (test score) | 0.0, 3.4, 3.8 cm | 1.6, 0.4, 1.9 cm |

`reach.ts`, `heads.ts`, `alt.ts`, `soles.ts`, and `eyes.ts` and `balance.ts` of
`2026-10-25-xylophone-sway/`, on the branch and on a checkout of `main` (`probes-main.txt`,
`probes-branch.txt`). `pnpm pose-depth xylophonist --base main`, also with `--midi <file>`
(`pose-depth.txt`, `pose-depth-pirates.txt`). The 2 cm hip move tilted the shins, and the foot
skin sank. With the hips in place, the spine takes the whole side move, and each bar stays in
reach.

## 5. The gate

| Gate | `main` | branch |
|---|---|---|
| `pnpm arm-check --all --base main` | | no `FAIL` (`arm-check-all.txt`) |
| Xylophonist, test score: paw swing p95 L / R | 35° / 35° | 49° / 33°, PASS (margin 15°) |
| Xylophonist, test score: folds p95 L / R | 7 / 6 | 3 / 3 |
| Xylophonist, test score: grip turn p50 L / R | 8° / 3° | 9° / 2° |
| Xylophonist, pirates: paw swing p95 L / R | 35° / 34° | 29° / 41°, PASS |
| Xylophonist, pirates: folds p95 L / R, grip turn p50 L / R | 5 / 2, 11° / 9° | 1 / 3, 14° / 5°, PASS |
| `pnpm clip-probe --base main --jobs 4`: each demo and the test score | PASS | PASS (`clip-demos.txt`) |
| Pirates, `held across` | 0.8% | 0.0%, PASS (`clip-files.txt`) |
| Twist steps, largest: clavicle to upper arm, forearm, total | 53°, 51°, 155° | 53°, 51°, 155° |
| Twist steps, mean clavicle to upper arm L / R | 37° / 36° | 45° / 43° |

`pnpm arm-check xylophonist --base main`, also with `--midi <file>` (`arm-check-role.txt`), and
`twist.ts xylophonist` on each tree (`twist-main.txt`, `twist-branch.txt`). The entry of the
xylophonist in `ACCEPTED_GRIPS` stays: each grip turn stays within 6° of `main`.

## 6. The images

The sheets give `main` on the left and the branch on the right (`pair.py`). The role views come
from `pnpm close-views xylophonist <dir> --views front,left,right,back,35,-35 --zoom 2 --base main
--moments lowest,highest,between,rest,lift50,lower50`: the strikes from each side
(`strike-sides.webp`), from ±35° (`strike-35.webp`), and from the front and the back
(`strike-front-back.webp`), and the rest and the half moves (`rest.webp`). The run frames come
from `pnpm close-views play <dir> --midi <test score> --time 4.48 --time 15.95 --time 21.28
--time 33.7 --at badger:xylophone --azimuth 0 --azimuth 35 --azimuth -35 --azimuth 90 --azimuth
-90 --azimuth 180 --elevation 35 --zoom 1.6 --base main`: the run from four sides
(`run-test.webp`) and the feet from the back (`feet-back.webp`). The seats of the test score and
the pirates file move with the smaller xylophone, so each `play` pair has its own framing.
`pnpm close-views audit <dir> --roles xylophonist --base main` gives the seam sheets at 20° and
40° (`audit-e20.webp`, `audit-e40.webp`).

Each paw closes on its mallet, and the shaft leaves the front of the fist, as on `main`. The
heads strike the bars from above: a natural bar near its middle, and a sharp bar near its edge on
the side of the player. From the back, the body stands upright over flat feet, where `main`
tilts the body and one foot. No seam, flap, or fold shows from the front, the back, either side,
or ±150°. The faults that stay: at 21.28 s of the test score, the right paw rises to the height
of the muzzle for a sharp bar in the middle of the back row, and its head stays 26 mm short. The
mallets of 0.30 m look long beside the small bars. The near forearm lies on the belly at the
lowest bars.

## 7. The result

The xylophone is smaller and nearer: bars 3 cm wide and 12 cm to 8 cm long, the near edge
0.42 m in front of the badger. Each strike of the pirates part lands within 5 mm (`main` 90% and
89%), and on the test score 100% of the left strikes and 93% of the right strikes do (`main` 46%
and 26%). A run goes on in the other paw where it leaves the reach of the first paw, so the right
paw no longer reaches across the body. The soles stay flat, and the gates pass. The alternation
of the hands in a scale, the middle of the back row in a run up the test score, and the long
mallets stay open (`TODO.md`).
