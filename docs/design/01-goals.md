# 1. Goals and budgets

- The app is a static site on GitHub Pages. It has no server.
- Desktop browsers come first. Phones must play the music, with lower visual quality.
- The scene renders at 60 fps on a laptop with an integrated GPU.
- The first download is less than 1 MB after gzip. Section 7.2 defines what the check counts.
- The app loads the instrument samples after the first frame. It loads only the presets that the
  file uses.
- The code license is MIT.

The reference image [`reference/orchestra.webp`](../reference/orchestra.webp) shows the target scene.
The user owns the rights to it. Look at it before any visual work. Section 4.5 gives the values
that come from it.

- A square wooden stage with steps at the front stands in one warm spotlight, on a dark
  background.
- A bear conducts from a podium.
- Three gray rabbits and four foxes play violins (the cast has the white rabbits of
  `animals.webp`, 4.5). Three raccoons play clarinets (the cast has wolves there, 4.3). One
  elephant plays a cello (the cast has the dog there, and the elephant plays the timpani at
  the back, 4.3). Two foxes play flutes.
- The players sit on yellow chairs behind black music stands.

The polished reference images [`reference/mockup.png`](../reference/mockup.png) and
[`reference/scene.png`](../reference/scene.png) (1280 × 720 px) replace `orchestra.webp` as the
target of the look. The user added them on 2026-10-06 and asked for a result that is as close
to them as possible. Where they differ from `orchestra.webp` or from the prototype of 2.8, they
win.

- `mockup.png` shows the app during play: the title in a serif font at the top left, the open
  panel with the demos and the seats at the right, and the bar at the bottom. The navigation
  menu at the top is out of scope.
- `scene.png` shows nine views of the scene: the default view from the front, the view from
  behind the conductor, two side views, four close shots, and a high wide view.
- The scene stands in a dark concert hall with warm lights out of focus. A visible beam of
  light falls on the stage from above. The floor of the stage is glossy walnut.
- The close shots have a shallow depth of field.

The reference image [`reference/lowpoly-animals.png`](../reference/lowpoly-animals.png)
(1588 × 986 px) shows how well-made low-poly animals look. The user added it on 2026-10-07 and
said that our animals have bad polygons, and that their lower bodies look too human: the legs
are too long and too thick, and they have no animal traits. It wins over the other references
for the forms and the facets of the animals.

- The facets are large, flat, and clean, and they follow the form of each animal.
- Each species keeps its own anatomy: the rabbits sit on large haunches, and their thin lower
  legs hang to long flat hind feet on the floor. The foxes, the cats, and the dogs sit on their
  haunches, and the bears, the pandas, the hippos, and the elephant have short, heavy legs. Only
  the meerkat of `lowpoly-animals.png` folds its legs.
- The legs are short and animal-shaped, and the paws are small. The tails show.

The reference image [`reference/orchestra-latest.png`](../reference/orchestra-latest.png)
(1762 × 1240 px) is the newest target. The user added it on 2026-10-07. It shows our own cast
in the low-poly style of `lowpoly-animals.png`: the polar bear at the piano, the penguin choir on
risers behind the contrabasses, and the logo and the title of the app. Where it differs from
the other references, it wins.

- The camera looks down from higher than in `mockup.png`, so the whole stage shows.
- The stage has cut corners and a raised edge, and the podium has cut corners too.
- One warm spotlight from above lights the conductor and the middle of the orchestra.

The reference image [`reference/orchestra-side.png`](../reference/orchestra-side.png)
(2000 × 1271 px) shows the same scene as `orchestra-latest.png` from a different angle: a view
from the front left, with the conductor and its stand at the right. The user added it on
2026-10-07. Use it with `orchestra-latest.png` to read the forms of the animals from a second
side.

- The penguin choir stands on wide risers at the left back. The singers hold black folders and
  open their beaks.
- The conductor stands on a podium with cut corners, behind a stand with an open score.
- The hippos stand at their contrabasses, and the elephant stands behind the timpani.

The reference image [`reference/fox-views.png`](../reference/fox-views.png) (2494 × 1354 px)
shows the red fox of the violins from the front, the side, and the back, on a chair. The user
added it on 2026-10-07 for the fox model. It wins for the fox.

- The head is round with a short pointed muzzle, large ears with dark tips, large brown eyes,
  and a white muzzle, cheeks, and chest.
- The body sits upright, with round haunches on the seat and dark brown lower legs and paws.
- The forearms and the hands are dark brown, and the bushy tail with a white tip lies on the
  seat beside the body.

The reference image [`reference/rabbit-views.png`](../reference/rabbit-views.png) (1280 × 720 px)
shows the white rabbit of the violins from the front, the side, and the back, on a chair. The
user added it on 2026-10-07 for the rabbit model. It wins for the rabbit. Its sheet gives about
1,150 triangles for the rabbit.

- The head is round and soft, with a short muzzle, large dark eyes with a light, a small pink
  nose, and long upright ears with pink insides.
- The body is upright and slim at the chest, with round haunches on the seat, and the lower legs
  hang to long feet on the floor.
- A round puff tail sits low on the back, above the seat.

The reference image [`reference/dog-views.png`](../reference/dog-views.png) (1280 × 720 px)
shows the dog of the cellos from the front, the side, and the back, on a chair, with a scale in
meters. The user added it on 2026-10-07 for the dog model. It wins for the dog.

- The dog is a golden retriever: one golden color with no cap or patches, a broad head with a
  broad muzzle, a black nose, dark eyes, and soft hanging ears.
- The fur is long at the chest, the backs of the legs, and the tail, which hangs behind the
  chair as a feathered plume.
- The scale gives the seated dog about 1.6 m to the top of the head. The seat is about 0.45 m
  high, and the paws are large and rest on the floor.

The reference image [`reference/polar-bear-views.png`](../reference/polar-bear-views.png)
(1280 × 720 px) shows the polar bear at the grand piano from the front, the side, and the back,
with close views of the head, a paw on the keys, and a foot pad. The user added it on
2026-10-07 for the polar bear and the piano. It wins for both.

- The bear is large and heavy: a small round head with small round ears, small black eyes, a
  black nose on a long muzzle, a thick neck, and a round back. The seated bear is about 1.8 m
  high.
- The paws are wide, with black claws that rest on the keys. The foot pads are black.
- The grand piano is black and glossy, with gold accents, a lid raised high on its prop, and a
  padded black bench.

The reference image [`reference/animals.webp`](../reference/animals.webp) (1024 × 1024 px) shows the
front, side, and back views of the animals: rabbits and foxes with a violin and with a clarinet,
the bear on the podium, a gray animal with a clarinet, and a gray animal with a cello. The user
added it on 2026-10-05 and asked for the same results. It sets the shapes, the proportions, and
the colors of the animals (4.3, 4.5). Where it differs from `orchestra.webp`, it wins.
