export interface ActStartConfig {
  rootDirectory: string;
  activityId?: string;
  verbose: boolean;
}

export interface ActShowConfig {
  rootDirectory: string;
  verbose: boolean;
}

export interface ActPauseConfig {
  rootDirectory: string;
  activityId: string;
  verbose: boolean;
}

export interface ActCloseConfig {
  rootDirectory: string;
  activityId: string;
  verbose: boolean;
}

export async function startActivity(_config: ActStartConfig): Promise<void> {
  throw new Error('NG stub: act service not yet migrated from HAMI');
}

export async function showActivity(_config: ActShowConfig): Promise<void> {
  throw new Error('NG stub: act service not yet migrated from HAMI');
}

export async function pauseActivity(_config: ActPauseConfig): Promise<void> {
  throw new Error('NG stub: act service not yet migrated from HAMI');
}

export async function closeActivity(_config: ActCloseConfig): Promise<void> {
  throw new Error('NG stub: act service not yet migrated from HAMI');
}
