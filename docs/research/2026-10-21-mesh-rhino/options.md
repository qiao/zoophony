# Options of the rhino mesh

`pnpm mesh-options rhino <dir> --size small=1.418 --size skull=1.462 --size large=1.506 --legs 1 --arms 1,1.25,1.5 --instrument tuba --species rhino`. Source skull top 0.9415 u, highest point 1.0000 u. The column "Shoulder joints m" is the `app.shoulders` of the config of each variant in `rigs/`.

| Variant | Size | Legs | Arms | Head top m | Top m | Shoulder joints m | Scale m/u | H m | Seat m | Chair m | Reach m | Arm/trunk | Hold reach |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| rhino of the working tree | - | - | - | 1.462 | 1.462 | 0.784890 | - | 0.513 | 0.385 | - | 0.734 | - | spare L 0.199 m, R 0.193 m |
| small-legs1-arms1 | small (1.418 m) | 1 | 1 | 1.418 | 1.506 | 0.866023 | 1.506126 | 0.407 | 0.151 | 0.342 | 0.418 | 0.74 | spare L -0.290 m, R -0.304 m |
| skull-legs1-arms1 | skull (1.462 m) | 1 | 1 | 1.462 | 1.553 | 0.892895 | 1.552861 | 0.420 | 0.155 | 0.351 | 0.431 | 0.74 | spare L -0.295 m, R -0.311 m |
| large-legs1-arms1 | large (1.506 m) | 1 | 1 | 1.506 | 1.600 | 0.919767 | 1.599595 | 0.432 | 0.160 | 0.360 | 0.444 | 0.74 | spare L -0.300 m, R -0.318 m |
| large-legs1-arms1.25 | large (1.506 m) | 1 | 1.25 | 1.506 | 1.600 | 0.919767 | 1.599595 | 0.432 | 0.160 | 0.360 | 0.544 | 0.90 | spare L -0.200 m, R -0.218 m |
| large-legs1-arms1.5 | large (1.506 m) | 1 | 1.5 | 1.506 | 1.600 | 0.919767 | 1.599595 | 0.432 | 0.160 | 0.360 | 0.644 | 1.07 | spare L -0.100 m, R -0.118 m |
