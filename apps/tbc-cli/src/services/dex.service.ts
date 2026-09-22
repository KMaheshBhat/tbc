export interface DexRebuildRequest {
  rootDirectory: string;
  verbose: boolean;
}

export async function rebuildDex(_request: DexRebuildRequest): Promise<void> {
  throw new Error('NG stub: dex service not yet migrated from HAMI');
}
