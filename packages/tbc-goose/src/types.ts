import { TBCRecordOperation } from '@tbc-frameworx/tbc-record';

type SharedStage = Record<string, any>;

export type Shared = {
  stage: SharedStage;
  record: TBCRecordOperation;
};
