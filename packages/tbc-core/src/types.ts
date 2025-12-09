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
  /** Probe results containing environment information. */
  probeResults?: string[];
  /** Init results containing directory creation information. */
  initResults?: string[];
  /** Path to assets directory for copying operations. */
  assetsPath?: string;
  /** Copy assets results containing copy operation information. */
  copyAssetsResults?: string[];
  /** Generate root results containing root.md generation information. */
  generateRootResults?: string[];
  /** Backup TBC results containing backup operation information. */
  backupTbcResults?: { backedUp: boolean; backupPath?: string };
  /** Restore extensions results containing restore operation information. */
  restoreExtensionsResults?: { restored: boolean; message?: string };
}

export {
  TBCCoreOpts,
  TBCCoreStorage,
};