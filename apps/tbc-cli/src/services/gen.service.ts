export interface GenServiceConfig {
  count: number;
  rootDirectory: string;
  verbose: boolean;
}

export async function generateUuids(_config: GenServiceConfig): Promise<string[]> {
  throw new Error('NG stub: gen service not yet migrated from HAMI');
}

export async function generateTsids(_config: GenServiceConfig): Promise<string[]> {
  throw new Error('NG stub: gen service not yet migrated from HAMI');
}
