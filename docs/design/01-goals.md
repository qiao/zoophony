# 1. Goals and budgets

- The app is a static site on GitHub Pages. It has no server.
- Desktop browsers come first. Phones must play the music, with lower visual quality.
- The scene renders at 60 fps on a laptop with an integrated GPU. Design 9.7 gives the frame
  time limit and its check.
- The first download is less than 1 MB after gzip. Section 7.2 defines what the check counts.
- The app loads the instrument samples after the first frame. It loads only the presets that the
  file uses.
- The triangle budget of a studio body allows round forms, such as a round tube for each arm
  (4.4). The first download and the frame time stay the limits.
- The code license is Apache-2.0. The animal models are under CC BY-NC 4.0 (the license
  section of `README.md`).

The reference image [`reference/orchestra.webp`](../reference/orchestra.webp) shows the target scene.
The user owns the rights to it. Look at it before any visual work. Section 4.5 gives the rules
of the values that come from it, and names the code that holds them. The reference images win
over the values in the code: these values describe the current models, and they are no targets.

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

On 2026-10-09, the user reverted the bodies of the animals to their state of 2026-10-06 18:58:
the parametric bodies with flat faces, their skeletons, and their colors (4.3 to 4.5,
`docs/decisions/2026-10-09-body-revert.md`). These bodies are the start point. The images below
stay the target of the forms, the facets, the skeletons, and the colors of the animals (user
decision of 2026-10-10). Each change of a body moves it toward them. On 2026-10-10, the foxes, the
rabbit, and the bear got bodies of their own, and on 2026-10-11 the user reverted all of them to
the parametric bodies (`docs/decisions/2026-10-11-body-revert.md`).

The reference image [`reference/lowpoly-animals.png`](../reference/lowpoly-animals.png)
(1588 × 986 px) shows how well-made low-poly animals look. The user added it on 2026-10-07 and
said that our animals have bad polygons, and that their lower bodies look too human: the legs
are too long and too thick, and they have no animal traits. It wins over the other references
for the forms and the facets of the animals.

- The facets are large, flat, and clean, and they follow the form of each animal.
- Each species keeps its own anatomy: the rabbits sit on large haunches, and their lower legs,
  narrower than the haunches, hang to long flat hind feet on the floor. The foxes, the cats, and the dogs sit on their
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
  open their beaks. The mesh of the user is the target of the form of the penguin, and the two
  images win for its colors and its folder: the white front, the black back, and the folder in
  front of the belly. The crown has the head top of the egg penguin, by the rule of the user for
  the mouse (`docs/decisions/2026-10-21-mesh-penguin.md`).
- The conductor stands on a podium with cut corners, behind a stand with an open score.
- The hippos stand at their contrabasses, and the elephant stands behind the timpani.
- No reference image shows a mouse or an oboe. The mesh of the user is the target of the mouse,
  and the mouse has the size of the parametric mouse that the user chose
  (`docs/decisions/2026-10-19-mouse-size.md`).
- No reference image shows a beaver or a bassoon. The mesh of the user is the target of the
  beaver, and the beaver has the size of the parametric beaver, by the rule that the user chose
  for the mouse (`docs/decisions/2026-10-19-mesh-beaver.md`).
- No reference image shows a monkey. The mesh of the user is the target of the monkey, and
  the monkey took the size of the parametric monkey, by the rule of the user for the mouse. Then
  the user made it 1.1 times as large (`docs/decisions/2026-10-20-mesh-monkey.md`).
- No reference image shows a pig. The mesh of the user is the target of the pig, and the pig has
  the size of the parametric pig, by the rule of the user for the mouse
  (`docs/decisions/2026-10-19-mesh-pig.md`).
- No reference image shows a rhino or a tuba. The mesh of the user is the target of the rhino,
  and its skull top has the head top of the parametric rhino, by the rule of the user for the
  mouse. The user asked that the rhino stands (`docs/decisions/2026-10-21-mesh-rhino.md`).
- No reference image shows a deer or a harp. The mesh of the user is the target of the deer, and
  the deer took the size of the parametric deer, by the rule of the user for the mouse. Then the
  user made it 1.2 times as large (`docs/decisions/2026-10-21-mesh-deer.md`).
- No reference image shows a badger. The mesh of the user is the target of the badger, and the
  badger has the size of the parametric badger, by the rule of the user for the mouse. The mesh
  wins over `badger-turnaround.png`, whose fur and stripes are lighter
  (`docs/decisions/2026-10-20-mesh-badger.md`). The bass drum stands in front of the badger, as a
  real drum stands in front of its player. Thus from the front, the drum hides the right arm and
  the beater, and the side views and the stage camera show them.
