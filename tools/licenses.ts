import { existsSync, readdirSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/** npm packages that the site bundles, and whose license texts it ships (design 7.3). */
export const BUNDLED_PACKAGES: readonly string[] = ['three', 'spessasynth_core', 'stb-vorbis'];

/** One part of the third-party license file. */
export interface LicenseEntry {
  /** Name and version, such as `three 0.180.0`. */
  readonly title: string;
  /** SPDX identifier or license name. */
  readonly license: string;
  /** Web page of the project. */
  readonly source: string;
  /** Full license text. */
  readonly text: string;
}

/** Fields of a package.json file that this script reads. */
interface PackageManifest {
  readonly name: string;
  readonly version: string;
  readonly license?: string;
  readonly homepage?: string;
  readonly dependencies?: Readonly<Record<string, string>>;
}

/**
 * Creates the text of the third-party license file.
 *
 * @param entries The license entries, in the order of the file.
 * @returns The file text, with a header and one section for each entry.
 */
export function licenseDocument(entries: readonly LicenseEntry[]): string {
  const rule = '='.repeat(72);
  const sections = entries.map((entry) =>
    [rule, `${entry.title} (${entry.license})`, entry.source, rule, '', entry.text.trimEnd()].join(
      '\n',
    ),
  );
  const header = 'Zoophony includes the third-party software and data below, under these licenses.';
  return `${[header, ...sections].join('\n\n')}\n`;
}

async function readManifest(path: string): Promise<PackageManifest> {
  // SAFETY: npm and pnpm require the name and version fields, and the other fields are optional.
  return JSON.parse(await readFile(path, 'utf8')) as PackageManifest;
}

function packageDir(root: string, name: string): string | undefined {
  const direct = join(root, 'node_modules', name);
  if (existsSync(direct)) {
    return direct;
  }
  // A transitive dependency is only in the pnpm store, in a folder such as `stb-vorbis@1.0.0`.
  const store = join(root, 'node_modules', '.pnpm');
  const folders = readdirSync(store).filter((folder) => folder.startsWith(`${name}@`));
  if (folders.length > 1) {
    throw new Error(`More than one version of ${name} is installed: ${folders.join(', ')}.`);
  }
  const folder = folders[0];
  return folder ? join(store, folder, 'node_modules', name) : undefined;
}

async function packageEntry(dir: string): Promise<LicenseEntry> {
  const manifest = await readManifest(join(dir, 'package.json'));
  const file = readdirSync(dir).find((name) => /^(licen[cs]e|copying)(\.|$)/i.test(name));
  if (!file) {
    throw new Error(`${manifest.name} has no license file in ${dir}.`);
  }
  return {
    title: `${manifest.name} ${manifest.version}`,
    license: manifest.license ?? 'see the text',
    source: manifest.homepage ?? `https://www.npmjs.com/package/${manifest.name}`,
    text: await readFile(join(dir, file), 'utf8'),
  };
}

async function main(): Promise<void> {
  const root = join(import.meta.dirname, '..');
  const rootManifest = await readManifest(join(root, 'package.json'));
  const unlisted = Object.keys(rootManifest.dependencies ?? {}).filter(
    (name) => !BUNDLED_PACKAGES.includes(name),
  );
  if (unlisted.length > 0) {
    throw new Error(
      `Add these dependencies to BUNDLED_PACKAGES in tools/licenses.ts: ${unlisted.join(', ')}.`,
    );
  }
  const entries: LicenseEntry[] = [];
  for (const name of BUNDLED_PACKAGES) {
    const dir = packageDir(root, name);
    if (dir) {
      entries.push(await packageEntry(dir));
    } else {
      console.log(`${name} is not installed. The license file does not include it.`);
    }
  }
  entries.push({
    title: 'GeneralUser GS 2.0.3',
    license: 'GeneralUser GS License v2.0',
    source: 'https://github.com/mrbumpy409/GeneralUser-GS',
    text: await readFile(join(root, 'assets', 'soundfont', 'LICENSE.txt'), 'utf8'),
  });
  const out = join(root, 'dist', 'third-party-licenses.txt');
  await writeFile(out, licenseDocument(entries));
  console.log(`Wrote ${out}: ${entries.map((entry) => entry.title).join(', ')}.`);
}

if (import.meta.main) {
  await main();
}
