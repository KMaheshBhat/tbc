/**
 * Options for TBC activity operations.
 * Defines configuration flags that can be used across TBC activity operations.
 */
type TBCActivityOpts = {
  /** Whether to enable verbose logging for operations. */
  verbose?: boolean;
  /** Activity UUID for operations */
  activityId?: string;
  /** Record type for stub generation (activity log) */
  recordType?: 'log';
  /** Target state for directory move */
  targetState?: 'backlog' | 'current' | 'archive';
}

/**
 * Shared storage interface for TBC activity operations.
 * Defines the structure of data that can be shared between TBC activity operation nodes.
 * Contains configuration options and results from various TBC activity operations.
 */
type TBCActivityStorage = {
  /** Optional configuration options for TBC activity operations. */
  opts?: TBCActivityOpts;
  /** Root directory for operations */
  rootDirectory?: string;
  /** Activity ID (UUID) */
  activityId?: string;
  /** Activity state: backlog, current, or archive */
  activityState?: 'backlog' | 'current' | 'archive';
  /** Generated UUIDs */
  generatedIds?: string[];
  /** Count for generation */
  count?: number;
  /** Root for operations */
  root?: string;
  /** Records to store */
  records?: any[];
  /** ID of the created record */
  createdRecordId?: string;
  /** Companion ID for tagging */
  companionId?: string;
  /** Companion name */
  companionName?: string;
  /** Fetch results from record-fs operations */
  fetchResults?: Record<string, Record<string, any>>;
  /** Collection for record operations */
  collection?: string;
  /** IDs for record operations */
  IDs?: string[];
}

export {
  TBCActivityOpts,
  TBCActivityStorage,
};