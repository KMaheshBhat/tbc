import { TBCRecordOperation } from '@tbc-frameworx/tbc-record';
import { ViewStore } from "./store/view-store.js";

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
  /** Current record operation */
  record?: TBCRecordOperation;
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
  /** Generated dex skills for storage operations. */
  generatedDexSkills?: Record<string, any>[];
  /** Records grouped by their record_type for dex generation. */
  recordsByType?: Record<string, any[]>;
  /** Array of records to store (for record-fs operations). */
  records?: Record<string, any>[];
  /** Collection directory to store records in (for record-fs operations). */
  collection?: string;
  /** ViewStore instance for TKG database operations. */
  viewStore?: ViewStore;
  /** Files discovered by FS walker. */
  discoveredFiles?: Array<{
    id: string;
    collection: string;
    filePath: string;
    hash: string;
    mtime: number;
  }>;
  /** Files that have changed since last indexing. */
  changedFiles?: Array<{
    id: string;
    collection: string;
    filePath: string;
    hash: string;
    mtime: number;
    isNew: boolean;
  }>;
  /** Records processed by metadata extractor. */
  processedRecords?: Array<{
    node: {
      id: string;
      collection: string;
      record_type: string;
      hash: string;
      last_seen_at: number;
      file_path: string;
    };
    attributes: Record<string, any>;
    edges: Array<{
      target_id: string;
      edge_type: string;
      created_at: number;
    }>;
  }>;
  /** Watermark check results. */
  watermarkResults?: Array<{
    nodeId: string;
    watermarks: Record<string, { status: number; message?: string }>;
  }>;
  /** Presence watermark results. */
  presenceResults?: Array<{
    nodeId: string;
    presence: { status: number; message?: string };
  }>;
  /** Schema watermark results. */
  schemaResults?: Array<{
    nodeId: string;
    schema: { status: number; message?: string };
  }>;
  /** Structure watermark results. */
  structureResults?: Array<{
    nodeId: string;
    structure: { status: number; message?: string };
  }>;
  /** Links watermark results. */
  linksResults?: Array<{
    nodeId: string;
    links: { status: number; message?: string };
  }>;
  /** Vector watermark results. */
  vectorResults?: Array<{
    nodeId: string;
    vector: { status: number; message?: string };
  }>;
  /** System health summary. */
  healthSummary?: {
    total_records: number;
    healthy_records: number;
    health_percentage: number;
  };
  /** Zombie links detected. */
  zombieLinks?: Array<{
    source_id: string;
    target_id: string;
    source_collection: string;
    source_type: string;
    edge_type: string;
  }>;
  /** Orphan records detected. */
  orphanRecords?: Array<{
    id: string;
    collection: string;
    record_type: string;
    title?: string;
  }>;
  /** Schema violations detected. */
  schemaViolations?: Array<{
    id: string;
    collection: string;
    record_type: string;
    violation_details?: string;
  }>;
  /** Repair recommendations. */
  repairRecommendations?: Array<{
    issue_type: string;
    severity: 'critical' | 'warning' | 'info';
    description: string;
    affected_records: number;
    recommended_action: string;
  }>;
  /** Integrity report data. */
  integrityReport?: any;
}

export type {
  TBCViewOpts,
  TBCViewStorage,
};