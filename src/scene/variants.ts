import { MeshDepthMaterial, SkinnedMesh } from 'three';
import type { Mesh, MeshStandardMaterial } from 'three';

/**
 * Gives the program variant of a mesh (design 4.5): the parts of a mesh that select the shader
 * program of a material in three.js. These are the skin, the morph targets, and the attributes of
 * the geometry.
 *
 * three.js keeps one current program for each material. When meshes of two variants share a
 * material, each draw after a change of variant looks up the program again
 * (`WebGLRenderer.getProgram()`). The studio bodies have different counts of morph targets, so
 * one shared material looked up its program at about each player, in each pass of a frame: 1.1 ms
 * of main-thread time on the development Mac (`docs/research/2026-10-21-frame-performance.md`).
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
 * The materials of each program variant of the players (design 4.5): a copy of the shared material
 * for the scene pass, and a depth material for the shadow maps. Each copy and each depth material
 * keeps the program of its variant, so no draw of a frame looks up a program again
 * ({@link programVariant}).
 * The copies have the values, the textures, and the shader patch of the shared material, so they
 * use the same programs and give the same pixels.
 */
export class VariantMaterials {
  readonly #shared: readonly MeshStandardMaterial[];
  /** The copies of the shared material, by variant. */
  readonly #copies = new Map<string, MeshStandardMaterial[]>();
  /** The depth materials of the shadow maps, by variant. */
  readonly #shadows = new Map<string, MeshDepthMaterial>();

  /**
   * Creates no material until a scene needs it.
   *
   * @param shared The shared material of the players and the props (`createMaterials()`).
   */
  constructor(shared: readonly MeshStandardMaterial[]) {
    this.#shared = shared;
  }

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

  /** Frees each copy and each depth material. The shared material stays. */
  dispose(): void {
    for (const material of [...this.copies, ...this.#shadows.values()]) {
      material.dispose();
    }
    this.#copies.clear();
    this.#shadows.clear();
  }
}
