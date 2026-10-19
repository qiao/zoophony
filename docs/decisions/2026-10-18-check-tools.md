# Decisions of the check tools

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-18, the agent of the round `back-light` reported two problems:
`tools/check-commits.sh` rebased in the checkout of the caller, and `pnpm close-views play` could
not frame a back-row player. The manager chose two items for the round `retro-check-tools`, and
its agent decided the rows below. The user can reverse each decision. Then update its section, and
remove its row.

| Decision | Section |
|---|---|
| `tools/check-commits.sh` checks each commit in a temporary detached worktree of HEAD, one commit after the other with `git checkout --detach` (`check_in_worktree()`). No rebase can stop half-way, and the caller needs no clean tree. A run with only hits adds no worktree. | 9.3 |
| The worktree gets a link to the `node_modules` of the caller when its `.pnpm/lock.yaml` is the lockfile of HEAD, else an offline install (`make_worktree()`). Both give the hash of the lockfile of HEAD, so the cache keys stay. The setup takes 1.0 s to 1.3 s with a link, 2.0 s with an install. | 9.3 |
| A move of HEAD of the caller during the run gives the exit code 4 after the last check. The entries of the checked commits stay, so a second run checks only the new commits. | 9.3 |
| The script runs its body on one line, `main "$@"; exit "$?"`, and the module from a copy, because the caller can edit both during the run. | 9.3 |
| The check of an unchanged tree after the checks skips `node_modules` (`:(exclude)node_modules`), because `.gitignore` ignores only a folder of that name, and the link is no file of the tree. | 9.3 |
| On `main`, `<base>` is the parent of the first commit of the agent, also when commits of others come before it (`docs/agents/workflow.md`). | 9.3 |
| The paused test `tools/check-commits.test.ts` loses its case of the refused dirty tree, and its other cases read the new messages. It did not run, because all tests are paused. | 9.3 |
| `pnpm close-views play --cinematic` clicks no "Reset view", moves the pointer onto the stage before the seek, and keeps the seek lead of 4 s (`playFrame()`). It takes no `--camera`, because a drag or a wheel turns the camera to Free. A frame fails when "Automatic camera" is off. | 2.5, 7.1 |
| `--shot <seat\|species>` takes the first solo or section shot in time whose seats hold the subject (`firstShotOf()`). The plan comes from `prepareShots()` of the patched demo, with the section size "Auto" and `SHOT_SEED`, as `planScene()` of the app (`chooseShot()`). | 5.6 |
| The frame of `--shot` is the middle of the shot, to 0.1 s (`SHOT_FRAME_SHARE`). The longest blend is 1.2 s and the shortest shot is 4 s, so the frame comes after the blend. `--shot` takes no `--time`. | 5.6 |
| With `--base`, the shot comes from the working tree, and the commit renders the same song time, so the two frames compare at one time. The tool prints that the plan of the commit can differ. | 7.1 |
| A subject with no solo or section shot stops the tool before the build, with the seats of the solo and section shots of the demo. Boulanger has no such shot of the panda (seat 13). The panda solo is in `beethoven-9`, seat 11. | 5.6 |
| `tools/merge-branch.sh` names a move of HEAD in place of the check rebase, and its test for an unfinished check rebase goes away. Its own rebase onto `main` stays. | 9.3 |
