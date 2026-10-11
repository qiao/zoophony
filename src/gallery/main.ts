import './style.css';

import {
  Color,
  Group,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  SpotLight,
  Vector3,
} from 'three';
import type { SkinnedMesh } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import type { Bounds } from '../models/bounds.ts';
import { CONDUCTOR } from '../models/cast.ts';
import { SCENE_COLORS } from '../models/colors.ts';
import { MeshBuilder } from '../models/mesh.ts';
import { buildPlayer } from '../models/player.ts';
import type { PlayerModel } from '../models/player.ts';
import { INSTRUMENT_SUPPORTS } from '../models/player.ts';
import { buildSupport } from '../models/props.ts';
import type { PosePlan } from '../pose/plan.ts';
import { createScenePose, poseAt } from '../pose/pose-at.ts';
import type { ScenePoseBuffer } from '../pose/pose-at.ts';
import { createMaterials } from '../scene/geometry.ts';
import { createLights } from '../scene/lights.ts';
import {
  applyScenePose,
  createPlayerGeometry,
  createPlayerMesh,
  createStaticMesh,
} from '../scene/player.ts';
import { createRenderer } from '../scene/renderer.ts';
import {
  boundsOf,
  closeView,
  galleryTransport,
  gridPlaces,
  instrumentItems,
  selectItems,
  speciesItems,
} from './items.ts';
import type { GalleryItem } from './items.ts';
import { DEFAULT_TEST_NOTES, keyName, notesAt, parseTestNotes } from './notes.ts';
import type { TestNote } from './notes.ts';
import { galleryPlan } from './plan.ts';
import type { GalleryAnimal } from './plan.ts';

/** The two pages of the gallery (design 7.1). */
type GalleryPage = 'species' | 'instruments';

/** The number of models in a row on each page. */
const COLUMNS = { species: 8, instruments: 6 } as const satisfies Readonly<
  Record<GalleryPage, number>
>;

/** The blur radius of the shadows in the gallery, in texels. */
const GALLERY_SHADOW_RADIUS = 1;

/** The smallest free space between two models, in meters. */
const GAP = 0.8;

/**
 * The depth of floor in front of a row that its labels cover, in meters. The labels of two lines
 * touched the heads of the next row (review of step 4, P4).
 */
const LABEL_DEPTH = 0.5;

/** The angle of the camera above the floor. The camera looks at the models from the front. */
const ELEVATION = 35 * MathUtils.DEG2RAD;

/**
 * Gives the turn of a model around y. Each model faces the camera, except the pianist. It faces
 * +x, as on the stage, so that the camera sees it beside the piano and the open lid.
 */
function facingOf(item: GalleryItem): number {
  return item.instrument === 'piano' ? -Math.PI / 2 : Math.PI;
}

/** One model of the gallery in the scene. */
interface GalleryModel {
  readonly item: GalleryItem;
  /** The model in its own axes: it faces -z, and the floor is at y = 0. */
  readonly object: Group;
  readonly bounds: Bounds;
  /** The skinned mesh and the model of a player, or `null` for an instrument alone. */
  readonly player: { readonly mesh: SkinnedMesh; readonly model: PlayerModel } | null;
}

function element<T extends HTMLElement>(selector: string, type: new () => T): T {
  const found = document.querySelector(selector);
  if (!(found instanceof type)) {
    throw new Error(`The gallery page has no element "${selector}".`);
  }
  return found;
}

/**
 * Builds a species with its instrument, on its seat, in the bind pose.
 *
 * @param item The species and the instrument.
 * @param materials The shared material.
 * @returns The model.
 */
function buildSpeciesModel(
  item: GalleryItem,
  materials: readonly MeshStandardMaterial[],
): GalleryModel {
  const model = buildPlayer(item.species, item.instrument);
  const seat = buildSupport(model.support, model.seat);
  const player = createPlayerMesh(model, createPlayerGeometry(model), materials);
  const object = new Group();
  object.add(player);
  if (seat) {
    object.add(createStaticMesh(seat, materials));
  }
  const bounds = boundsOf(seat ? [model.mesh, seat] : [model.mesh]);
  return { item, object, bounds, player: { mesh: player, model } };
}

/**
 * Builds an instrument alone. Its pieces keep the places that they have in the hands of the
 * player, and the instrument rests on the floor.
 *
 * @param item The instrument and the species that holds it.
 * @param materials The shared material.
 * @returns The model.
 */
function buildInstrumentModel(
  item: GalleryItem,
  materials: readonly MeshStandardMaterial[],
): GalleryModel {
  const builder = new MeshBuilder();
  for (const { piece, at } of buildPlayer(item.species, item.instrument).pieces) {
    for (const part of piece.parts) {
      builder.add(part.corners, { color: part.color, finish: part.finish, at });
    }
  }
  const data = builder.build();
  const bounds = boundsOf([data]);
  const mesh = createStaticMesh(data, materials);
  mesh.position.y = -bounds.min[1];
  const object = new Group();
  object.add(mesh);
  return { item, object, bounds, player: null };
}

