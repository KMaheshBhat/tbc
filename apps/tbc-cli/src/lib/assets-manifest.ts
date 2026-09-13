import { Glob } from 'bun';
import { join } from 'node:path';

export async function generateAssetsManifest(): Promise<Record<string, string>> {
  const glob = new Glob('**/*');
  const assetsDir = join(import.meta.dir, 'assets');
  const manifest: Record<string, string> = {};

  for await (const file of glob.scan({ cwd: assetsDir, dot: true })) {
    manifest[file] = await Bun.file(join(assetsDir, file)).text();
  }

  return manifest;
}
