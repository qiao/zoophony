// Decodes the hall impulse response as FLAC and as WAV with `decodeAudioData()` in Chromium,
// Firefox, and WebKit of Playwright, and prints the largest difference of the samples. It also
// compares each decoded FLAC sample with the 16-bit sample of the WAV file / 32768.
//
// Usage: node docs/research/2026-10-21-load-performance/hall-decode-probe.ts
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { chromium, firefox, webkit } from '@playwright/test';

const files: Record<string, Buffer> = {
  '/hall.flac': readFileSync('assets/hall/st-pauls-hall-c8m.flac'),
  '/hall.wav': readFileSync('assets/hall/st-pauls-hall-c8m.wav'),
};
const server = createServer((request, response) => {
  const body = files[request.url ?? ''];
  if (request.url === '/') {
    response.setHeader('content-type', 'text/html');
    response.end('<!doctype html><title>hall</title>');
  } else if (body) {
    response.end(body);
  } else {
    response.statusCode = 404;
    response.end();
  }
});
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
const port = address instanceof Object ? address.port : 0;

let failures = 0;
for (const [name, type] of [
  ['chromium', chromium],
  ['firefox', firefox],
  ['webkit', webkit],
] as const) {
  const browser = await type.launch();
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${port}/`);
  const result = await page.evaluate(async () => {
    const bytes = async (url: string) => (await fetch(url)).arrayBuffer();
    const rows = [];
    for (const rate of [48_000, 44_100]) {
      const context = new OfflineAudioContext(2, 1, rate);
      const flac = await context.decodeAudioData(await bytes('/hall.flac'));
      const wav = await context.decodeAudioData(await bytes('/hall.wav'));
      let largest = 0;
      for (let c = 0; c < 2; c++) {
        const a = flac.getChannelData(c);
        const b = wav.getChannelData(c);
        if (a.length !== b.length) {
          return { error: `channel ${c}: ${a.length} and ${b.length} frames at ${rate} Hz` };
        }
        for (let i = 0; i < a.length; i++) {
          largest = Math.max(largest, Math.abs((a[i] ?? 0) - (b[i] ?? 0)));
        }
      }
      // The differences from the 16-bit samples of the WAV file (44 bytes of header, then L and R
      // interleaved): `toInteger` for the FLAC decode and `wavToInteger` for the WAV decode, with
      // the scale 1 / 32768. `wavTo32767` gives the WAV decode with 1 / 32767 for a positive
      // sample. Only at 48 kHz, the rate of the file.
      let toInteger = -1;
      let wavToInteger = -1;
      let wavTo32767 = -1;
      if (rate === 48_000) {
        const pcm = new Int16Array((await bytes('/hall.wav')).slice(44));
        toInteger = 0;
        wavToInteger = 0;
        wavTo32767 = 0;
        for (let c = 0; c < 2; c++) {
          const a = flac.getChannelData(c);
          const b = wav.getChannelData(c);
          for (let i = 0; i < a.length; i++) {
            const x = pcm[2 * i + c] ?? 0;
            toInteger = Math.max(toInteger, Math.abs((a[i] ?? 0) - x / 32768));
            wavToInteger = Math.max(wavToInteger, Math.abs((b[i] ?? 0) - x / 32768));
            wavTo32767 = Math.max(wavTo32767, Math.abs((b[i] ?? 0) - x / (x > 0 ? 32767 : 32768)));
          }
        }
      }
      rows.push({
        rate,
        frames: flac.length,
        channels: flac.numberOfChannels,
        largest,
        toInteger,
        wavToInteger,
        wavTo32767,
      });
    }
    return { rows };
  });
  console.log(name, browser.version(), JSON.stringify(result));
  if (!('rows' in result) || result.rows.some((row) => row.largest !== 0)) {
    failures += 1;
  }
  await browser.close();
}
server.close();
console.log(
  failures === 0 ? 'all browsers: largest difference 0' : `${failures} browsers: a difference`,
);
process.exit(failures === 0 ? 0 : 1);
