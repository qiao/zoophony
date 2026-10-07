// Prints the shot plan of each demo file of the worktree (kind, start, subject section).
// Usage: node shots.ts [file name filter]
const W = new URL('../../../../', import.meta.url).pathname.replace(/\/$/u, '');
const { demoShotScenes } = await import(`${W}/src/shots/test-shots.ts`);
const filter = process.argv[2] ?? '';
for (const scene of await demoShotScenes()) {
  if (!scene.file.includes(filter)) {
    continue;
  }
  const counts = new Map<string, number>();
  const rows: string[] = [];
  for (const shot of scene.plan.shots) {
    counts.set(shot.kind, (counts.get(shot.kind) ?? 0) + 1);
    const sections = shot.seats.map((s: number) => scene.score.seats[s]?.section).join('+');
    rows.push(`${shot.startSec.toFixed(1)} ${shot.kind} ${sections}`);
  }
  console.log(`## ${scene.file}: ${scene.plan.shots.length} shots`, Object.fromEntries(counts));
  console.log('  ' + rows.join(' | '));
}
