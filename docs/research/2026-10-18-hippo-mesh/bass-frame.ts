/**
 * Prints the frame of the contrabass of the hippo in its bind place: the parent of the
 * instrument bone, the pivot, the end pin tip, the contact point, the nut, and the axis.
 * Usage: node docs/research/2026-10-18-hippo-mesh/bass-frame.ts
 */
import { buildPlayer } from '../../../src/models/player.ts';
import { boneIndex } from '../../../src/models/rig.ts';
import { bowedRig, holdOf } from '../../../src/pose/bowed-rig.ts';

const model = buildPlayer('hippo', 'contrabass', 4, 'high-stool');
const rig = bowedRig(model, 'contrabass', holdOf('hippo', 'contrabass'));
const f = (v: readonly number[]): string => v.map((x) => x.toFixed(3)).join(', ');
console.log('parent', rig.parent === boneIndex('chest') ? 'chest' : 'root', 'pivot', f(rig.pivot));
console.log('nut', f(rig.nut), 'contact', f(rig.contact), 'neck', f(rig.neck));
console.log('playShift (m)', f(rig.playShift), 'restRotation', f(rig.restRotation));
console.log('pieces', model.pieces.length);
