# Options of the badger mesh

`pnpm mesh-options badger scratch/opts/xylophone --size param=1.038 --legs 1 --arms 1,1.1,1.2,1.25 --instrument xylophone --species badger`. Source skull top 1.0000 u, highest point 1.0000 u. The column "Shoulder joints m" is the `app.shoulders` of the config of each variant in `rigs/`.

| Variant | Size | Legs | Arms | Head top m | Top m | Shoulder joints m | Scale m/u | H m | Seat m | Chair m | Reach m | Arm/trunk | Hold reach |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| badger of the working tree | - | - | - | 1.029 | 1.038 | 0.552330 | - | 0.361 | 0.271 | - | 0.516 | - | strikes 88.7% within 5 mm, worst 134.9 mm |
| param-legs1-arms1 | param (1.038 m) | 1 | 1 | 1.038 | 1.038 | 0.596850 | 1.038000 | 0.244 | 0.059 | 0.266 | 0.273 | 0.70 | strikes 0.0% within 5 mm, worst 375.1 mm |
| param-legs1-arms1.1 | param (1.038 m) | 1 | 1.1 | 1.038 | 1.038 | 0.596850 | 1.038000 | 0.244 | 0.059 | 0.266 | 0.297 | 0.76 | strikes 11.3% within 5 mm, worst 351.4 mm |
| param-legs1-arms1.2 | param (1.038 m) | 1 | 1.2 | 1.038 | 1.038 | 0.596850 | 1.038000 | 0.244 | 0.059 | 0.266 | 0.321 | 0.82 | strikes 25.4% within 5 mm, worst 327.7 mm |
| param-legs1-arms1.25 | param (1.038 m) | 1 | 1.25 | 1.038 | 1.038 | 0.596850 | 1.038000 | 0.244 | 0.059 | 0.266 | 0.334 | 0.85 | strikes 29.7% within 5 mm, worst 315.8 mm |
