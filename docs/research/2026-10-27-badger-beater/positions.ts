// Prints the place of each player of beethoven-9 and of the percussion test score, for a tree root.
// Usage: node docs/research/2026-10-27-badger-beater/positions.ts <root of a tree>
const root = process.argv[2];
const { sceneOf, demoSceneOf } = await import(`${root}/src/pose/test-scene.ts`);
const { percussionTestFile } = await import(`${root}/tools/probe-demos.ts`);
const out: string[] = [];
for (const [name, scene] of [['beethoven-9', await demoSceneOf('beethoven-9.mid')], ['percussion-test', sceneOf(percussionTestFile())]] as const) {
  for (const [i, p] of scene.layout.players.entries()) {
    out.push(`${name} ${i} ${p.cast.species}/${p.cast.instrument} ${p.position.map((v: number) => v.toFixed(4)).join(',')} ${p.facing.toFixed(4)}`);
  }
  out.push(`${name} conductor ${JSON.stringify(scene.layout.conductor?.position ?? null)}`);
}
console.log(out.join('\n'));
