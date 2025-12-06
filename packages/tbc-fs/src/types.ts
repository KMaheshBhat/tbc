/**
 * Options for TBC file system operations.
 * Defines configuration flags that can be used across TBC file system operations.
 */
type TBCFSOpts = {
  /** Whether to enable verbose logging for operations. */
  verbose?: boolean;
}

/**
 * Shared storage interface for TBC file system operations.
 * Defines the structure of data that can be shared between TBC file system operation nodes.
 * Contains paths, configuration options, and results from various TBC file system operations.
 */
type TBCFSStorage = {
  /** Optional configuration options for TBC file system operations. */
  opts?: TBCFSOpts;
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
}

export {
  TBCFSOpts,
  TBCFSStorage,
};