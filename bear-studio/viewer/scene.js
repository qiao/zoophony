// The shared scene of the viewer and the compare page: the renderer, the lights, the bear, and
// the four cameras of the reference sheet.

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/** The camera azimuth of each sheet view in degrees: 0 is in front, 90 is at the bear's right. */
export const VIEWS = {
  front: { azimuth: 0, label: 'Front' },
  side: { azimuth: 90, label: 'Side' },
  back: { azimuth: 180, label: 'Back' },
  three_quarter: { azimuth: 38, label: '3/4' },
};

/** The sheet cameras: far away and level, so the perspective is weak (tools/bear/views.py). */
export const SHEET_CAMERA = { distance: 10, height: 0.5, fov: 7.4 };

/** The background color of the reference sheet. */
export const SHEET_BACKGROUND = 0xcacacb;

/** Creates a WebGL renderer for a canvas. */
export function createRenderer(canvas, { alpha = false, preserve = false } = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha,
    preserveDrawingBuffer: preserve,
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  return renderer;
}

/** Adds the lights. The key light and the rim light move with the camera, as on the sheet. */
export function addLights(scene, camera) {
  const hemi = new THREE.HemisphereLight(0xfff2e6, 0x5a4a3e, 0.85);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xfff0de, 2.3);
  key.position.set(-2.5, 4.5, 4);
  const keyTarget = new THREE.Object3D();
  keyTarget.position.set(0, 0, -10);
  key.target = keyTarget;
  camera.add(key, keyTarget);

  const fill = new THREE.DirectionalLight(0xffe9d6, 0.7);
  fill.position.set(3, 0.5, 4);
  const fillTarget = new THREE.Object3D();
  fillTarget.position.set(0, 0, -10);
  fill.target = fillTarget;
  camera.add(fill, fillTarget);

  const rim = new THREE.DirectionalLight(0xe8eeff, 0.35);
  rim.position.set(4, 2.5, -6);
  const rimTarget = new THREE.Object3D();
  rimTarget.position.set(0, 0, -10);
  rim.target = rimTarget;
  camera.add(rim, rimTarget);

  const shadow = new THREE.DirectionalLight(0xffffff, 0.0);
  shadow.position.set(-1.2, 4, 2.2);
  shadow.castShadow = true;
  shadow.shadow.mapSize.set(2048, 2048);
  shadow.shadow.camera.left = -1.2;
  shadow.shadow.camera.right = 1.2;
  shadow.shadow.camera.top = 1.2;
  shadow.shadow.camera.bottom = -1.2;
  shadow.shadow.radius = 6;
  scene.add(shadow);
  scene.add(camera);
  return { hemi, key, fill, rim, shadow };
}

/** Loads the bear GLB and prepares its materials for flat facets. */
export async function loadBear(url) {
  const gltf = await new GLTFLoader().loadAsync(url);
  const root = gltf.scene;
  const meshes = [];
  root.traverse((obj) => {
    if (obj.isMesh) {
      meshes.push(obj);
      obj.castShadow = true;
      obj.frustumCulled = false;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of mats) {
        m.flatShading = true;
        m.needsUpdate = true;
      }
    }
  });
  const mixer = new THREE.AnimationMixer(root);
  const clips = new Map(gltf.animations.map((c) => [c.name, c]));
  const batonTip = root.getObjectByName('BatonTip') ?? null;
  return { gltf, root, meshes, mixer, clips, batonTip };
}

/** Places a camera at a sheet view (azimuth in degrees) and aims it level at the bear. */
export function placeSheetCamera(camera, azimuthDeg, { distance, height, fov } = SHEET_CAMERA) {
  const az = THREE.MathUtils.degToRad(azimuthDeg);
  camera.fov = fov;
  camera.position.set(-distance * Math.sin(az), height, distance * Math.cos(az));
  camera.up.set(0, 1, 0);
  camera.lookAt(0, height, 0);
  camera.updateProjectionMatrix();
}

/** Sets the bear to one frame of a clip, or to the rest pose when the clip does not exist. */
export function poseAt(bear, clipName, time) {
  bear.mixer.stopAllAction();
  const clip = bear.clips.get(clipName);
  if (!clip) {
    return false;
  }
  const action = bear.mixer.clipAction(clip);
  action.reset();
  action.play();
  bear.mixer.setTime(Math.min(time, clip.duration));
  bear.root.updateMatrixWorld(true);
  return true;
}
