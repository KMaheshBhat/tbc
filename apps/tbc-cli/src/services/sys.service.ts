export interface SysInitConfig {
  rootDirectory: string;
  companionName: string;
  primeName: string;
  profile: 'baseline' | 'next';
  verbose: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export async function initSystem(_config: SysInitConfig): Promise<void> {
  throw new Error('NG stub: sys service not yet migrated from HAMI');
}

export async function upgradeSystem(_root: string, _verbose: boolean): Promise<void> {
  throw new Error('NG stub: sys service not yet migrated from HAMI');
}

export async function validateSystem(_root: string, _verbose: boolean): Promise<ValidationResult> {
  throw new Error('NG stub: sys service not yet migrated from HAMI');
}
