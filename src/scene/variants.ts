import { Mesh, MeshBasicMaterial, MeshDepthMaterial, SkinnedMesh } from 'three';
import type { Material, MaterialEventMap, MeshStandardMaterial, Object3D, RenderItem } from 'three';

declare module 'three' {
  interface Material<TEventMap extends MaterialEventMap = MaterialEventMap> {
    /**
     * The serial number of the material in the order of creation. three.js sets it, and its render
     * list sorts the draws by it, but the types of three.js do not declare it.
     */
    readonly id: number;
  }
}

/**
 * Gives the program variant of a mesh (design 4.5): the parts of a mesh that select the shader
 * program of a material in three.js. These are the skin, the morph targets, and the attributes of
 * the geometry.
 *
 * three.js keeps one current program for each material. When meshes of two variants share a
 * material, each draw after a change of variant looks up the program again
 * (`WebGLRenderer.getProgram()`). The studio bodies have different counts of morph targets, so
 * one shared material looks up its program at about each player, in each pass of a frame: 1.1 ms
 * of main-thread time on the development Mac.
 *
 * @param mesh The mesh.
 * @returns A key that is the same for two meshes of one variant.
 */
export function programVariant(mesh: Mesh): string {
  const geometry = mesh.geometry;
  const morphs = geometry.morphAttributes;
  const attributes = Object.entries(geometry.attributes)
    .map(([name, attribute]) => `${name}${attribute.itemSize}`)
    .toSorted()
    .join(',');
  return [
    mesh instanceof SkinnedMesh ? 'skin' : 'rigid',
    morphs['position']?.length ?? 0,
    morphs['normal']?.length ?? 0,
    morphs['color']?.length ?? 0,
    attributes,
  ].join(':');
}

/**
 * Tells if an object draws into the depth passes of a frame: a mesh whose materials each write
 * depth. The light effects write no depth, and the depth passes hide them.
 *
 * @param object The object.
 * @returns True for such a mesh.
 */
function writesDepth(object: Object3D): object is Mesh {
  if (!(object instanceof Mesh)) {
    return false;
  }
  const own: readonly Material[] = Array.isArray(object.material)
    ? object.material
    : [object.material];
  return own.every((material) => material.depthWrite);
}

/** A mesh of a depth pass, and its depth material in the form of its own material. */
interface DepthMesh {
  readonly mesh: Mesh;
  /** The depth material of the variant of the mesh. */
  readonly depth: MeshBasicMaterial;
  /** The depth material once for each material of a mesh with a list of materials. */
  list: MeshBasicMaterial[];
}

/**
 * The materials of each program variant of the players (design 4.5): a copy of the shared material
 * for the scene pass, a depth material for the shadow maps, and a depth material for the depth
 * passes of the beam and of the depth of field. Each copy and each depth material keeps the
 * program of its variant, so no draw of a frame looks up a program again ({@link programVariant}).
 * The copies have the values, the textures, and the shader patch of the shared material, so they
 * use the same programs and give the same pixels.
 */
export class VariantMaterials {
  readonly #shared: readonly MeshStandardMaterial[];
  /** The copies of the shared material, by variant. */
  readonly #copies = new Map<string, MeshStandardMaterial[]>();
  /** The id of the shared material of each copy, for the order of the draws. */
  readonly #sharedIds = new WeakMap<Material, number>();
  /** The depth materials of the shadow maps, by variant. */
  readonly #shadows = new Map<string, MeshDepthMaterial>();
  /** The depth materials of the depth passes, by variant. */
  readonly #depths = new Map<string, MeshBasicMaterial>();
  /** The meshes of the depth passes of the current scene. */
  #depthMeshes: DepthMesh[] = [];
  /** The own material of each mesh of {@link VariantMaterials.renderDepth}, during the render. */
  readonly #own: (Material | Material[])[] = [];

  /**
   * Creates no material until a scene needs it.
   *
   * @param shared The shared material of the players and the props (`createMaterials()`).
   */
  constructor(shared: readonly MeshStandardMaterial[]) {
    this.#shared = shared;
  }