const canvas = element('#gallery', HTMLCanvasElement);
const labels = element('#labels', HTMLDivElement);
const time = element('#time', HTMLInputElement);
const timeValue = element('#time-value', HTMLOutputElement);
const notesInput = element('#notes', HTMLTextAreaElement);
const status = element('#status', HTMLParagraphElement);

const search = new URLSearchParams(window.location.search);
const page: GalleryPage = search.get('page') === 'instruments' ? 'instruments' : 'species';
element(`#page-${page}`, HTMLAnchorElement).setAttribute('aria-current', 'page');

const renderer = createRenderer(canvas, 'high', window.devicePixelRatio);
const scene = new Scene();
const materials = createMaterials();
const items = selectItems(
  page === 'species' ? speciesItems() : instrumentItems(),
  search.get('only'),
);
const models = items.map((item) =>
  page === 'species' ? buildSpeciesModel(item, materials) : buildInstrumentModel(item, materials),
);

const sizes = models.map(({ item, bounds }) => {
  const across = bounds.max[0] - bounds.min[0];
  const along = bounds.max[2] - bounds.min[2];
  // A turn of 90° swaps the width and the depth of the box.
  const turned = Math.abs(Math.sin(facingOf(item))) > 0.5;
  return {
    width: turned ? along : across,
    depth: turned ? across : along,
    height: bounds.max[1] - bounds.min[1],
  };
});
const places = gridPlaces(sizes, COLUMNS[page], GAP, 1 / Math.tan(ELEVATION), LABEL_DEPTH);
const labelAnchors: Vector3[] = [];
for (const [i, model] of models.entries()) {
  const [x, z] = places[i] ?? [0, 0];
  const { min, max } = model.bounds;
  const facing = facingOf(model.item);
  // The turn around y moves the center (cx, cz) of the box to
  // (cx cos + cz sin, -cx sin + cz cos). The model moves back by that amount.
  const cx = (min[0] + max[0]) / 2;
  const cz = (min[2] + max[2]) / 2;
  const cos = Math.cos(facing);
  const sin = Math.sin(facing);
  model.object.position.set(x - (cx * cos + cz * sin), 0, z - (-cx * sin + cz * cos));
  model.object.rotation.y = facing;
  scene.add(model.object);
  labelAnchors.push(new Vector3(x, 0, z + (sizes[i]?.depth ?? 0) / 2 + 0.15));
  const label = document.createElement('span');
  label.textContent = model.item.label;
  labels.append(label);
}

