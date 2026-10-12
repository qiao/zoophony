# Brief template: one round of a low-poly animal

A manager fills this template for each round and gives it to a fresh agent. Copy it to the
scratch folder of the round, replace each `<...>`, and delete the notes in parentheses. A part
that does not apply says "none". The skill `lowpoly-animal-studio` explains each step and each
check.

Two rules hold for every brief:

1. **Each visual claim has a crop of the sheet and a measure.** Make both with
   `python3 ~/.claude/skills/lowpoly-animal-studio/scripts/sheet_crop.py`, or take them from
   `out/report/` of the last build. A claim with no crop goes back to the manager.
2. **The agent checks each claim against its crop before it acts.** When the crop disagrees
   with the claim, the agent follows the crop and reports the difference. (On the bear, the
   claim "no white ring" had no crop. It was wrong, and three rounds of eye work followed.)

---

# Brief: <animal id> <role>, round <n>

Date <yyyy-mm-dd>. Manager <name or session>. Base commit `<hash>` of `main`.

## Goal

<One paragraph: what this round delivers, in measurable terms. For example: "The first build
of the polar bear pianist. All gates pass on the kept seed. The IoU of each view is at least
0.94 (3/4: 0.90). The eyes, the nose, and the ears pass their feature checks.">

Done when: <the exact conditions, each one checkable: checks, images, commits, handoff>.

## Reference

- Sheet: `animals/<id>/reference/<file>.png`, <width> x <height> px, views <front, side,
  back, 3/4 at <az> degrees>, figure height <px> px, background RGB <r, g, b>.
- Camera: <orthographic, or the focal length and the distance>.
- Face sheet: `<path>`, at <scale>x. Facet image: `<path or "the sheet">`.
- Sheet spec check (`docs/sheet-spec.md`): <each rule that the sheet breaks, and the decision
  of the user: "accept as a limit" or "new sheet">.

### Target crops and measures

Store the crops in `animals/<id>/reference/targets/`. One row for each visual claim.

| # | Claim | View | Crop | Measure (command, value) | Check, limit |
|---|---|---|---|---|---|
| 1 | <"The eyes have a dark outline and a thin white rim"> | front | `targets/eyes-front.png` | `sheet_crop.py <id> --view front --feature eyes`: outline 0.0265, rim 0.0008 | `eye_outline` 8%, `eye_rim` 0.0003 |
| 2 | <"The head is a ball above the shoulders"> | front, side | `targets/head-front.png` | `fit --rows`: cheek half width 0.153 at 0.83 | `iou.front` 0.94 |
| 3 | <"Small facets on the face, large on the belly"> | front | `targets/facets-belly.png` | median edge <n> px at the sheet scale | build log median edge, `facet_contrast` |
| <n> | <claim> | <view> | <crop> | <command: value> | <check: limit, or "by eye"> |

## Style requirements

Each line is decided, or says "agent decides". The skill file `references/intake.md` explains
each item.

| Item | Decision | Evidence (row of the table above) |
|---|---|---|
| Topology and facet style | <organic mirrored triangles that follow the forms, and where the small facets go> | <#> |
| Facet size and contrast | <median edge in px, and the contrast of the sheet> | <#> |
| Light | <the light preset of the sheet: soft studio, key upper left, bright fill> | <#> |
| Color | <palette RGB of each region, or "match the sheet within the fur color limits"> | <#> |
| Symmetry | <mirrored, with the mean of both sides> | |
| Eyes | <outline, white rim, iris, look direction, highlight> | <#> |
| Head and snout | <form of the head, neck, snout, muzzle region, nose, mouth> | <#> |
| Ears | <size, form, turn, inner dark share> | <#> |
| Claws, paws, tail | <claw count and length, claws apart, tail size and views> | <#> |
| Folds at any seed | <"each seed that passes the remesh gate passes the fold and contact gates"> | |
| Other markings | <each marking and its paint rule, or "none"> | <#> |

## Role

- Role pack: `roles/<role>/` (<exists, or "new in this round">). Stance: <standing or seated>.
- Bind pose: <shoulder_flex, shoulder_abduct, elbow_flex, hip_flex, knee_flex>, and the reason
  (the middle of the motion range).
- Props: <each prop, its kind, its attachment, its size>.
- Clips: <each clip with the size and the place of its gesture, the tempo base, the length>.
- IK target body: <the body of `[targets]`>.
- Role checks: <contact depth, contact tests, other checks of the role>.

## Values to keep

<Each value that must not get worse, with its current number: the IoU of each view, the checks
that pass now, the gates, the triangle budget, the GLB size, `python3 studio regress bear`.>

## Limits

- Time box: <minutes>. Stop at the box, commit, and write the handoff.
- Files: the agent owns <paths>. Other agents own <paths>. Do not edit files outside your list.
  List each needed change outside it in the report.
- Budgets: body triangles <range>, GLB size <MB>, seed pool `--jobs <n>` (2 when another agent
  builds at the same time).
- No push and no merge, unless this brief says so.

## Deliverables

- Commits on branch `<branch>`, one logical change per commit, Conventional Commits with the
  scope `studio`.
- `animals/<id>/animal.toml`, the reference files, `out/` of the kept seed, `golden.json`
  (`python3 studio regress <id> --write --from animals/<id>/out --note "<note>"`), and
  `animals/<id>/README.md` with the method and the numbers.
- The handoff file `docs/handoff-<id>.md`: the last finished step, the next step, the
  numbers, the failing checks, the open problems.
- The report in the format below.

## Rules

- Work in the git worktree `<path>` on the branch `<branch>`, from `<base>`. Stage each path by
  its name. Never use `git add -A` or `git add .`.
- Run each studio command in `lowpoly-studio/` of your worktree. Never write into the main
  checkout.
- Ports: let the studio choose free ports. Never take 5173 or 5190.
- Stop each server, browser, and Blender process that you start. Never stop a process that
  you did not start. End with a clean tree.
- Shell: zsh (no word splitting of `$var`), no `timeout` on macOS, no foreground `sleep`. Run
  long builds in the background. Read the exit code of the command itself: a pipe gives the code of its last part.
- Put numbers in `animal.toml` or `role.toml`. A change of studio code runs
  `python3 studio regress bear`, and it must pass.
- Update the handoff file after each finished step.
- Write in ASD-STE100 Simplified Technical English, with no em dashes.

## Report format

Reply with these parts, in this order, and nothing else:

```markdown
## Result
<one sentence: done, or stopped at which step and why>

## Numbers (seed <kept>, commit <hash>)
| IoU front | side | back | 3/4 | checks pass / all | near | gates | body triangles | seeds pass (--all-seeds) |

## Claims checked
| # | Claim | Crop agrees? | Note |

## Failing checks
| Check | Value | Limit | Place and crop | Verdict: fixed, open, or limit of the sheet |

## Times
| Step | Count | Typical seconds |

## Commits
<hash subject, one per line>

## Open problems and the next step
<each problem with its evidence, and one recommended next step with its cost>

## Images to review
<out/report/review.png, out/compare/compare.png, the face crops, the frames>
```
