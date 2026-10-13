# The retrospective of the pianist rest rounds (2026-10-13)

On 2026-10-13, the user said: "the default rest pose of the polar bear looks strange, fix it".
The first round made the rest pose follow the rest clip of the studio and merged at `6dbe9953`.
The user then said: "the pose is still strange. Identify what's the common pose for real pianist
when they're preparing for a performance". The second round gave the bear the rest position of a
real pianist (branch `pianist-lap`). The user rule of 2026-10-12 asks for a retrospective after a
merge, and the manager decides and applies the items that are worth the cost.

## 1. The times

| Step | Minutes | Source |
|---|---:|---|
| Manager: renders of the app and of the studio clips, brief | about 25 | session times |
| Round 1: implementation | 28 | agent time |
| Round 1: review | 24 | agent time, 6 findings |
| Round 1: fix | 17 | agent time |
| Round 1: merge | 4.4 | `tools/merge-branch.sh`, 16 commits with `hit` |
| Round 2: implementation | 29 | agent time |

The tool time of the implementer of round 1 was 17 of 71 minutes. Most of the rest was the
writing of probes. The reviewer of round 1 spent its time on these probes:

| Probe | Reviewer minutes | Cause |
|---|---:|---|
| The lowering, a mute, a lift in a lowering, and the gap of the head to the case | 17 | about 25,000 samples, past the 10 minute limit of a call |
| Its own probes | 10 | it read the sweep and the transport code |
| A pose hash on `main` and on the branch | 6 | no tool: it extracted `main` by hand |
| The paw gap in the studio clip, and the lowering with the old arc | 6 | it copied the studio sampler of the implementer and fixed it |

The implementer of round 1 wrote the same pose hash and studio sampler in `scratch/`. The merge
removed its worktree with the folder, so round 2 had no copy.

## 2. Decisions

| Proposal | Saves for each similar task | Cost | Decision |
|---|---:|---:|---|
| A sample set of the lowering in the sweep | about 20 min | in the fix of round 1 | applied (`943be576`) |
| Pose hashes of each player in `pnpm body-probe`, also with `--base` | about 15 min | 45 min | applied (branch `review-tools`) |
| `pnpm pose-depth <role> --gaps`: the head to the instrument, the paws to the body | about 8 min | 30 min | applied (branch `review-tools`) |
| Each probe of a report number goes into the research folder with its command | about 5 min | 5 min | applied (`docs/briefs/studio-body.md`) |
| A pose brief starts from the posture of a real player, with a source | one round of rework | 5 min | applied (`docs/briefs/studio-body.md`) |
| A committed sampler of the studio clips: the joints and the skin at a time | about 5 min | 40 min | deferred: it helps only when a studio clip is the target |
| A lift moment in `pnpm close-views` | about 3 min | 20 min | deferred: the views of the rest and of the play show the ends of the lift |
| A lift in a lowering, and a mute, in the sweep | about 5 min | 15 min, and a longer sweep | deferred: the review measured both within the limits |

## 3. Measured gains

| Measure | Before | After |
|---|---:|---:|
| The pose check of the other players | 6 min of a hand-made probe | 2.9 to 3.2 s, `pnpm body-probe --base main` |
| The gap of the head to the case | part of a 17 min probe | 37 s, `pnpm pose-depth pianist --gaps`, within 0.05 cm of a brute-force probe |
| The output of `pnpm body-probe` with no `--out` | 303,512 B of JSON | 177 B: the counts and a SHA-256 |

A compare with `5569e1e6` names only the two pianists in the rest, the lift, and the lowering,
and 666 of 672 pose sets stay equal.
