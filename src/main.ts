import './style.css';

import { demoFromQuery, demoUrl, stepDemo } from './app/demos.ts';
import type { DemoId } from './app/demos.ts';
import { fetchOk } from './audio/fetch-ok.ts';
import { layoutScene } from './models/layout-scene.ts';
import type { SceneLayout } from './models/layout.ts';
import { watchPixelRatio } from './scene/pixel-ratio.ts';
import { startTierOf } from './scene/quality.ts';
import { StageScene } from './scene/stage-scene.ts';
import { buildScore } from './score/score.ts';

const canvas = document.querySelector<HTMLCanvasElement>('#stage');
if (!canvas) {
  throw new Error('The page has no canvas with the id "stage".');
}

const scene = new StageScene(canvas, {
  tier: startTierOf(window),
  devicePixelRatio: window.devicePixelRatio,
  reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
});
let current = demoFromQuery(window.location.search);
/** The number of the last demo request. A later request replaces an earlier one. */
let request = 0;

/**
 * Loads a demo file and calculates the layout of its score.
 *
 * @param id The demo.
 * @returns The layout.
 * @throws Error if the file does not load, or if `buildScore()` refuses it.
 */
async function loadLayout(id: DemoId): Promise<SceneLayout> {
  const response = await fetchOk(demoUrl(id, import.meta.env.BASE_URL));
  const result = buildScore(new Uint8Array(await response.arrayBuffer()), 'auto');
  if (!result.ok) {
    throw new Error(`The demo "${id}" is not valid: ${result.error}.`);
  }
  return layoutScene(result.score);
}

function resize(): void {
  scene.resize(canvas?.clientWidth ?? 1, canvas?.clientHeight ?? 1, window.devicePixelRatio);
}

/**
 * Shows the scene of a demo with no motion (design 9.5, step 4). The scene of the old demo frees
 * its GPU resources, and the page keeps its renderer.
 *
 * @param id The demo.
 */
async function showDemo(id: DemoId): Promise<void> {
  const ticket = ++request;
  const layout = await loadLayout(id);
  if (ticket !== request || !canvas) {
    return;
  }
  scene.show(layout);
  // The screenshot script of the review waits for this attribute.
  canvas.dataset['demo'] = id;
}

window.addEventListener('resize', resize);
watchPixelRatio(window, resize);

// Temporary for the review of step 4: the keys [ and ] show the previous and the next demo, and
// the query `?demo=<id>` keeps the demo on a reload. Step 6 replaces them with the demo list and
// the URL hash (design 2.2).
window.addEventListener('keydown', (event) => {
  if (event.key !== '[' && event.key !== ']') {
    return;
  }
  current = stepDemo(current, event.key === '[' ? -1 : 1);
  const url = new URL(window.location.href);
  url.searchParams.set('demo', current);
  window.history.replaceState(null, '', url);
  showDemo(current).catch(reportError);
});

function frame(): void {
  scene.render();
  requestAnimationFrame(frame);
}

resize();
showDemo(current).catch(reportError);
requestAnimationFrame(frame);
