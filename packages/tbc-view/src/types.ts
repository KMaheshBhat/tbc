import { HAMIRegistrationManager } from "@hami-frameworx/core";
import { TBCRecord, TBCRecordOperation } from "@tbc-frameworx/tbc-record";
import { TBCSystemOperation } from "@tbc-frameworx/tbc-system";

type SharedStage = Record<string, any>;

type TBCViewOperation = {
    query: string;       // The user's search string
    type?: string;       // Filter by record_type (note, goal, etc.)
    matches: Array<{     // "Lean" results from DEX (.jsonl)
        id: string;
        title: string;
        tags: string[];
        path: string;
    }>;
    records: TBCRecord[];
}

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