- The wolf sits on a chair at the right, with the clarinet, beside the dog cellists. The mesh of
  the user is the target of the form of the wolf, and these two images gave its size against the
  dogs (`docs/decisions/2026-10-20-mesh-wolf.md`). The user then made the body of the wolf 0.9
  times as high and 1.2 times as wide, with the head at its size, so the seated wolf is about as
  high as the dogs, and this request wins over the images
  (`docs/decisions/2026-10-20-wolf-shape.md`). Then the user gave the wolf a head of the size of
  the red fox, with a smaller body, and the wolf keeps its standing height
  (`docs/decisions/2026-10-20-wolf-face.md`).

The reference image [`reference/fox-views.png`](../reference/fox-views.png) (2494 × 1354 px)
shows the red fox of the violins from the front, the side, and the back, on a chair. The user
added it on 2026-10-07 for the fox model. It wins for the fox.

- The head is round with a short pointed muzzle, large ears with dark tips, large brown eyes,
  and a white muzzle, cheeks, and chest.
- The body sits upright, with round haunches on the seat and dark brown lower legs and paws.
- The forearms and the hands are dark brown, and the bushy tail with a white tip lies on the
  seat beside the body.
- The feet hang 0.07 m to 0.09 m above the floor. On the stage, the feet rest on the floor, as in
  `orchestra-latest.png` and design 4.5.

The reference image [`reference/rabbit-views.png`](../reference/rabbit-views.png) (1280 × 720 px)
shows the white rabbit of the violins from the front, the side, and the back, on a chair. The
user added it on 2026-10-07 for the rabbit model. It wins for the rabbit, except for the form
and the colors of the mesh of the user of 2026-10-13 (the last item below). Its sheet gives
about 1,150 triangles for the rabbit.

- The head is round and soft, with a short muzzle, large dark eyes with a light, a small pink
  nose, and long upright ears with pink insides.
- The body is upright and slim at the chest, with round haunches on the seat, and the lower legs
  hang to long feet on the floor.
- A round puff tail sits low on the back, above the seat.
- On 2026-10-10, a rigged rabbit from the GLB file of the user took the form of this image: the
  legs, the arms, the haunches, the head, the dark eyes, and the round tail. The user reverted
  the rabbit to the parametric body on 2026-10-11 (4.4).
- On 2026-10-13, the user gave the mesh `assets/models/rabbit/rabbit-4.glb` for the rabbit
  violinist, in place of the studio rabbit of the same day (4.4,
  `docs/decisions/2026-10-13-mesh-rabbit.md`). The mesh of the user is the target of the form
  and the colors of the rabbit, and it wins over this image where they differ. The rig gives
  it longer arms, as the user chose. The violin pose of the rabbit follows a real violinist
  (5.3).

The reference image [`reference/cat-views.png`](../reference/cat-views.png) (1536 × 1024 px)
shows the gray cat of the violas standing, from the front, the left side, the back, and three
quarters. The user added it on 2026-10-16 for the cat model. It wins for the cat, except for the
form of the mesh of the user of the same day (the last item below).

- The head is large, with large pointed ears with pink insides, large green eyes, a small pink
  nose, white whiskers, and a white muzzle and chin.
- The fur is cool gray, with a cream belly and chest, and white paws.
- The long tail curls up behind the body when the cat stands.
- On 2026-10-16, the user gave the mesh `assets/models/cat/cat.glb` for the viola cats
  (`docs/decisions/2026-10-16-mesh-cat.md`). The mesh of the user is the target of the form of
  the cat, and it wins over this image where they differ. The app gives it the pea eyes of the
  app, the size, the reach, and the leg factor of the red fox, and a gray fur that keeps its
  look under the warm stage light (4.4). A seated cat curls its tail on the seat
  (`docs/decisions/2026-10-16-cat-seat.md`).

The reference image [`reference/dog-views.png`](../reference/dog-views.png) (1280 × 720 px)
shows the dog of the cellos from the front, the side, and the back, on a chair, with a scale in
meters. The user added it on 2026-10-07 for the dog model. It wins for the dog.

- The dog is a golden retriever: one golden color with no cap or patches, a broad head with a
  broad muzzle, a black nose, dark eyes, and soft hanging ears.
- The fur is long at the chest, the backs of the legs, and the tail, which hangs behind the
  chair as a feathered plume.