  /**
   * Sorts the opaque draws of a render as `painterSortStable()` of three.js does, with the id of
   * the shared material in place of the id of a copy. Thus the players keep the order of their
   * draws with the shared material: by the distance from the camera, after the props. With the
   * order of the ids of the copies, two draws at one depth of a sample of the scene target came in
   * the other order, and 1 or 2 pixels of a frozen frame changed by up to 14 of 255.
   *
   * @param a A draw.
   * @param b Another draw.
   * @returns A negative number when `a` draws first.
   */
  readonly opaqueSort = (a: RenderItem, b: RenderItem): number => {
    if (a.groupOrder !== b.groupOrder) {
      return a.groupOrder - b.groupOrder;
    }
    if (a.renderOrder !== b.renderOrder) {
      return a.renderOrder - b.renderOrder;
    }
    const idA = this.#sharedIds.get(a.material) ?? a.material.id;
    const idB = this.#sharedIds.get(b.material) ?? b.material.id;
    if (idA !== idB) {
      return idA - idB;
    }
    if (a.materialVariant !== b.materialVariant) {
      return a.materialVariant - b.materialVariant;
    }
    if (a.z !== b.z) {
      return a.z - b.z;
    }
    return a.id - b.id;
  };

  /** Each copy of the shared material, which the next scene can reuse. */
  get copies(): MeshStandardMaterial[] {
    return [...this.#copies.values()].flat();
  }

  /**
   * Gives each player mesh the copy of the shared material of its variant, and the depth material
   * of its variant for the shadow maps (`customDepthMaterial`). The shadow pass of three.js copies
   * the side and the other values of the material of each draw to it, as to its own depth
   * material.
   *
   * @param meshes The player meshes. Each one has the shared material.
   */
  assign(meshes: readonly Mesh[]): void {
    for (const mesh of meshes) {
      const variant = programVariant(mesh);
      let copies = this.#copies.get(variant);
      if (!copies) {
        copies = this.#shared.map((material) => {
          const copy = material.clone();
          // The patch of `createMaterials()` is an arrow function that reads no `this`. The copy
          // keeps the same function, so its program key (the source text of the patch) is the key
          // of the shared material, and it takes the compiled program of the shared material.
          // oxlint-disable-next-line typescript/unbound-method -- see the comment above.
          copy.onBeforeCompile = material.onBeforeCompile;
          this.#sharedIds.set(copy, material.id);
          return copy;
        });
        this.#copies.set(variant, copies);
      }
      mesh.material = [...copies];
      let shadow = this.#shadows.get(variant);
      if (!shadow) {
        shadow = new MeshDepthMaterial();
        this.#shadows.set(variant, shadow);
      }
      mesh.customDepthMaterial = shadow;
    }
  }

  /**
   * Finds the meshes of the depth passes of a scene: each mesh whose materials write depth.
   *
   * @param scene The scene of the layout.
   */
  useScene(scene: Object3D): void {
    const meshes: DepthMesh[] = [];
    scene.traverse((object) => {
      if (writesDepth(object)) {
        meshes.push({ mesh: object, depth: this.#depthOf(object), list: [] });
      }
    });
    this.#depthMeshes = meshes;
  }

  /**
   * Draws a depth pass with the depth material of the variant of each mesh in place of its own
   * material, as `Scene.overrideMaterial` does with one material for all meshes. A mesh with a
   * list of materials gets the depth material once for each, so each group draws as before. The
   * depth material writes no color, and the order of the draws does not change a depth.
   *
   * @param draw Renders the scene.
   */
  renderDepth(draw: () => void): void {
    const own = this.#own;
    own.length = 0;
    for (const entry of this.#depthMeshes) {
      const material = entry.mesh.material;
      own.push(material);
      if (Array.isArray(material)) {
        if (entry.list.length !== material.length) {
          entry.list = material.map(() => entry.depth);
        }
        entry.mesh.material = entry.list;
      } else {
        entry.mesh.material = entry.depth;
      }
    }
    try {
      draw();
    } finally {
      for (const [i, entry] of this.#depthMeshes.entries()) {
        const material = own[i];
        if (material) {
          entry.mesh.material = material;
        }
      }
      own.length = 0;
    }
  }

  /** Frees each copy and each depth material. The shared material stays. */
  dispose(): void {
    for (const material of [...this.copies, ...this.#shadows.values(), ...this.#depths.values()]) {
      material.dispose();
    }
    this.#copies.clear();
    this.#shadows.clear();
    this.#depths.clear();
    this.#depthMeshes = [];
  }

  /**
   * Gives the depth material of the variant of a mesh: it writes no color, as the material of
   * the depth passes of the beam and of the depth of field before this cut.
   *
   * @param mesh The mesh.
   * @returns The material.
   */
  #depthOf(mesh: Mesh): MeshBasicMaterial {
    const variant = programVariant(mesh);
    let material = this.#depths.get(variant);
    if (!material) {
      material = new MeshBasicMaterial({ colorWrite: false });
      this.#depths.set(variant, material);
    }
    return material;
  }
}
