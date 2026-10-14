import { buildPlayer } from '../../../src/models/player.ts';
import { boneIndex } from '../../../src/models/rig.ts';

for (const [species, support] of [['fox-red', 'chair'], ['rabbit', 'chair'], ['cat', 'chair'], ['fox-red', 'stand'], ['rabbit', 'stand']] as const) {
  const m = buildPlayer(species, 'violin', 4, support);
  const head = boneIndex('head');
  const ears = new Set([boneIndex('earL'), boneIndex('earR')]);
  let top = -Infinity, all = -Infinity;
  for (let c = 0; c < m.mesh.bones.length; c++) {
    const y = m.mesh.positions[c * 3 + 1] ?? 0;
    if (m.mesh.bones[c] === head) top = Math.max(top, y);
    if (!ears.has(m.mesh.bones[c] ?? -1)) all = Math.max(all, y); else all = Math.max(all, all);
  }
  let earTop = -Infinity;
  for (let c = 0; c < m.mesh.bones.length; c++) if (ears.has(m.mesh.bones[c] ?? -1)) earTop = Math.max(earTop, m.mesh.positions[c*3+1] ?? 0);
  const p = (b: string) => m.skeleton.positions[boneIndex(b as never)]!;
  console.log(species, support, 'seat', m.seat?.seatHeight.toFixed(3), 'H', m.body.headHeight.toFixed(3), 'shoulder', p('upperArmL')[1].toFixed(3), 'eye', p('eyeL')[1].toFixed(3), 'headTop', top.toFixed(3), 'earTop', earTop.toFixed(3), 'hips', p('hips')[1].toFixed(3), 'z hips', p('hips')[2].toFixed(3));
}
