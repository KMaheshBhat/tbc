export interface DexRebuildConfig {
  rootDirectory: string;
  verbose: boolean;
}

export async function rebuildDex(_config: DexRebuildConfig): Promise<void> {
  throw new Error('NG stub: dex service not yet migrated from HAMI');
}
