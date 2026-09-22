import { generateAssetsManifest } from './assets-manifest.js';

export const ASSETS: Record<string, string> = await generateAssetsManifest();
