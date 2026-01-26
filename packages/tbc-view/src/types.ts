import { HAMIRegistrationManager } from "@hami-frameworx/core";
import { TBCRecord, TBCRecordOperation } from "@tbc-frameworx/tbc-record";
import { TBCSystemOperation } from "@tbc-frameworx/tbc-system";

/** * Lean results from DEX (.jsonl). 
 * Extracted into its own type for easier casting from stage.
 */
export type TBCViewMatch = {
    id: string;
    title: string;
    tags: string[];
    path: string;
    type?: string; 
};

type TBCViewOperation = {
    query?: string;
    type?: string;
    matches: TBCViewMatch[];
    records: TBCRecord[];
}

type Shared = {
  registry: HAMIRegistrationManager;
  stage: Record<string, any>; // Simplified SharedStage
  system: TBCSystemOperation;
  record: TBCRecordOperation;
  view: TBCViewOperation;
}

export { Shared, TBCViewOperation };