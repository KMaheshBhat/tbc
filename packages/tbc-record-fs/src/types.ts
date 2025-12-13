import { HAMIRegistrationManager } from "@hami-frameworx/core";

/**
 * Options for TBC record file system operations.
 * Defines configuration flags that can be used across TBC record file system operations.
 */
type TBCRecordFSOpts = {
  /** Whether to enable verbose logging for operations. */
  verbose?: boolean;
}

/**
 * Record structure for TBC record file system operations.
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
  /** Array of records to store. */
  records?: TBCRecord[];
  /** Stored record IDs by collection. */
  storeResults?: Record<string, string[]>;
}

export {
  TBCRecordFSOpts,
  TBCRecordFSStorage,
  TBCRecord,
};