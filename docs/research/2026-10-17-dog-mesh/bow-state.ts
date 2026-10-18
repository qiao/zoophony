/**
 * Prints the bow state of the first dog cellist of a demo at song times: the string, the place of
 * the hand on the fingerboard, the bow place, and pizzicato. Usage:
 *
 *     node docs/research/2026-10-17-dog-mesh/bow-state.ts <demo> <time>...
 */
import { demoSceneOf } from '../../../src/pose/test-scene.ts';
import { bowStateAt, createBowState } from '../../../src/pose/strokes.ts';

const [demo, ...times] = process.argv.slice(2);
const scene = await demoSceneOf(`${demo}.mid`);
const index = scene.layout.players.findIndex((p) => p.cast.species === 'dog' && p.cast.instrument === 'cello');
const plan = scene.plan.players[index];
if (plan?.note.family !== 'bowed') throw new Error('no cellist');
const state = createBowState();
for (const t of times) {
  bowStateAt(plan.note.strokes, plan.note.starts, Number(t) - plan.timeOffset, state);
  console.log(`${t} s: string ${state.string}, stop string ${state.stopString}, fingerboard ${state.fingerboard.toFixed(3)}, bow ${state.bow.toFixed(3)}, pizzicato ${state.pizzicato.toFixed(2)}, lift ${state.lift.toFixed(3)}`);
}
