export interface IntProbeRequest {
  rootDirectory: string;
  verbose: boolean;
}

export interface IntGenerateRequest {
  rootDirectory: string;
  agentType: string;
  verbose: boolean;
}

export async function probeInterface(_request: IntProbeRequest): Promise<void> {
  throw new Error('NG stub: int service not yet migrated from HAMI');
}

export async function generateInterface(_request: IntGenerateRequest): Promise<void> {
  throw new Error('NG stub: int service not yet migrated from HAMI');
}
