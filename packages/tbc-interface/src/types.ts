import { HAMIRegistrationManager } from '@hami-frameworx/core';

import { TBCRecordOperation } from '@tbc-frameworx/tbc-record';
import { TBCSystemOperation } from '@tbc-frameworx/tbc-system';

type SharedStage = Record<string, any>;

type Shared = {
  /** HAMI registration manager for node creation and management. */
  registry: HAMIRegistrationManager;
  stage: SharedStage;
  system: TBCSystemOperation;
  record: TBCRecordOperation;
  verbose?: boolean;
  rootDirectory?: string;
};

export {
  Shared,
};
