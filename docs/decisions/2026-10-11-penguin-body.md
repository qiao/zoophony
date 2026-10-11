# Decisions of the penguin body

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-11, after the second revert of the bodies, the user said: "make these animals look more
like the reference images ... penguin looks off". The manager gave the penguin a body of its own,
built in code after the choir of `orchestra-latest.png` and `orchestra-side.png`. The agent of the
penguin body decided the other rows. The report
[`2026-10-11-penguin-body.md`](../research/2026-10-11-penguin-body.md) gives the measures, the
rounds, and the images. The user can reverse each decision. Then update the section that holds it,
and remove its row.

| Decision | Section |
|---|---|
| The user, through the manager: the penguins of the choir look like the penguins of the two newest reference images (design 1), and they get a body of its own built in code (route 2 of `AGENTS.md`). `SpeciesParams.body` with the value `penguin` selects the egg body of `models/penguin/` in `buildBiped()`. The other species keep the parametric body | 4.3, 4.4 |
| The body is one tall egg with the head as its top and no neck, 2.48 times as tall as wide in its bind pose, and the test of the body keeps it from 2.2 to 2.6. The two images disagree: 2.6 to 3.1 from the front in `orchestra-latest.png`, and 2.0 in the three-quarter views of `orchestra-side.png`. The back is a little deeper than the front, toward the round backs of `orchestra-side.png` | 4.4 |
| The crown of the egg is 1.04 m above the soles, near the 1.05 m of the parametric penguin. Thus the risers, the spacing of the singers, and the hidden heads of the choir keep their values | 4.2, 4.4 |
| The body splits at the `chest` bone, 1 H below the head center, behind the folder. The shots of the choir read the chest as the place of the folder (5.6). With the split under the folder at 1.0 H above the soles, the chest of a singer of the Ode to Joy stood 1.34 m high, under the 1.4 m to 1.6 m of the shot test, and a second shot test failed | 4.4, 4.7, 5.6 |
| The head is the top of the egg on `head`. The chest part goes up inside it as a throat, and the `neck` and `head` bones are in the throat at the lower edge of the head. A lift of the head of up to 22° then shows the throat and no hole. Each part of the body is a closed shell, and a test checks it | 4.4, 4.7 |
| The back, the crown, and the flippers are black, and the white front is a shield from just under the beak to the bottom, narrow at the top and wide at the belly. Each triangle takes its color from its height and its angle from the front | 4.4, 4.5 |
| A white patch on the head carries each black eye with a white light. The eye and the light follow the eye bone, and the patch stays in a blink. The patch and the eye are larger than in the images, so that the eye shows at the distance of the stage, as the eye rings of the UX audit N8 | 4.4 |
| The beak is larger than the parametric beak: about half as wide as the head, as in the images. The upper half follows `head`, and the lower half follows `jaw`. The inside near the root has `MOUTH_COLOR` `#4d2312`, a little lighter than the darkest samples of the open beaks of `orchestra-side.png`. The front of the beak stays orange inside, because a dark lower beak looked like a red tongue | 4.4, 4.5 |
| Each flipper is a flat and wide limb of three parts on `upperArm`, `forearm`, and `hand`, with its root in the body. Its wide side turns a little to the front, because a flipper seen edge-on did not show in the front view. The palm is a point near the tip. The `fingers` bone has no part, so the curl of 35° of the choir pose shows nothing | 4.4, 4.7, 5.3 |
| Two small orange feet stand on the floor under the front of the egg, 0.24 of the body height apart, as the 0.23 to 0.26 of `orchestra-latest.png`. The thighs and the shins have no part, so no legs show | 4.4, 4.5, 4.7 |
| On a seat, which the cast never gives it, the penguin stands on the top of the seat. Thus the tests that build each species on each support keep a valid body | 4.4 |
| The egg has 14 corners on each ring and larger offsets of the corners than the parametric body, for the large facets of the images. The body has 1,356 triangles, against 2,136 for the parametric penguin. The singer with its folder has 1,404 triangles, against 2,184 | 4.5 |
| The folder hangs 0.85 H below the head center, in place of 1.0 H. On the egg body, its middle showed 0.57 to 0.61 of the body height below the crown, against 0.51 to 0.56 in the images. It stays 0.75 H in front of the head center and leans back 35°. `CHOIR_HOLD` does not change: the poles and the curl fit the flippers | 4.6, 5.3 |
| The parametric parts of the penguin stay in the biped: the `beak` snout and the `eye-rings` face pattern, and the shape parameters of the penguin in `SPECIES`. No species uses these parts now, but the shape table of 4.3 still names them, and a removal of `body` gives the parametric penguin back in one line | 4.3, 4.5 |
| `ringLoft()`, `addPainted()`, `limbTube()`, and the plates of `models/face-plates.ts` come back from `bcdf7f68^` with their tests, because the egg body uses them. `addPainted()` gets a test of its own | 4.4 |
| A gallery page with no bear has no conductor, and its players play alone. The queries `azimuth` and `elevation` turn and tilt the camera of a close view. `pnpm choir-check <dir>` uses them to compare the penguin with one penguin of each of the two images, because the penguin has no model sheet | 7.1 |
| The tests of the egg body check the behavior: the egg, no neck, the colors of the back and the front, the beak on the jaw, the flippers, the feet with no legs, the closed parts, and the body on a seat. A test of the singer keeps the folder and the flippers out of the body. The tests that the user removed on 2026-10-10 stay out | 9.3 |
