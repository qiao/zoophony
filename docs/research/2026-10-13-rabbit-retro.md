# The retrospective of the rabbit task (2026-10-13)

On 2026-10-13 the rabbit violinist got the studio body of `lowpoly-studio/` by route 3 of
`AGENTS.md` ([`2026-10-13-studio-rabbit.md`](2026-10-13-studio-rabbit.md)). The task merged at
`2b827885`. The rule of the user of 2026-10-12 then applies. After a task merges, the manager
asks its agents what makes the next similar task faster. Then the manager decides, and applies
the items that are worth their cost. This report gives the rounds of the task, the costs that the
agents named, the decisions of the manager, and the measured gain.

## 1. The rounds and their times

Each clock time is the file time of a brief, a report, or a merge log in the scratch folder of
the manager session. These are `brief-rabbit-*.md`, `report-rabbit-*.md`, `review-rabbit-*.md`,
and `merge-rabbit-*.log`. The seconds of a merge are the time that `tools/merge-branch.sh`
printed in its log. The script prints no clock time.

| Round | Branch | Start | End | Minutes | Merge |
|---|---|---|---|---:|---|
| Studio 1: the body and the role | `rabbit-studio` | 16:43 | 18:09 | 86 | 18:15, 217 s |
| Studio 2: the look | `rabbit-look` | 18:14 | 18:57 | 43 | 19:02, 282 s |
| App 1 | `rabbit-app` | 18:19 | 19:56 | 97 | with app 2 |
| Studio 3: the ears | `rabbit-ears` | 18:59 | 19:27 | 28 | 19:37, 562 s |
| Review 1 | `rabbit-app` | 19:58 | 20:08 | 10 | |
| Fix 1 | `rabbit-app` | 20:09 | 20:27 | 18 | |
| Studio 4: the arms 1.4 times as long | `rabbit-app` | 20:31 | 20:48 | 17 | with app 2 |
| App 2: the body of studio 4 | `rabbit-app` | 20:32 | 21:23 | 51 | |
| Review 2 | `rabbit-app` | 21:23 | 21:34 | 11 | |
| Fix 2 and merge | `rabbit-app` | 21:34 | 21:42 | 8 | 177 s |

The task took about 5 hours, from 16:43 to 21:42. Studio rounds 2 and 3 merged while app round 1
ran, so the app agent rebased two times. Studio round 4 ran on the app branch, and the app
agent of round 2 started after it.

The largest cost was the reach of the arms. The arms of the studio rabbit reached 0.269 m from
the shoulder joint to the middle of the palm. The rule of a violin shop then gives a violin of
0.15 m, less than half of the smallest real violin (0.33 m). The app agent found this at minute
14 of app round 1 (18:33): the left paw reached no part of the fingerboard. The brief of app
round 1 had a fallback rule with no range and no stop. The rule said: "give the rabbit a smaller
violin and bow, sized by the rule of real violins". So the agent made a violin of 0.15 m and
finished the round. The user saw it only after the round, and chose longer arms. Studio round 4,
app round 2, review 2, and fix 2 followed, about 70 minutes from 20:31 to 21:42.

## 2. The costs that the agents named

The agents answered the questions of the manager in `retro-rabbit-app.md` and
`retro-rabbit-studio.md` of the scratch folder.

| Cost | Minutes | Agent | Cause |
|---|---:|---|---|
| Scratch probes of the reach and of the rule of a violin shop | about 15 | app | no saved tool |
| Two full runs of `tools/check-commits.sh` after the rebases | 10 and 11 | app | studio merges during the app round |
| The chair depth, the layout change, and the drawer test of the shots | about 20 | app | no layout diff against `main` |
| The fix of 21 tests that were tuned on the parametric rabbit | about 15 | app | old tests of the old body |
| The split of a mixed working tree into fine commits | about 15 | app | late commits |
| Docs | about 20 | app | |
| Hold tuning with `pnpm pose-depth --set` | about 12 | app | |
| Four role builds for slits of the seated bind pose | about 15 | studio | no check of the seated bind pose on 2 seeds before the clips |
| Height values of the like animal, written by hand | about 15 | studio | `new --like` does not scale them |
| The fit scaled the whole body by about 7% | about 10 | studio | a fixed `box_pad` clipped the long ears |

The studio agent saw the short reach in round 1. It measured an arm of 0.2 animal heights, and a
chest 0.11 animal heights in front of the shoulder joints. It set the violin of the studio to 0.17
animal heights, and recorded this in its report. It did not mark it as a blocker for the app.

## 3. Decisions

| Item | Saves | Cost | Decision | Reason |
|---|---|---|---|---|
| `pnpm hold-reach <species>`: the arms, the scroll, the reached parts of the fingerboard and the bow, and the scale of the rule | about 15 min of probes in each round with a chin instrument | about 30 min | applied | The app agent named it first. It also gives the manager the scale of the rule before the round. |
| The arm reach in `pnpm studio-body --inspect` | a probe before each round | about 10 min | applied | The manager runs the inspection before each brief, so the arm is in the brief with no other step. |
| A row for the reach of the arms in section 1 of `docs/briefs/studio-body.md`. The manager asks the user before the round when the rule gives a violin outside the real sizes. | about 70 min when the reach is short | no code | applied | The question of the user came after a round of 97 minutes. Before the round, it costs a few minutes. |
| A part "Range and stop" in the implementation brief | a round with a result outside its range | no code | applied | The fallback rule of app round 1 gave a violin of 0.15 m, and nothing stopped the agent. |
| The look rounds of the studio finish before the app round starts. An overlap puts the studio round on the app branch, one agent after the other. | about 20 min of check waits | no code | applied | Each studio merge during app round 1 made the app agent rebase and check each commit again. Studio round 4 on the app branch had no such wait. |
| A layout diff tool (`pnpm body-probe --layout`) | about 20 min, only when a layout changes | about 40 min | not taken now | The cost is larger than the gain of one task, and only a body with a new footprint changes the layout. |
| The studio items: the ear box, `new --like` with height values, and the check of the seated bind pose | about 40 min | | in the round `retro-studio` | The studio has its own rules and its own agent. |

## 4. The measured gain of the reach tool

`pnpm hold-reach rabbit` runs in 0.4 s with `pnpm`, and in 0.19 s with `node` (three runs of
`node tools/hold-reach.ts rabbit`, `2026-10-13-rabbit-retro/hold-reach-rabbit.txt`). The app
agent named about 15 minutes of scratch probes for the same numbers: `violin-rule.ts` and
`violin-solve.ts` of [`2026-10-13-studio-rabbit/`](2026-10-13-studio-rabbit/).

The tool gives the same numbers as the probes on the body of studio round 4 (`violin-round4.txt`
of the rabbit research). The arm is 0.377 m, and the scroll lies 0.377 m from the left shoulder
joint. The arm reaches the fingerboard from 0 to 1, and the bow hair from 0.030 m to 0.245 m. The
rule scale is 0.549. The probe found the scale with a search of about 30 builds for each turn of
the violin. The tool solves it from one build: the instrument grows from its tail end, so the
scroll moves on a line. Then it builds the player at that scale one time, as a check. The
inspection gives the same arms as the tool for each studio animal
(`2026-10-13-rabbit-retro/inspect-arms.txt`). The arm is 0.377 m for the rabbit, 0.540 m for the
bear, and 0.625 m for the polar bear.

