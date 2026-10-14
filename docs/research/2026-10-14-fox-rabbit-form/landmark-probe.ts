/**
 * Measures the red fox and the rabbit of the app of a source tree, standing and on the chair: the
 * seat, the head height H of the holds, the visible head (the top and the chin of the corners of
 * the head bone), the shoulder joints, the head top, the ear tips, and the ratios of the measures
 * of the reference: the visible head over the seated trunk (the seat top to the shoulder joints),
 * and the seat over the visible head. A copy of `docs/research/2026-10-14-animal-size/
 * landmark-probe.ts` with the visible head and the ratios. Usage, from this folder:
 *
 *     node landmark-probe.ts [<root of a source tree>]
 */
const root = process.argv[2] ?? '../../..';
const { buildPlayer } = await import(`${root}/src/models/player.ts`);
const { boneIndex } = await import(`${root}/src/models/rig.ts`);

for (const species of ['fox-red', 'rabbit'] as const) {
  const seatedTops: Record<string, number> = {};
  for (const support of ['stand', 'chair'] as const) {
    const m = buildPlayer(species, 'violin', 4, support);
    const head = boneIndex('head');
    const ears = new Set([boneIndex('earL'), boneIndex('earR')]);
    let top = -Infinity;
    let chin = Infinity;
    let earTop = -Infinity;
    for (let c = 0; c < m.mesh.bones.length; c++) {
      const y = m.mesh.positions[c * 3 + 1] ?? 0;
      const bone = m.mesh.bones[c] ?? -1;
      if (bone === head) {
        top = Math.max(top, y);
        chin = Math.min(chin, y);
      }
      if (ears.has(bone)) {
        earTop = Math.max(earTop, y);
      }
    }
    const at = (b: string): readonly number[] => m.skeleton.positions[boneIndex(b)] ?? [];
    const seat = m.seat?.seatHeight ?? 0;
    const shoulder = at('upperArmL')[1] ?? 0;
    const visible = top - chin;
    seatedTops[support] = top;
    const ratios =
      support === 'chair'
        ? ` trunk ${(shoulder - seat).toFixed(3)} head/trunk ${(visible / (shoulder - seat)).toFixed(3)} seat/head ${(seat / visible).toFixed(3)} seat/H ${(seat / m.body.headHeight).toFixed(3)} seat/trunk ${(seat / (shoulder - seat)).toFixed(3)}`
        : '';
    console.log(
      `${species} ${support}: seat ${seat.toFixed(3)} H ${m.body.headHeight.toFixed(3)} ` +
        `visible head ${visible.toFixed(3)} shoulder ${shoulder.toFixed(3)} headTop ${top.toFixed(3)} ` +
        `earTop ${earTop.toFixed(3)} hips ${(at('hips')[1] ?? 0).toFixed(3)}${ratios}`,
    );
  }
}
