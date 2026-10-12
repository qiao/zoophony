# Handoff: the polar bear pilot (phase 3)

Branch `studio-pilot`, worktree `.claude/worktrees/studio-pilot`, from main 3ea5896e. Another
agent writes the skill and `docs/brief-template.md` and `docs/sheet-spec.md` in another
worktree: do not edit those files.

## Last finished step

Part A (the model, conductor role) meets the bar on seed 1: IoU front 0.9442, side 0.9554,
back 0.9414, 3/4 0.9291; 72 of 81 checks pass; all gates pass. The bear regression passes
(GLB byte-identical).

## Next step

Part B: the pianist role pack (`roles/pianist/`), a seated bind pose, scene props (piano,
bench), the role checks, the clips, and the viewer.

## Open problems

- The ears fail in the side and back views: the sheet views disagree (the back view shows the
  ears lower than the front view).
- The 3/4 eyes fail as on the bear (the 3/4 view of the sheet turns the head more).
- `nose_width.side` (0.029 against 0.035) and `belly_height.front` (0.043 against 0.097).
- Seeds 2, 4, 5, 6, 8 fail the remesh gate (slivers, slits), and seed 3 fails the contact gate
  of bow and performance. Seeds 1 and 7 pass.
