# Options of the monkey mesh

`pnpm mesh-options monkey <dir> --size tuft=1.029 --size middle=1.048 --size skull=1.066 --legs 1 --arms 1,1.1,1.2,1.25 --instrument trumpet --species monkey`. Source skull top 1.0000 u, highest point 1.0000 u. The column "Shoulder joints m" is the `app.shoulders` of the config of each variant in `rigs/`.

| Variant | Size | Legs | Arms | Head top m | Top m | Shoulder joints m | Scale m/u | H m | Seat m | Chair m | Reach m | Arm/trunk | Hold reach |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| monkey of the working tree | - | - | - | 1.029 | 1.029 | 0.552330 | - | 0.361 | 0.271 | - | 0.516 | - | spare L 0.083 m, R 0.041 m |
| tuft-legs1-arms1 | tuft (1.029 m) | 1 | 1 | 1.029 | 1.029 | 0.607110 | 1.029000 | 0.293 | 0.127 | 0.188 | 0.287 | 0.79 | spare L -0.086 m, R -0.134 m |
| middle-legs1-arms1 | middle (1.048 m) | 1 | 1 | 1.048 | 1.048 | 0.618320 | 1.048000 | 0.298 | 0.130 | 0.191 | 0.292 | 0.79 | spare L -0.085 m, R -0.134 m |
| skull-legs1-arms1 | skull (1.066 m) | 1 | 1 | 1.066 | 1.066 | 0.628940 | 1.066000 | 0.303 | 0.132 | 0.193 | 0.297 | 0.79 | spare L -0.085 m, R -0.134 m |
| skull-legs1-arms1.1 | skull (1.066 m) | 1 | 1.1 | 1.066 | 1.066 | 0.628940 | 1.066000 | 0.303 | 0.132 | 0.193 | 0.323 | 0.85 | spare L -0.059 m, R -0.108 m |
| skull-legs1-arms1.2 | skull (1.066 m) | 1 | 1.2 | 1.066 | 1.066 | 0.628940 | 1.066000 | 0.303 | 0.132 | 0.193 | 0.349 | 0.92 | spare L -0.033 m, R -0.082 m |
| skull-legs1-arms1.25 | skull (1.066 m) | 1 | 1.25 | 1.066 | 1.066 | 0.628940 | 1.066000 | 0.303 | 0.132 | 0.193 | 0.362 | 0.96 | spare L -0.020 m, R -0.069 m |
