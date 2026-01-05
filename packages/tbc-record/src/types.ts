import { HAMIRegistrationManager } from "@hami-frameworx/core";

type TBCRecord = Record<string, any>;
type TBCCollection = Record<string, TBCRecord>;
type TBCStore = Record<string, TBCCollection>;
type TBCRecordOperation = {
  rootDirectory?: string;
  IDs?: string[];
  collection?: string;
  records?: TBCRecord[];
  // results?: TBCStore | Record<string, string[]>;
  // accumulate?: TBCStore | Record<string, string[]>;
  // empty?: TBCStore | Record<string, string[]>;
  results?: TBCStore;
  accumulate?: TBCStore;
  empty?: TBCStore;
}

/**
 * Options for TBC record operations.
 * Defines configuration flags that can be used across TBC record operations.
 */
type TBCRecordOpts = {
  /** Whether to enable verbose logging for operations. */
  verbose?: boolean;
}

/**
 * Shared storage interface for TBC record operations.
 * Defines the structure of data that can be shared between TBC record operation nodes.
 * Contains configuration options and results from various TBC record operations.
 */
type TBCRecordStorage = {
  /** HAMI registration manager for node creation and management. */
  registry: HAMIRegistrationManager;
  /** Optional configuration options for TBC record operations. */
  opts?: TBCRecordOpts;
  /** Current record operation */
  record?: TBCRecordOperation;
  /** Root directory for operations */
  rootDirectory?: string;
  /** Store path for operations */
  storePath?: string;
  /** Collection for operations */
  collection?: string;
  /** Records data */
  records?: Record<string, any>[];
  /** Echo message for testing */
  echoMessage?: string;
}

export {
  TBCRecord,
  TBCCollection,
  TBCStore,
  TBCRecordOperation,
  TBCRecordOpts,
  TBCRecordStorage,
};