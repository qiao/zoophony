/**
 * Prints the shots of the plan of one demo: the index, the kind, the start, the seats, and their
 * sections. Usage, from this folder: `node shots-probe.ts [boulanger-matin.mid]`.
 */
import { shotDemos, shotSceneOf } from '../../../src/shots/test-shots.ts';
const demos = await shotDemos();
const want = process.argv[2] ?? 'boulanger-matin.mid';
for (const demo of demos.filter((d) => d.file === want)) {
  const { plan, score } = shotSceneOf(demo.file, demo.bytes);
  for (const [i, s] of plan.shots.entries()) {
    const sections = s.seats.map((k) => score.seats[k]?.section).join(',');
    console.log(i, s.kind, s.startSec.toFixed(2), s.seats.join(','), sections);
  }
}
