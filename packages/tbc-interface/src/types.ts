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

/**
 * Options for TBC interface operations.
 * Defines configuration flags that can be used across TBC interface operations.
 */
type TBCInterfaceOpts = {
  /** Whether to enable verbose logging for operations. */
  verbose?: boolean;
}

/**
 * Shared storage interface for TBC interface operations.
 * Defines the structure of data that can be shared between TBC interface operation nodes.
 * Contains configuration options and results from various TBC interface operations.
 */
type TBCInterfaceStorage = {
  /** Optional configuration options for TBC interface operations. */
  opts?: TBCInterfaceOpts;
  /** Root directory for operations */
  rootDirectory?: string;
  /** Companion ID */
  companionId?: string;
  /** Companion name */
  companionName?: string;
  /** Role definition for the companion */
  roleDefinition?: string;
  /** Records to be stored */
  records?: Record<string, any>[];
}

export {
  Shared,
  TBCInterfaceOpts,
  TBCInterfaceStorage,
};