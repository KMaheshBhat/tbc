/**
 * Options for TBC core operations.
 * Defines configuration flags that can be used across TBC core operations.
 */
type TBCCoreOpts = {
  /** Whether to enable verbose logging for operations. */
  verbose?: boolean;
}

/**
 * Shared storage interface for TBC core operations.
 * Defines the structure of data that can be shared between TBC core operation nodes.
 * Contains configuration options and results from various TBC core operations.
 */
type TBCCoreStorage = {
  /** Optional configuration options for TBC core operations. */
  opts?: TBCCoreOpts;
  /** Application name (injected from CLI). */
  app?: string;
  /** Application version (injected from CLI). */
  appVersion?: string;
  /** Resolved root directory for TBC operations. */
  rootDirectory?: string;
  /** Whether the directory is a valid TBC root. */
  isValidTBCRoot?: boolean;
  /** Whether the directory is a git repository. */
  isGitRepository?: boolean;
  /** Probe results containing environment information. */
  probeResults?: string[];
}

export {
  TBCCoreOpts,
  TBCCoreStorage,
};