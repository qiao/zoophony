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

The reference image [`reference/animals.webp`](../reference/animals.webp) (1024 × 1024 px) shows the
front, side, and back views of the animals: rabbits and foxes with a violin and with a clarinet,
the bear on the podium, a gray animal with a clarinet, and a gray animal with a cello. The user
added it on 2026-10-05 and asked for the same results. It sets the shapes, the proportions, and
the colors of the animals (4.3, 4.5). Where it differs from `orchestra.webp`, it wins.
