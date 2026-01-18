import { HAMIRegistrationManager } from "@hami-frameworx/core";
import { TBCRecordOperation } from "@tbc-frameworx/tbc-record";
import { TBCSystemOperation } from "@tbc-frameworx/tbc-system";


type SharedStage = Record<string, any>;

type Shared = {
  /** HAMI registration manager for node creation and management. */
  registry: HAMIRegistrationManager;
  /** Staged records and other details */
  stage: SharedStage;
  /** Current system operation */
  system: TBCSystemOperation;
  /** Current record operaton */
  record: TBCRecordOperation;
}

export {
  Shared,
};