- The scale gives the seated dog about 1.6 m to the top of the head. The seat is about 0.45 m
  high, and the paws are large and rest on the floor.
- On 2026-10-17, the user gave the mesh `assets/models/dog/dog.glb` for the cello dogs
  (`docs/decisions/2026-10-17-mesh-dog.md`). The mesh of the user is the target of the form and
  the colors of the dog, and it wins over this image where they differ: the mesh is a beagle with
  brown fur, a white muzzle, chest, and paws, and long hanging ears. The app gives it the pea eyes
  of the app, the head height of the red fox, the arms of the cello reach, longer legs, and knees
  spread around the lower bout of the cello (4.4).

The reference image [`reference/polar-bear-views.png`](../reference/polar-bear-views.png)
(1280 × 720 px) shows the polar bear at the grand piano from the front, the side, and the back,
with close views of the head, a paw on the keys, and a foot pad. The user added it on
2026-10-07 for the polar bear and the piano. It wins for both.

- The bear is large and heavy: a small round head with small round ears, small black eyes, a
  black nose on a long muzzle, a thick neck, and a round back. Against keys of a real piano
  (0.70 m), the side view puts the head top of the seated bear at 1.40 m and the shoulder joints
  at about 1.0 m. The label "180 cm" of the image ends above the head top, so it does not give
  the size (`docs/decisions/2026-10-24-polar-bear-seat.md`). The body keeps the part ratios of
  the mesh of the user, with the legs of the mesh, because longer legs made the bear look like a
  human and made the head and the trunk look small (user, 2026-10-28 and 2026-10-29). Thus the
  bear sits on a lower bench than in the image (the newest request wins over the bench height
  of the image), with the thighs a little down, the shins
  vertical, and the feet flat on the floor. The body is a little larger than the side view
  gives, so that the bench that fits its legs holds them in a natural seat. The piano is larger
  than a real piano, so that the elbows stand a little above the keys
  (`docs/decisions/2026-10-29-polar-ratio.md`).
- The paws are wide, with black claws that rest on the keys. The foot pads are black.
- The grand piano is black and glossy, with gold accents, a lid raised high on its prop, and a
  padded black bench on an apron and four tapered legs with gold feet. The whole haunch of the
  bear sits on the bench (`docs/decisions/2026-10-27-polar-bench.md`).

The reference image [`reference/bear-views.png`](../reference/bear-views.png) (1536 × 1024 px)
shows the bear conductor from the front, the side, and the back, on a wooden podium. The user
added it on 2026-10-10 for the conductor. It wins for the bear.

- The bear is large and heavy, with a pear-shaped body: the head is small, the body is widest at
  the belly and the hips, and the legs are short and thick, with large flat feet.
- The fur is one warm brown, with facets that catch the light. The muzzle is light tan, with a
  black nose. The eyes are small and dark, with a light, and the round ears stand on the top
  corners of the head.
- The arms are thick. Both paws are up at the height of the head, with the elbows out, and the
  paws have dark claws. A small round tail sits low on the back.
- The sheet has a baton in each paw. The user decided on 2026-10-10 that the conductor holds one
  baton, in the right paw.

The turnaround sheets `reference/<species>-turnaround.png` (1536 × 1024 px) show one species
each, standing, from the front, the side, the back, and three quarters. The user added them on
2026-10-20 for the wolf, the badger, the pig, the beaver, the mouse, the elephant, the hippo, the
panda, the fox, the rabbit, the polar bear, and the dog (a beagle). The sheets of the cat and the
bear are `cat-views.png` and `bear-views.png`.

- A sheet is the target of the form, the face, and the colors of its species. Where it differs
  from an older sheet of the same species, it wins. The mesh of the user wins over the sheet, as
  the wolf mesh wins over `wolf-turnaround.png` (`docs/decisions/2026-10-20-mesh-wolf.md`).
- A sheet has no scale. The size of each species comes from the rules above and from design 4.4.
- On 2026-10-10, a rigged bear from the GLB file of the user had a skin from the texture of the
  file, with the brown of this image, and the round tail of this image. The user reverted the
  bear to the parametric body on 2026-10-11 (4.4).

The reference image [`reference/animals.webp`](../reference/animals.webp) (1024 × 1024 px) shows the
front, side, and back views of the animals: rabbits and foxes with a violin and with a clarinet,
the bear on the podium, a gray animal with a clarinet, and a gray animal with a cello. The user
added it on 2026-10-05 and asked for the same results. It sets the shapes, the proportions, and
the colors of the animals (4.3, 4.5). Where it differs from `orchestra.webp`, it wins.
