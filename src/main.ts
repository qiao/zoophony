import './style.css';

import { App, PERF_60 } from './app/app.ts';
import { demoFromQuery } from './app/demos.ts';
import type { DevHook } from './app/dev-hook.ts';
import { boneIndex } from './models/rig.ts';
import { watchPixelRatio } from './scene/pixel-ratio.ts';
import { startTierOf } from './scene/quality.ts';
import { StageScene } from './scene/stage-scene.ts';

const canvas = document.querySelector<HTMLCanvasElement>('#stage');
if (!canvas) {
  throw new Error('The page has no canvas with the id "stage".');
}

const scene = new StageScene(canvas, {
  tier: startTierOf(window),
  devicePixelRatio: window.devicePixelRatio,
  reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
});
const app = new App(canvas, scene);

function resize(): void {
  scene.resize(canvas?.clientWidth ?? 1, canvas?.clientHeight ?? 1, window.devicePixelRatio);
}

function frame(): void {
  app.frame();
  requestAnimationFrame(frame);
}

window.addEventListener('resize', resize);
watchPixelRatio(window, resize);

if (import.meta.env.DEV) {
  const hook: DevHook = {
    get songTime() {
      return app.songTime;
    },
    get playing() {
      return app.playing;
    },
    get instruments() {
      return app.plan?.players.map((p) => p.instrument) ?? [];
    },
    rotation(player, bone) {
      const rotations = app.poses?.players[player]?.rotations;
      const i = boneIndex(bone) * 4;
      return rotations ? [...rotations.subarray(i, i + 4)] : [];
    },
  };
  window.zoophony = hook;
}

// Until the URL hash of step 6, the query `?demo=<id>` selects the demo (design 2.2). Only on the
// dev server, `?demo=perf-60` shows the file of the frame target (design 9.5).
const query = new URLSearchParams(window.location.search).get('demo');
const first = import.meta.env.DEV && query === PERF_60 ? PERF_60 : demoFromQuery(location.search);
resize();
// The first screen waits for a click, because the browser needs a user gesture (design 2.2).
app.select(first, false).catch(reportError);
requestAnimationFrame(frame);
