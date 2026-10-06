// Prints the facts of each MIDI file with the real pipeline of the app.
// Usage: node analyze.ts [--pcm] <file.mid>... (run pnpm dev or the split first, for public/sf/index.json)
import { readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..', '..', '..');
const { parseMidi } = await import(`${ROOT}/src/midi/parse.ts`);
const { buildScore } = await import(`${ROOT}/src/score/score.ts`);
const { layoutScene } = await import(`${ROOT}/src/models/layout-scene.ts`);
const { resolvePresetFiles } = await import(`${ROOT}/src/audio/preset-index.ts`);
const { testBanks } = await import(`${ROOT}/src/audio/test-banks.ts`);

const index = JSON.parse(await readFile(`${ROOT}/public/sf/index.json`, 'utf8'));
const pcm = process.argv.includes('--pcm');
const files = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));

function time(sec: number): string {
  const s = Math.floor(sec + 0.001);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

for (const path of files) {
  const bytes = new Uint8Array(await readFile(path));
  const parsed = parseMidi(bytes);
  if (!parsed.ok) {
    console.log(`## ${basename(path)}: refused ${parsed.error}`);
    continue;
  }
  const result = buildScore(bytes, 'auto');
  if (!result.ok) {
    console.log(`## ${basename(path)}: score refused ${result.error}`);
    continue;
  }
  const score = result.score;
  const ports = [
    ...new Set(
      parsed.file.tracks
        .filter((t: any) => t.events.some((e: any) => e.type === 'channel'))
        .map((t: any) => t.port),
    ),
  ].toSorted((a: number, b: number) => a - b);
  const players = score.seats.reduce((sum: number, seat: any) => sum + seat.playerCount, 0);
  const layout = layoutScene(score);
  const presetFiles = resolvePresetFiles(index, score.presets);
  const download = presetFiles.reduce((sum: number, entry: any) => sum + entry.size, 0);
  let pcmText = '';
  if (pcm) {
    const banks = await testBanks(score.presets);
    pcmText = `, PCM ${(banks.reduce((s: number, b: any) => s + b.data.byteLength, 0) / 1e6).toFixed(1)} MB`;
  }
  console.log(
    `## ${basename(path)}: ${bytes.length} B, ${time(score.durationSec)} (${score.durationSec.toFixed(3)} s), ` +
      `${parsed.file.tracks.length} tracks, ${players} players, orchestral ${score.orchestral}, ` +
      `name '${score.sequenceName}', stage ${layout.stageSide.toFixed(2)} m, risers ${layout.risers.length}, ` +
      `${score.notes.length} notes, ${score.synthEvents.length} events, beats ${score.beats.length}`,
  );
  console.log(
    `   presets ${score.presets.length} -> ${presetFiles.length} files, ${(download / 1e6).toFixed(2)} MB` +
      pcmText +
      `: ${presetFiles.map((e: any) => `${e.bank}:${e.program}`).join(' ')}`,
  );
  // The tracks that feed each synth channel.
  const trackOf = new Map<number, Set<string>>();
  parsed.file.tracks.forEach((track: any, t: number) => {
    const portIndex = ports.indexOf(track.port);
    for (const e of track.events) {
      if (e.type === 'channel' && e.kind === 0x90 && e.data2 > 0) {
        const key = portIndex * 16 + e.channel;
        const set = trackOf.get(key) ?? new Set<string>();
        set.add(`${t}:${track.name}`);
        trackOf.set(key, set);
      }
    }
  });
  score.seats.forEach((seat: any, i: number) => {
    const notes = score.notes.filter((n: any) => n.seatIndex === i).length;
    const src = seat.sources.map((s: any) => s.port * 16 + s.channel);
    const tracks = [...new Set(src.flatMap((k: number) => [...(trackOf.get(k) ?? [])]))];
    console.log(
      `   ${String(i).padStart(2)} ${seat.section.padEnd(10)} x${seat.playerCount} ` +
        `prog [${seat.programs.join(',')}] kits [${seat.kits.join(',')}] ch [${seat.sources
          .map((s: any) => `${s.port}/${s.channel + 1}`)
          .join(',')}] notes ${notes} <- ${tracks.join(' | ')}`,
    );
  });
}
