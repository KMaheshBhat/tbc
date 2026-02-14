import { HAMIRegistrationManager } from "@hami-frameworx/core";
import { TBCSystemOperation } from "@tbc-frameworx/tbc-system";
import { TBCRecordOperation } from "@tbc-frameworx/tbc-record";

type SharedStage = Record<string, any>;

type Shared = {
  /** HAMI registration manager for node creation and management. */
  registry: HAMIRegistrationManager;
  stage: SharedStage;
  system: TBCSystemOperation;
  record: TBCRecordOperation;
  verbose?: boolean;
  rootDirectory?: string;
}

export {
  Shared,
};