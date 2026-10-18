# Options of the panda mesh

`pnpm mesh-options panda <dir> --size fox=1.57 --legs 1.5 --arms 1.497 --instrument trombone`. Source skull top 0.9860 u, highest point 1.0000 u. The column "Shoulder joints m" is the `app.shoulders` of the config of each variant in `rigs/`.

| Variant | Size | Legs | Arms | Head top m | Top m | Shoulder joints m | Scale m/u | H m | Seat m | Chair m | Reach m | Arm/trunk | Hold reach |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| panda of the working tree | - | - | - | 1.570 | 1.591 | 0.998676 | - | 0.472 | 0.278 | - | 0.578 | - | slide 0.155 m |
| fox-legs1.5-arms1 | fox (1.57 m) | 1.5 | 1 | 1.570 | 1.591 | 0.998663 | 1.515422 | 0.472 | 0.278 | 0.212 | 0.403 | 0.63 | slide 0.000 m |
| fox-legs1.5-arms1.497 | fox (1.57 m) | 1.5 | 1.497 | 1.570 | 1.591 | 0.998663 | 1.515422 | 0.472 | 0.278 | 0.212 | 0.578 | 0.91 | slide 0.155 m |
