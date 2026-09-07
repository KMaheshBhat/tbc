export interface MemRememberConfig {
  rootDirectory: string;
  content?: string;
  type: string;
  title?: string;
  tags: string[];
  verbose: boolean;
}

export interface MemRecallConfig {
  rootDirectory: string;
  query?: string;
  type?: string;
  limit: number;
  verbose: boolean;
}

export interface MemAssimilateConfig {
  rootDirectory: string;
  verbose: boolean;
}

export async function rememberMemory(_config: MemRememberConfig): Promise<void> {
  throw new Error('NG stub: mem service not yet migrated from HAMI');
}

export async function recallMemory(_config: MemRecallConfig): Promise<void> {
  throw new Error('NG stub: mem service not yet migrated from HAMI');
}

export async function assimilateMemory(_config: MemAssimilateConfig): Promise<void> {
  throw new Error('NG stub: mem service not yet migrated from HAMI');
}
