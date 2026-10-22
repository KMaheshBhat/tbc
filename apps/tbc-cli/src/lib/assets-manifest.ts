import { Glob } from 'bun';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { toPosixPath } from './paths.js';

/**
 * Resolve the directory that holds the bundled assets.
 *
 * The assets ship next to the *running* program:
 *
 * - from source (`bun src/index.ts`) → `src/lib/assets`
 * - from the bundled build (`bun dist/index.js`) → `dist/assets`
 * - from the compiled binary (`dist/tbc`) → `dist/assets`, i.e. the directory
 *   the executable itself lives in.
 *
 * In the compiled binary `import.meta.dir` is the virtual `/$bunfs/root`, so it
 * cannot be used to find them; the executable's own directory is used instead.
 */
function resolveAssetsDir(): string {
  const alongsideModule = join(import.meta.dir, 'assets');
  if (existsSync(alongsideModule)) return alongsideModule;
  return join(dirname(process.execPath), 'assets');
}

export async function generateAssetsManifest(): Promise<Record<string, string>> {
  const glob = new Glob('**/*');
  const assetsDir = resolveAssetsDir();
  const manifest: Record<string, string> = {};

  for await (const file of glob.scan({ cwd: assetsDir, dot: true })) {
    // The manifest is keyed by the *portable* (POSIX) relative path. The
    // lookups in `synthesis.ts` and `int.service.ts` use POSIX keys
    // (`templates/root.md`), so the manifest must be keyed the same way on
    // every host. On Windows the glob yields `templates\root.md`, and every
    // lookup used to miss — `tbc sys init` died with
    // `undefined is not an object (evaluating 'ASSETS["templates/root.md"]...')`.
    const key = toPosixPath(file);
    manifest[key] = await Bun.file(join(assetsDir, file)).text();
  }

  return manifest;
}
