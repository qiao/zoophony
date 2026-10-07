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

The reference image [`reference/animals.webp`](../reference/animals.webp) (1024 × 1024 px) shows the
front, side, and back views of the animals: rabbits and foxes with a violin and with a clarinet,
the bear on the podium, a gray animal with a clarinet, and a gray animal with a cello. The user
added it on 2026-10-05 and asked for the same results. It sets the shapes, the proportions, and
the colors of the animals (4.3, 4.5). Where it differs from `orchestra.webp`, it wins.
