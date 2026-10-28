# The first frame measure: the rim light as a spotlight of three.js

pnpm frame-compare main HEAD no-beam.patch three-beams.patch --runs 2 on a07d9345, stopped after
the second run of HEAD. item1 = main (93700a1e), item2 = HEAD, item3 = no rim light and no
beam, item4 = three beams. The rows: main thread and GPU (WebGL frames in the Metal trace),
count, p50, p95, p99.

## item1-run1
Frame rate: 60.0 fps with the cap, 131.2 fps with no cap.
| Main thread: tasks of each frame (Chrome trace, 60 fps) | 599 | 3.81 | 5.05 | 6.04 | 60.4% | fail |
| GPU: WebGL frames in the Metal trace (no frame cap) | 388 | 7.91 | 8.05 | 8.21 | 0.0% | fail |

## item1-run2
Frame rate: 60.0 fps with the cap, 130.3 fps with no cap.
| Main thread: tasks of each frame (Chrome trace, 60 fps) | 599 | 3.85 | 4.99 | 5.92 | 63.3% | fail |
| GPU: WebGL frames in the Metal trace (no frame cap) | 395 | 7.94 | 8.15 | 12.12 | 0.0% | fail |

## item2-run1
Frame rate: 60.0 fps with the cap, 126.8 fps with no cap.
| Main thread: tasks of each frame (Chrome trace, 60 fps) | 600 | 3.92 | 5.00 | 5.80 | 59.8% | fail |
| GPU: WebGL frames in the Metal trace (no frame cap) | 372 | 8.18 | 8.37 | 8.60 | 0.0% | fail |

## item2-run2
Frame rate: 60.0 fps with the cap, 125.1 fps with no cap.
| Main thread: tasks of each frame (Chrome trace, 60 fps) | 600 | 3.95 | 5.03 | 6.18 | 55.0% | fail |
| GPU: WebGL frames in the Metal trace (no frame cap) | 357 | 8.25 | 8.44 | 8.55 | 0.0% | fail |

## item3-run1
Frame rate: 60.0 fps with the cap, 133.3 fps with no cap.
| Main thread: tasks of each frame (Chrome trace, 60 fps) | 599 | 3.88 | 4.88 | 5.84 | 62.6% | fail |
| GPU: WebGL frames in the Metal trace (no frame cap) | 385 | 7.53 | 7.72 | 11.13 | 0.0% | fail |

## item4-run1
Frame rate: 60.0 fps with the cap, 91.4 fps with no cap.
| Main thread: tasks of each frame (Chrome trace, 60 fps) | 599 | 3.95 | 5.02 | 5.94 | 56.8% | fail |
| GPU: WebGL frames in the Metal trace (no frame cap) | 250 | 12.39 | 12.53 | 20.54 | 0.0% | fail |

