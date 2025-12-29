/**
 * Options for TBC view operations.
 * Defines configuration flags that can be used across TBC view operations.
 */
type TBCViewOpts = {
  /** Whether to enable verbose logging for operations. */
  verbose?: boolean;
}

/**
 * Shared storage interface for TBC view operations.
 * Defines the structure of data that can be shared between TBC view operation nodes.
 * Contains configuration options and results from various TBC view operations.
 */
type TBCViewStorage = {
  /** Optional configuration options for TBC view operations. */
  opts?: TBCViewOpts;
  /** Explicit root directory path (optional, defaults to CWD). */
  root?: string;
  /** Resolved root directory for TBC operations. */
  rootDirectory?: string;
  /** Fetched records by collection and ID (from record-fs operations). */
  fetchResults?: Record<string, Record<string, Record<string, any>>>;
  /** Generated dex core record for storage operations. */
  generatedDexCore?: Record<string, any>;
  /** Generated dex records for storage operations. */
  generatedDexRecords?: Record<string, any>[];
  /** Generated dex extensions for storage operations. */
  generatedDexExtensions?: Record<string, any>[];
  /** Records grouped by their record_type for dex generation. */
  recordsByType?: Record<string, any[]>;
  /** Array of records to store (for record-fs operations). */
  records?: Record<string, any>[];
  /** Collection directory to store records in (for record-fs operations). */
  collection?: string;
}

export type {
  TBCViewOpts,
  TBCViewStorage,
};