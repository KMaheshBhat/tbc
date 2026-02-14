import { TBCRecordOperation } from "@tbc-frameworx/tbc-record";
import { TBCSystemOperation } from "@tbc-frameworx/tbc-system";

type SharedStage = Record<string, any>;

export type Shared = {
  stage: SharedStage;
  system: TBCSystemOperation;
  record: TBCRecordOperation;
}