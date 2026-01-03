import { HAMIRegistrationManager } from "@hami-frameworx/core";

/**
 * Options for TBC record SQLite operations.
 * Defines configuration flags that can be used across TBC record SQLite operations.
 */
type TBCRecordSQLiteOpts = {
  /** Whether to enable verbose logging for operations. */
  verbose?: boolean;
}

/**
 * Record structure for TBC record SQLite operations.
 * Defines the structure of a record with support for multiple file formats.
 */
type TBCRecord = {
  /** Unique identifier for the record. */
  id: string;
  /** Optional filename for the record (including extension). */
  filename?: string;
  /** Optional content type for the record. */
  contentType?: 'markdown' | 'json' | 'raw';
  /** Record content. */
  content?: string;
  /** Additional record data (used as frontmatter for markdown). */
  [key: string]: any;
}

/**
 * Shared storage interface for TBC record SQLite operations.
 * Defines the structure of data that can be shared between TBC record SQLite operation nodes.
 * Contains paths, configuration options, and results from various TBC record SQLite operations.
 */
type TBCRecordSQLiteStorage = {
  /** Optional configuration options for TBC record SQLite operations. */
  opts?: TBCRecordSQLiteOpts;
  /** SQLite database file path. */
  storePath?: string;
  /** Collection name to operate on. */
  collection?: string;
  /** Array of record IDs to fetch. */
  IDs?: string[];
  /** Fetched records by collection and ID. */
  fetchResults?: Record<string, Record<string, Record<string, any>>>;
  /** Array of records to store. */
  records?: TBCRecord[];
  /** Stored record IDs by collection. */
  storeResults?: Record<string, string[]>;
  /** Database selection for operations. */
  database?: 'records' | 'meta';
}

export {
  TBCRecordSQLiteOpts,
  TBCRecordSQLiteStorage,
  TBCRecord,
};