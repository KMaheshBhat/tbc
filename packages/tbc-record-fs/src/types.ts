/**
 * Options for TBC record file system operations.
 * Defines configuration flags that can be used across TBC record file system operations.
 */
type TBCRecordFSOpts = {
  /** Whether to enable verbose logging for operations. */
  verbose?: boolean;
}

/**
 * Shared storage interface for TBC record file system operations.
 * Defines the structure of data that can be shared between TBC record file system operation nodes.
 * Contains paths, configuration options, and results from various TBC record file system operations.
 */
type TBCRecordFSStorage = {
  /** Optional configuration options for TBC record file system operations. */
  opts?: TBCRecordFSOpts;
  /** Explicit root directory path (optional, defaults to CWD). */
  root?: string;
  /** Resolved root directory for TBC operations. */
  rootDirectory?: string;
  /** Whether the directory is a valid TBC root. */
  isValidTBCRoot?: boolean;
  /** Whether the directory is a git repository. */
  isGitRepository?: boolean;
  /** Array of validation messages. */
  messages?: string[];
  /** Collection directory to read from. */
  collection?: string;
  /** Array of record IDs to fetch. */
  IDs?: string[];
  /** Fetched records by collection and ID. */
  fetchResults?: Record<string, Record<string, Record<string, any>>>;
}

export {
  TBCRecordFSOpts,
  TBCRecordFSStorage,
};