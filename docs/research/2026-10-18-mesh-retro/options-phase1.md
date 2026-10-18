# Options of the panda mesh

`pnpm mesh-options panda <dir> --size main=1.3 --size bear=1.483 --size fox=1.57 --legs 1,2,1.5 --arms 1.497,1.704,1.987,2.753 --instrument trombone`. Source skull top 0.9860 u, highest point 1.0000 u. The column "Shoulder joints m" is the `app.shoulders` of the config of each variant in `rigs/`.

| Variant | Size | Legs | Arms | Head top m | Top m | Shoulder joints m | Scale m/u | H m | Seat m | Chair m | Reach m | Arm/trunk | Hold reach |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| panda of the working tree | - | - | - | 1.300 | 1.346 | 0.697680 | - | 0.456 | 0.342 | - | 0.652 | - | slide 0.170 m |
| main-legs1-arms1 | main (1.3 m) | 1 | 1 | 1.300 | 1.318 | 0.802929 | 1.318438 | 0.410 | 0.103 | 0.264 | 0.350 | 0.63 | slide 0.000 m |
| bear-legs1-arms1 | bear (1.483 m) | 1 | 1 | 1.483 | 1.504 | 0.915957 | 1.504034 | 0.468 | 0.117 | 0.295 | 0.400 | 0.63 | slide 0.000 m |
| fox-legs1-arms1 | fox (1.57 m) | 1 | 1 | 1.570 | 1.592 | 0.969691 | 1.592268 | 0.496 | 0.124 | 0.309 | 0.423 | 0.63 | slide 0.000 m |
| main-legs2-arms1 | main (1.3 m) | 2 | 1 | 1.300 | 1.317 | 0.848699 | 1.197037 | 0.373 | 0.183 | 0.244 | 0.318 | 0.63 | slide 0.000 m |
| bear-legs2-arms1 | bear (1.483 m) | 2 | 1 | 1.483 | 1.502 | 0.968170 | 1.365543 | 0.425 | 0.208 | 0.272 | 0.363 | 0.63 | slide 0.000 m |
| fox-legs2-arms1 | fox (1.57 m) | 2 | 1 | 1.570 | 1.590 | 1.024967 | 1.445652 | 0.450 | 0.221 | 0.285 | 0.384 | 0.63 | slide 0.000 m |
| main-legs1.5-arms1 | main (1.3 m) | 1.5 | 1 | 1.300 | 1.318 | 0.826919 | 1.254808 | 0.391 | 0.149 | 0.253 | 0.333 | 0.63 | slide 0.000 m |
| bear-legs1.5-arms1 | bear (1.483 m) | 1.5 | 1 | 1.483 | 1.503 | 0.943323 | 1.431447 | 0.446 | 0.170 | 0.282 | 0.380 | 0.63 | slide 0.000 m |
| fox-legs1.5-arms1 | fox (1.57 m) | 1.5 | 1 | 1.570 | 1.591 | 0.998663 | 1.515422 | 0.472 | 0.180 | 0.296 | 0.403 | 0.63 | slide 0.000 m |
| fox-legs1.5-arms1.497 | fox (1.57 m) | 1.5 | 1.497 | 1.570 | 1.591 | 0.998663 | 1.515422 | 0.472 | 0.180 | 0.296 | 0.578 | 0.91 | slide 0.000 m |
| fox-legs1.5-arms1.704 | fox (1.57 m) | 1.5 | 1.704 | 1.570 | 1.591 | 0.998663 | 1.515422 | 0.472 | 0.180 | 0.296 | 0.651 | 1.02 | slide 0.050 m |
| fox-legs1.5-arms1.987 | fox (1.57 m) | 1.5 | 1.987 | 1.570 | 1.591 | 0.998663 | 1.515422 | 0.472 | 0.180 | 0.296 | 0.750 | 1.18 | slide 0.165 m |
| fox-legs1.5-arms2.753 | fox (1.57 m) | 1.5 | 2.753 | 1.570 | 1.591 | 0.998663 | 1.515422 | 0.472 | 0.180 | 0.296 | 1.020 | 1.61 | slide 0.450 m |
