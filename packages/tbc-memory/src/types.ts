import { HAMIRegistrationManager } from "@hami-frameworx/core";
import { TBCViewOperation } from "@tbc-frameworx/tbc-view";
import { TBCSystemOperation } from "@tbc-frameworx/tbc-system";
import { TBCRecordOperation } from "@tbc-frameworx/tbc-record";

type SharedStage = Record<string, any>;

/**
 * Shared state interface for TBC System operations.
 */
type Shared = {
  /** HAMI registration manager for node creation and management. */
  registry: HAMIRegistrationManager;
  stage: SharedStage;
  view: TBCViewOperation;
  system: TBCSystemOperation;
  record: TBCRecordOperation;
  content?: string;
  title?: string;
  type?: string;
  query?: string;
  tags?: string[];
}

export {
  Shared,
};