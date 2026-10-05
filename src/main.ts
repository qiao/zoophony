import './style.css';

import { REFERENCE_STAGE_SIDE, singleViolinLayout } from './models/layout.ts';
import { startTier } from './scene/quality.ts';
import { StageScene } from './scene/stage-scene.ts';

const canvas = document.querySelector<HTMLCanvasElement>('#stage');
if (!canvas) {
  throw new Error('The page has no canvas with the id "stage".');
}

const scene = new StageScene(canvas, {
  layout: singleViolinLayout(REFERENCE_STAGE_SIDE),
  tier: startTier(navigator.maxTouchPoints > 0, window.innerWidth, window.innerHeight),
  devicePixelRatio: window.devicePixelRatio,
  reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
});

function resize(): void {
  scene.resize(canvas?.clientWidth ?? 1, canvas?.clientHeight ?? 1);
}

resize();
window.addEventListener('resize', resize);

function frame(): void {
  scene.render();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
