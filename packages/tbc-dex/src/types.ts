import { TBCSystemOperation } from '@tbc-frameworx/tbc-system';

type SharedStage = Record<string, any>;

/**
 * Shared storage interface for TBC dex operations.
 * Contains the minimal state needed for index generation and query operations.
 */
type Shared = {
  stage: SharedStage;
  system: TBCSystemOperation;
};

export type {
  Shared,
};
