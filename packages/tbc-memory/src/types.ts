/**
 * Options for TBC memory operations.
 * Defines configuration flags that can be used across TBC memory operations.
 */
type TBCMemoryOpts = {
  /** Whether to enable verbose logging for operations. */
  verbose?: boolean;
  /** Whether to print full record instead of just ID. */
  full?: boolean;
}

/**
 * Shared storage interface for TBC memory operations.
 * Defines the structure of data that can be shared between TBC memory operation nodes.
 * Contains configuration options and results from various TBC memory operations.
 */
type TBCMemoryStorage = {
  /** Optional configuration options for TBC memory operations. */
  opts?: TBCMemoryOpts;
  /** Root directory for operations */
  rootDirectory?: string;
  /** Companion ID */
  companionId?: string;
  /** Companion name */
  companionName?: string;
  /** Companion record */
  companionRecord?: Record<string, any>;
  /** Prime ID */
  primeId?: string;
  /** Prime name */
  primeName?: string;
  /** Prime record */
  primeRecord?: Record<string, any>;
  /** Fetch results from record-fs operations */
  fetchResults?: Record<string, Record<string, any>>;
  /** Collection for record operations */
  collection?: string;
  /** IDs for record operations */
  IDs?: string[];
}

export {
  TBCMemoryOpts,
  TBCMemoryStorage,
};