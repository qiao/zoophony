# The rabbit arms and violin hold

Date 2026-10-24. The user reported twisted arms, sharp angles at the bent elbows, arms that were
too long, a reversed left paw, and a violin that the rabbit did not hold well. The decisions are in
[`2026-10-24-rabbit-hold.md`](../decisions/2026-10-24-rabbit-hold.md). The images and the gate
tables are in [`2026-10-24-rabbit-hold/`](2026-10-24-rabbit-hold/).

## The palm

The palm hint of the rig sets the roll of the arm bones, and the holds turn that palm toward the
violin neck and the bow. A scan of six palms around the arm axis (`gate-variants.txt`) found that a
hint 180° to 200° from the true palm lowered the paw twist from 163° and 147° to 76° and 83°. But
the holds then turned the back of the left paw to the neck: the palm faced up
(`palm-200-crops.webp`, `left-paw.webp`). The true palm, as the palm of the fox (in, down, and a
little back), gives the hand of the fox: the paw holds the neck from below, and the fingers curl
over the top (`left-paw.webp`, second panel, and `fox-views.webp`).

## The sharp angles

Eight to 13 long thin faces of the mesh cross each elbow, up to the length of the forearm. A bent
elbow pulls their far corners with the forearm, and they fan out as spikes. Weights cannot bend
one face. One ring at each elbow splits these faces, and the bent arm stays round
(`rings-close.webp` and `rings-role.webp`, the rabbit without rings above).

## The arms and the violin

The arm factor 1.15 gives a reach of 0.3647 m (0.4094 m before). With the violin of 0.83 at 45°
to the left, the left paw reached the fingerboard only from 0.24 of its length. At 60°, the scroll
comes nearer to the left shoulder, and the paw reaches it from 0.06, with a nearly straight arm.

The violin sat at the mouth, because the place of the hold was in head heights of the old mesh.
At 0.15 H lower and 0.04 H further back, the jaw lies on it, and the bow passes under the chin
(`violin-height.webp`, `views-left.webp`).

## The gate

`arm-check.txt` compares the final rig with the rabbit of the arm factor 1.3. The paw twist falls
from 163° and 147° to 158° and 125°, the forearm twist from 56° and 52° to 52° and 41°, and the
round shape of the right upper arm rises from 0.71 to 0.81. The rest violin with the turned top
plate ends the turn of the left paw through 180° in the lift: the turn rate falls from 17,955°/s
to 147°/s. Two values stay just outside their limits: the right wrist stretch of 0.37 at rest and
the left round shape of 0.54 in the lift. No rest grip, rest elbow, bow tip, or hair direction
moved them (`gate-variants.txt`), and they do not show in the views.
