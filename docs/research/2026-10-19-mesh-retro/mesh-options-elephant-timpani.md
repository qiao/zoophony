# Options of the elephant mesh

`pnpm mesh-options elephant <dir> --size ref=1.92 --legs 1 --arms 0.8,1.3 --instrument timpani --species elephant`. Source skull top 0.9958 u, highest point 1.0000 u. The column "Shoulder joints m" is the `app.shoulders` of the config of each variant in `rigs/`.

| Variant | Size | Legs | Arms | Head top m | Top m | Shoulder joints m | Scale m/u | H m | Seat m | Chair m | Reach m | Arm/trunk | Hold reach |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| elephant of the working tree | - | - | - | 1.920 | 1.928 | 1.156983 | - | 0.598 | 0.340 | - | 0.451 | - | strikes 100.0% within 5 mm, worst 0.0 mm |
| ref-legs1-arms1 | ref (1.92 m) | 1 | 1 | 1.920 | 1.928 | 1.156833 | 1.928055 | 0.598 | 0.340 | 0.308 | 0.451 | 0.57 | strikes 100.0% within 5 mm, worst 0.0 mm |
| ref-legs1-arms0.8 | ref (1.92 m) | 1 | 0.8 | 1.920 | 1.928 | 1.156833 | 1.928055 | 0.598 | 0.340 | 0.308 | 0.369 | 0.46 | strikes 10.3% within 5 mm, worst 79.5 mm |
| ref-legs1-arms1.3 | ref (1.92 m) | 1 | 1.3 | 1.920 | 1.928 | 1.156833 | 1.928055 | 0.598 | 0.340 | 0.308 | 0.575 | 0.73 | strikes 100.0% within 5 mm, worst 0.0 mm |
