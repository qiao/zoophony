# The reach and the sway of the xylophone badger

Date 2026-10-25. Round `xylophone-sway`. Decisions:
[`2026-10-25-xylophone-sway.md`](../decisions/2026-10-25-xylophone-sway.md). The probes and their
outputs are in [`2026-10-25-xylophone-sway/`](2026-10-25-xylophone-sway/). Each command runs from
the root of the tree, and the base is `main` at `970cad3b`. The file of the user is
`~/Downloads/Disney_Themes_-_Pirates_Of_The_Caribbean.mid`, as in
[`2026-10-21-pirates-clip.md`](2026-10-21-pirates-clip.md). Its steel drum part plays on the
xylophone of the badger.

## 1. The question

The badger xylophonist missed most of its bars, and its two mallet heads met between strikes. A
real player moves the body from side to side behind the notes, and lifts each mallet over its
bar with the wrist (`docs/reference/percussion-technique.md` 3, 9). The measures are the share of
the strikes within 5 mm of their bars, the median miss, the depth of the arms in the body, the
gap of the two heads, and the balance.

## 2. The cause

`dbg.ts` prints the shoulder, the wrist, and the head at each strike (`dbg-main.txt`). On `main`,
the wrist is 0.237 m from the shoulder at each strike: the full reach of the arm. The head stops
2 to 5 cm short of a natural bar, mostly along the forward direction, also for a bar straight in
front of the shoulder. The bars stand 0.4 m in front of the badger, and the short arms do not
reach them from an upright body. A side move alone thus gains little:

| Variant (pirates part) | Left within 5 mm | Left median | Right within 5 mm | Right median |
|---|---|---|---|---|
| `main` | 0% | 38 mm | 0% | 22 mm |
| side move 4 cm, spine 8°, no lean | 0% | 38 mm | 0% | 21 mm |
| forward lean 0.14 rad, side move | 62% | 2 mm | 89% | 0 mm |
| forward lean 0.2 rad, side move | 91% | 0 mm | 89% | 0 mm |
| forward lean 0.2 rad, no side move | 83% | 0 mm | 89% | 0 mm |

`SET='xylophone.side=<json>;xylophone.lean=<rad>' node docs/research/2026-10-25-xylophone-sway/xy.ts <file>`
(`scan.txt`). The rest of the misses are the sharp bars of the back row, about 11 cm short.

## 3. The measures

The branch leans the spine 0.2 rad forward, moves the hips up to 2 cm and the spine up to 10°
toward the notes, and lifts each head with the pitch 0.5 rad between strikes. `SET` with
`xylophone.side=null;xylophone.lean=0;xylophone.across.pitch=null` gives the poses of `main`.

| File, measure | `main` | branch |
|---|---|---|
| Pirates, strikes within 5 mm, L / R | 0% / 0% | 90% / 89% |
| Pirates, median miss, L / R | 38 / 22 mm | 0 / 0 mm |
| Pirates, forearms in body | 3.5 cm, 11.0% | 1.5 cm, 0.4% |
| Pirates, head gap min, p5 | 0.9, 1.5 cm | 2.5, 2.8 cm |
| Pirates, mallets touch | 1.2% | 0.4% |
| Test score, strikes within 5 mm, L / R | 19% / 0% | 46% / 26% |
| Test score, median miss, L / R | 88 / 160 mm | 26 / 95 mm |
| Test score, forearms in body | 5.0 cm, 33.5% | 3.4 cm, 16.1% |
| Test score, head gap min | 5.1 cm | 8.8 cm |
| Center of mass inside the bind soles, min | 7.2 cm | 9.6 cm |
| Lowest sole | 0.0 cm | -0.6 cm |

`xy.ts` (`reach.txt`), `heads.ts` (`heads.txt`), `balance.ts` (`balance.txt`), and
`pnpm pose-depth xylophonist --base main`, also with `--midi <file>` (`pose-depth.txt`,
`pose-depth-pirates.txt`), and with `--set` of the `main` values for the shares of `main`
(`pose-depth-mainset.txt`, `pose-depth-pirates-mainset.txt`). On the test score, a scale stays
in one hand, because a hand does not cross the other, so the right paw reaches across the body
to the lowest bars.

The pitch of the heads between strikes (pirates part, `pitch-scan.txt`):

| Pitch rad | Head gap min | Mallets touch | Head height p50 | Paw swing p95 L / R |
|---|---|---|---|---|
| none | -1.2 cm | 8.0% | 18.6 cm | 27 / 27 (`main`) |
| 0.5 | 2.5 cm | 0.4% | 13.5 cm | 35 / 35 |
| 0.7 | 2.8 cm | 0.3% | 18.9 cm | 44 / 44, FAIL |
| 0.9 | 3.6 cm | 0.2% | 23.9 cm | 54 / 54, FAIL |

`pnpm arm-check xylophonist --base main --variant p07 --set 'xylophone.across.pitch=0.7' ...`
(`arm-scan.txt`). With no pitch, the arms that now reach their bars bring the heads together.

The hip move against the soles (`hips-scan.txt`): 4 cm sinks the lowest sole 8 mm into the
floor, 3 cm 7 mm, and 2 cm 6 mm, because the foot skin follows the tilted shin. The ankles stay
in their bind places in each sample.

## 4. The gate

`pnpm arm-check xylophonist --base main` (`arm-check-role.txt`) passes each value. The paw swing
p95 grows from 27° to 35°, and the grip turn p50 is 7° (L) and 4° (R) from `ACCEPTED_GRIPS`.
With no pitch, the lean and the side move alone give 4° and 1° (`arm-scan.txt`). With the
entry of the xylophonist removed, the tool gives the ready entry
`['xylophonist', { L: -28, R: -22 }]` (`grip-entry.txt`), against -24 and -24 on `main`.
`pnpm clip-probe --base main --jobs 4` (`clip-demos.txt`) passes each demo and the test score
with the values of `main`, also with `--midi <file>` (`clip-pirates.txt`). `pnpm body-probe
--base main` (`body-probe.txt`) keeps all 1,492 pose sets, because no demo has a xylophone.
`pnpm arm-check --all --base main` (`arm-check-all.txt`) gives no `FAIL`, and each other role
keeps each value of `main`.

## 5. The result

The badger leans over the bars and moves behind its notes, and it reaches 89% to 90% of the
strikes of the steel drum part, where `main` reached none. The pitch keeps the heads apart. The
back row, the scale in one hand, and the sink of the soles stay open (`TODO.md`).

The images give `main` on the left and the branch on the right, as 2x crops of `pnpm close-views
xylophonist <dir> --moments lowest,highest,between,rest,lift50,lower50 --zoom 1.3 --base main`
at the elevations 20°, 40°, and 70° (`pair.py`): the paws from the front (`paws-front.webp`), from
±35° (`paws-az35.webp`), and from each side (`paws-sides.webp`), the whole body from the front,
the back, and each side at 40° (`body-e40.webp`), and the legs from the back (`feet-back.webp`).
The paws close on the mallets, and each shaft leaves the front of the fist, as on `main`.
