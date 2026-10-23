# The night fixes of 2026-10-23

Date 2026-10-23. The user listed four issues and asked for views from several angles of each fix.
The decisions are in [`2026-10-23-night-fixes.md`](../decisions/2026-10-23-night-fixes.md). The
probes, the gate tables, and the images are in [`2026-10-23-night-fixes/`](2026-10-23-night-fixes/).

## The twist through 180° (cat, beaver)

`pnpm arm-check violist bassoonist` gave the left paw of the cat a move twist of 180° and a turn
rate of 17,929°/s, and the left paw of the beaver 178°. `move-trace.ts` poses one lowering at steps
of 0.02 s and prints the twist of each paw on its forearm. On `main`, the left paw of the cat
turned from 148° in the play to -94° at rest through 180°, and the twist bone of the forearm,
which takes half of the twist, jumped from 89° to -86°. The side views of the lift showed the
wrung forearm (`cat-lift-main.webp`). A move of the wrap point would twist the forearm at rest or in
the play, so the fix turns the rest paw toward the side of the play paw.

For the cat, a rest top plate that faces back and to the left gives the rest paw a twist of about
90°, and the lowering stays below 180° (`cat-lower-trace.txt`): move twist 153°, turn rate
1,173°/s (`cat-arm-check.txt`). Lower lap places put the viola against the shoulder. The rest
viola stays on the left thigh (`cat-rest.webp`), and the lift keeps a clean forearm
(`cat-move.webp`, `main` in the top row).

For the beaver, the rest paw turned 178°, at the wrap. Each left rest elbow that points down
passes the gate (`beaver-arm-check.txt`): paw twist 118°, turn rate 19°/s. The play elbow
direction `[-0.5, -1, -0.5]` is one of them, and the rest arm then bends down beside the body in
place of a flat arm out to the side (`beaver-views.webp`, `main` in the odd rows).

## The dog pizzicato

`pnpm hold-fit cellist --technique pizzicato --demo all` (`dog-pizzicato-main.txt`) gave folds at
the front of the right shoulder in 87% of the pizzicato samples, the right upper arm turned 101°,
and 5.2 cm of the upper arms in the body. The paw plucked over the fingerboard and lay flat across
the strings. The scan (`dog-pizzicato-variants.txt`) gives 20%, 79°, and 2.2 cm for a pluck from
the side, 0.15 m right of the strings, at 0.2 of the way to the bow, with the elbow out and down,
as the bassist of `docs/reference/string-technique.md` 2.8 (`dog-pizzicato.webp`, `main` in the
top row). The arm gate of the cellist passes.

## The woodwind paws

Each wind paw only points along the line from its shoulder to its grip (`handToward()`), so the
palm keeps the roll of the shoulder. Each paw reached its grip (`pnpm hold-reach`), and the gate
passed, but the paws closed as fists beside the tube. With `palmToTube`, each paw on its grip rolls
around that line until its palm faces the tube, by the weight of the playing pose. With the other
sign of the left palm, the left paw cupped up, away from the tube. The paws of the mouse and the
wolf now lie over the tube with the fingers on the keys (`mouse-oboe.webp`, `wolf-clarinet.webp`,
`main` in the top row). The left paw of the tan fox leaves its grip at rest. With the roll, the mix
from its rest paw flipped its side in the middle of the lift (4,723°/s), so it keeps its old roll,
and its right paw lies on the flute (`fox-flute.webp`). The three roles pass the gate
(`winds-arm-check.txt`), with new accepted grips.

## The eyes

A pea eye is 0.18 of the head height that shows. The setting `eyeSize` of `ANIMALS` scales it.
The polar bear takes 0.7 from a lineup of 1, 0.8, 0.7, and 0.6 (`polar-bear-eyes.webp`). The
elephant takes 0.6 (`2026-10-22-elephant-apose.md`).
