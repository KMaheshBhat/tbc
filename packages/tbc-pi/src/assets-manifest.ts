import { join } from 'node:path';

import { Glob } from 'bun';

export async function generateAssetsManifest() {
  const glob = new Glob('**/*');
  const assetsDir = join(import.meta.dir, 'assets');
  const manifest: Record<string, string> = {};

  for await (const file of glob.scan({ cwd: assetsDir, dot: true })) {
    const content = await Bun.file(join(assetsDir, file)).text();
    manifest[file] = content;
  }

  return manifest;
}