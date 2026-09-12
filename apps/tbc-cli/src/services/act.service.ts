export interface ActStartRequest {
  rootDirectory: string;
  activityId?: string;
  verbose: boolean;
}

export interface ActShowRequest {
  rootDirectory: string;
  verbose: boolean;
}

export interface ActPauseRequest {
  rootDirectory: string;
  activityId: string;
  verbose: boolean;
}

export interface ActCloseRequest {
  rootDirectory: string;
  activityId: string;
  verbose: boolean;
}

export async function startActivity(_request: ActStartRequest): Promise<void> {
  throw new Error('NG stub: act service not yet migrated from HAMI');
}

export async function showActivity(_request: ActShowRequest): Promise<void> {
  throw new Error('NG stub: act service not yet migrated from HAMI');
}

export async function pauseActivity(_request: ActPauseRequest): Promise<void> {
  throw new Error('NG stub: act service not yet migrated from HAMI');
}

export async function closeActivity(_request: ActCloseRequest): Promise<void> {
  throw new Error('NG stub: act service not yet migrated from HAMI');
}