const extentX = Math.max(...places.map(([x], i) => Math.abs(x) + (sizes[i]?.width ?? 0) / 2));
const extentZ = Math.max(...places.map(([, z], i) => Math.abs(z) + (sizes[i]?.depth ?? 0) / 2));
const floorSide = 2 * Math.max(extentX, extentZ) + 2;
const floor = new Mesh(
  new PlaneGeometry(floorSide, floorSide),
  new MeshStandardMaterial({
    color: new Color().setRGB(...SCENE_COLORS.stageTop),
    roughness: 0.85,
    metalness: 0,
  }),
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// The gallery shows the models, so it has no visible beam.
const lights = createLights(floorSide, 'high', null, { beam: false });
scene.add(lights);
const spot = lights.children.find((child) => child instanceof SpotLight);
if (spot) {
  // The radius 3 of the high tier shows the noise of PCFShadowMap as a fine grid on each lit face
  // in a close view. The radius 1 halves it (review of step 3, F11).
  spot.shadow.radius = GALLERY_SHADOW_RADIUS;
}

const camera = new PerspectiveCamera(30, 1, 0.1, 10 * floorSide);
const controls = new OrbitControls(camera, canvas);
const close = closeView(search);
const transport = galleryTransport(search);
controls.target.set(0, close.target, 0);

/** The corners of the box around all models, for the camera fit. */
const corners = [-1, 1].flatMap((sx) =>
  [0, 2].flatMap((y) => [-1, 1].map((sz) => new Vector3(sx * extentX, y, sz * extentZ))),
);

/**
 * Places the camera in front of the models, at the smallest distance that shows the box around
 * all of them with a margin.
 */
function frameModels(): void {
  const fits = (distance: number): boolean => {
    camera.position.set(0, 0.6 + distance * Math.sin(ELEVATION), distance * Math.cos(ELEVATION));
    camera.lookAt(controls.target);
    camera.updateMatrixWorld();
    return corners.every((corner) => {
      const p = corner.clone().project(camera);
      return Math.abs(p.x) <= 0.95 && Math.abs(p.y) <= 0.9;
    });
  };
  let distance = 1;
  while (!fits(distance)) {
    distance += 0.1;
  }
  if (close.zoom > 1) {
    const near = distance / close.zoom;
    camera.position.set(0, close.target + near * Math.sin(ELEVATION), near * Math.cos(ELEVATION));
  }
  controls.update();
}

function resize(): void {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  frameModels();
}

/** The animals of the gallery that play: the players, the conductor, and their meshes. */
interface GalleryCast {
  /** The players, each in its own seat, in the order of `ScenePose.players`. */
  readonly players: readonly GalleryAnimal[];
  readonly conductor: GalleryAnimal;
  /** The meshes of the players, then of the conductor. */
  readonly meshes: readonly SkinnedMesh[];
}

/**
 * Gives the animals of the gallery at their places. Each player gets its own seat.
 *
 * @returns The cast, or `null` for the instruments page, which has no animal.
 */
function galleryCast(): GalleryCast | null {
  const posed = models.flatMap(({ item, object, player }) =>
    player
      ? [
          {
            mesh: player.mesh,
            model: player.model,
            place: {
              position: [object.position.x, 0, object.position.z] as const,
              facing: object.rotation.y,
              support: INSTRUMENT_SUPPORTS[item.instrument],
              species: item.species,
              instrument: item.instrument,
            },
          },
        ]
      : [],
  );
  const conductor = posed.find((p) => p.place.instrument === CONDUCTOR.instrument);
  if (!conductor) {
    return null;
  }
  const players = posed.filter((p) => p !== conductor);
  const animal = (p: (typeof posed)[number], seatIndex: number): GalleryAnimal => {
    const { species, instrument, support, ...place } = p.place;
    return {
      model: p.model,
      place: {
        ...place,
        cast: { seatIndex, player: 0, species, instrument, kettles: 4, support },
      },
    };
  };
  return {
    players: players.map(animal),
    conductor: animal(conductor, players.length),
    meshes: [...players, conductor].map((p) => p.mesh),
  };
}

const cast = galleryCast();
/** The pose plan of the test notes, and the poses that each frame writes. */
let poses: { readonly plan: PosePlan; readonly buffer: ScenePoseBuffer } | null = null;

/** Shows the time and the notes that sound at it. */
function updateTime(notes: readonly TestNote[]): void {
  const at = Number(time.value);
  timeValue.textContent = `${at.toFixed(2)} s`;
  const sounding = notesAt(notes, at);
  status.textContent =
    sounding.length > 0
      ? `Sounding: ${sounding.map((note) => keyName(note.key)).join(', ')}`
      : 'No note sounds.';
}

/**
 * Reads the test notes, and makes the pose plan in which each player plays them and the bear
 * conducts them (design 7.1).
 */
function updateNotes(): void {
  const result = parseTestNotes(notesInput.value);
  if (!result.ok) {
    status.textContent = `Line ${result.line} is not valid.`;
    return;
  }
  const end = Math.max(0, ...result.notes.map((note) => note.start + note.length));
  time.max = String(Math.max(4, Math.ceil(end + 1)));
  notes = result.notes;
  if (cast) {
    const plan = galleryPlan(cast.players, cast.conductor, notes);
    poses = { plan, buffer: createScenePose(plan) };
  }
  updateTime(notes);
}

let notes: readonly TestNote[] = [];
notesInput.value = DEFAULT_TEST_NOTES;
time.addEventListener('input', () => {
  updateTime(notes);
});
notesInput.addEventListener('input', updateNotes);
window.addEventListener('resize', resize);
resize();
updateNotes();

const projected = new Vector3();

/**
 * Poses the players at the time of the slider, with the idle motion of the wall clock time
 * (design 5.1), and renders the gallery.
 */
function frame(): void {
  if (poses) {
    const { plan, buffer } = poses;
    applyScenePose(
      cast?.meshes ?? [],
      poseAt(plan, Number(time.value), performance.now() / 1000, transport, [], buffer),
    );
  }
  controls.update();
  renderer.render(scene, camera);
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  for (const [i, label] of [...labels.children].entries()) {
    const anchor = labelAnchors[i];
    if (!(label instanceof HTMLElement) || !anchor) {
      continue;
    }
    projected.copy(anchor).project(camera);
    const x = ((projected.x + 1) / 2) * width;
    const y = ((1 - projected.y) / 2) * height;
    label.style.transform = `translate(${x}px, ${y}px) translate(-50%, 0)`;
  }
  // The screenshot script of the reviews (tools/screenshots.ts) waits for this attribute.
  canvas.dataset['ready'] = page;
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
