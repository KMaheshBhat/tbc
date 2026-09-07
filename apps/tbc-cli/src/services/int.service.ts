export interface IntProbeConfig {
  rootDirectory: string;
  verbose: boolean;
}

export interface IntGenerateConfig {
  rootDirectory: string;
  agentType: string;
  verbose: boolean;
}

export async function probeInterface(_config: IntProbeConfig): Promise<void> {
  throw new Error('NG stub: int service not yet migrated from HAMI');
}

export async function generateInterface(_config: IntGenerateConfig): Promise<void> {
  throw new Error('NG stub: int service not yet migrated from HAMI');
}
