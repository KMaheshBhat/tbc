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
  /** Optional configuration options for TBC record operations. */
  opts?: TBCRecordOpts;
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
  TBCRecordOpts,
  TBCRecordStorage,
};