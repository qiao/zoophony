// Prints the index and the time offset of the bass drummer of beethoven-9.
// Usage: node docs/research/2026-10-27-badger-beater/offset.ts
import { demoSceneOf } from '../../../src/pose/test-scene.ts';
const scene = await demoSceneOf('beethoven-9.mid');
const i = scene.layout.players.findIndex((p) => p.cast.species === 'badger' && p.cast.instrument === 'bass-drum');
console.log(i, scene.plan.players[i]?.timeOffset);
