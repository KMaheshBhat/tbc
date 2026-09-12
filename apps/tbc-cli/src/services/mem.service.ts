export interface MemRememberRequest {
  rootDirectory: string;
  content?: string;
  type: string;
  title?: string;
  tags: string[];
  verbose: boolean;
}

export interface MemRecallRequest {
  rootDirectory: string;
  query?: string;
  type?: string;
  limit: number;
  verbose: boolean;
}

export interface MemAssimilateRequest {
  rootDirectory: string;
  verbose: boolean;
}

export async function rememberMemory(_request: MemRememberRequest): Promise<void> {
  throw new Error('NG stub: mem service not yet migrated from HAMI');
}

export async function recallMemory(_request: MemRecallRequest): Promise<void> {
  throw new Error('NG stub: mem service not yet migrated from HAMI');
}

export async function assimilateMemory(_request: MemAssimilateRequest): Promise<void> {
  throw new Error('NG stub: mem service not yet migrated from HAMI');
}
