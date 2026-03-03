import { HAMIRegistrationManager } from '@hami-frameworx/core';
import { TBCRecordOperation } from '@tbc-frameworx/tbc-record';
import { TBCSystemOperation } from '@tbc-frameworx/tbc-system';

type SharedStage = Record<string, any>;

/**
 * Shared storage interface for TBC dex operations.
 * Contains the minimal state needed for index generation and query operations.
 */
type Shared = {
  registry: HAMIRegistrationManager;
  stage: SharedStage;
  system: TBCSystemOperation;
  record: TBCRecordOperation;
};

export type {
  Shared,
};
