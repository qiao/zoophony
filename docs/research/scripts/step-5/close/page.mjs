// The page of capture.mjs. It builds the scene of one demo with the modules of the app, and
// poses it with poseAt() at a chosen song time and wall time. A free camera looks at a chosen
// point. The query `?demo=<id>` selects the demo of public/demos/.
import { Group, PerspectiveCamera, Scene, Vector3 } from 'three';

import { layoutScene } from '/src/models/layout-scene.ts';
import { ModelCache } from '/src/models/model-cache.ts';
import { buildSceneProps } from '/src/models/props.ts';
import { createIdleState, idleAt } from '/src/pose/idle.ts';
import { preparePoses } from '/src/pose/plan.ts';
import { createScenePose, poseAt } from '/src/pose/pose-at.ts';
import { createMaterials } from '/src/scene/geometry.ts';
import { createLights } from '/src/scene/lights.ts';
import { applyScenePose, createPlayers, createStaticMesh } from '/src/scene/player.ts';
import { createRenderer } from '/src/scene/renderer.ts';
import { playerSpots } from '/src/scene/stage-scene.ts';
import { createStage } from '/src/scene/stage.ts';
import { VIEW_OFFSET_Y, defaultView } from '/src/scene/view.ts';
import { buildScore } from '/src/score/score.ts';

const demo = new URLSearchParams(window.location.search).get('demo') ?? 'beethoven-5';
const canvas = document.querySelector('#stage');
const renderer = createRenderer(canvas, 'high', window.devicePixelRatio);
const response = await fetch(`/demos/${demo}.mid`);
const result = buildScore(new Uint8Array(await response.arrayBuffer()), 'auto');
if (!result.ok) {
  throw new Error(`The demo "${demo}" is not valid: ${result.error}.`);
}
const { score } = result;
const models = new ModelCache();
const layout = layoutScene(score, models);
const plan = preparePoses(score, layout, 1, models);
const materials = createMaterials();
const scene = new Scene();
scene.add(createStage(layout.stageSide, layout.podium, materials));
scene.add(createLights(layout.stageSide, 'high'));
scene.add(createStaticMesh(buildSceneProps(layout), materials));
const meshes = createPlayers(playerSpots(layout), materials, models);
scene.add(new Group().add(...meshes));
const camera = new PerspectiveCamera(30, 1, 0.1, 200);
const buffer = createScenePose(plan);
// The players play since long before each capture, so the instruments are up (design 5.2).
const playing = { playing: true, changedAtWall: -100, weightAtChange: 0 };

window.capture = {
  /** The players: the index, the instrument, the place, and the distance from the podium. */
  players: layout.players.map((p, index) => ({
    index,
    instrument: p.cast.instrument,
    position: p.position,
    radius: Math.hypot(p.position[0] - layout.podium[0], p.position[2] - layout.podium[2]),
  })),
  /** Gives the wall times in a range at which a player has its eyes fully closed. */
  blinkPeaks(index, from, to) {
    const state = createIdleState();
    const peaks = [];
    for (let t = from; t < to; t += 0.001) {
      idleAt(plan.players[index].idle, t, state);
      if (state.blink > 0.98) {
        peaks.push(t);
      }
    }
    return peaks;
  },
  /**
   * Poses the scene at a song time and a wall time, and renders it from a camera. With no target,
   * the camera takes the default view of the app (design 4.5).
   */
  render({ songTime, wallTime, target, distance, azimuth, elevation }) {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    if (!target) {
      const view = defaultView(layout.stageSide, width, height);
      camera.setViewOffset(width, height, 0, VIEW_OFFSET_Y, width, height);
      camera.position.set(...view.position);
      camera.lookAt(new Vector3(...view.target));
      camera.updateProjectionMatrix();
      applyScenePose(meshes, poseAt(plan, songTime, wallTime, playing, [], buffer));
      renderer.render(scene, camera);
      return;
    }
    camera.clearViewOffset();
    camera.updateProjectionMatrix();
    const az = (azimuth * Math.PI) / 180;
    const el = (elevation * Math.PI) / 180;
    const at = new Vector3(...target);
    const offset = new Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    camera.position.copy(at).addScaledVector(offset, distance);
    camera.lookAt(at);
    applyScenePose(meshes, poseAt(plan, songTime, wallTime, playing, [], buffer));
    renderer.render(scene, camera);
  },
};
canvas.dataset.ready = 'yes';
