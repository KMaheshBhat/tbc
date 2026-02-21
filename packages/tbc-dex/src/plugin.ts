import { createPlugin } from '@hami-frameworx/core';

import { GraphMinerFlow } from './ops/graph-miner-flow.js';
import { FSWalkerNode } from './ops/fs-walker.js';
import { ChangeDetectorNode } from './ops/change-detector.js';
import { MetadataExtractorNode } from './ops/metadata-extractor.js';
import { PresenceWatermarkNode } from './ops/presence-watermark-node.js';
import { SchemaWatermarkNode } from './ops/schema-watermark-node.js';
import { StructureWatermarkNode } from './ops/structure-watermark-node.js';
import { LinksWatermarkNode } from './ops/links-watermark-node.js';
import { VectorWatermarkNode } from './ops/vector-watermark-node.js';
import { IntegrityReportFlow } from './ops/integrity-report-flow.js';
import { HealthSummaryQueryNode } from './ops/health-summary-query.js';
import { ZombieDetectionNode } from './ops/zombie-detection.js';
import { OrphanDetectionNode } from './ops/orphan-detection.js';
import { SchemaViolationCheckNode } from './ops/schema-violation-check.js';
import { RepairRecommendationsNode } from './ops/repair-recommendations.js';
import { ReportGeneratorNode } from './ops/report-generator.js';
import { ViewStatusFlow } from './ops/view-status-flow.js';
import { ViewAuditFlow } from './ops/view-audit-flow.js';
import { CollateDigestNode } from './ops/collate-digest.js';
import { CollateMetadataIndexNode } from './ops/collate-metadata-index.js';
import { SyncIncrementalIndexNode } from './ops/sync-incremental-index.js';
import { QueryIndicesNode } from './ops/query-indices.js';

/**
 * TBC Dex Plugin for HAMI.
 * Provides essential TBC dex operations for generating and refreshing indexes.
 *
 * Included operations:
 * - `tbc-dex:graph-miner-flow`: Indexes filesystem records into TKG database with watermark checks
 * - `tbc-dex:fs-walker`: Discovers files in TBC collections
 * - `tbc-dex:change-detector`: Detects changed files since last indexing
 * - `tbc-dex:metadata-extractor`: Parses YAML frontmatter and extracts links
 * - `tbc-dex:integrity-report-flow`: Generates comprehensive SRE integrity reports
 * - `tbc-dex:health-summary-query`: Queries system health summary
 * - `tbc-dex:zombie-detection`: Detects broken links (zombies)
 * - `tbc-dex:orphan-detection`: Detects records with no incoming links
 * - `tbc-dex:schema-violation-check`: Checks for schema compliance issues
 * - `tbc-dex:repair-recommendations`: Generates repair suggestions
 * - `tbc-dex:report-generator`: Compiles final integrity report
 * - `tbc-dex:collate-digest`: Collates a root and system definitions
 * - `tbc-dex:collate-metadata-index`: Collates JSONL based index from metadata of records
 * - `tbc-dex:sync-incremental-index`: Incremental update of JSONL based index for dirty records
 * - `tbc-dex:query-indices`: Query indices for provided query term
 */
const TBCDexPlugin = createPlugin(
  '@tbc-frameworx/tbc-dex',
  '0.1.0',
  [
    GraphMinerFlow as any,
    FSWalkerNode as any,
    ChangeDetectorNode as any,
    MetadataExtractorNode as any,
    PresenceWatermarkNode as any,
    SchemaWatermarkNode as any,
    StructureWatermarkNode as any,
    LinksWatermarkNode as any,
    VectorWatermarkNode as any,
    IntegrityReportFlow as any,
    HealthSummaryQueryNode as any,
    ZombieDetectionNode as any,
    OrphanDetectionNode as any,
    SchemaViolationCheckNode as any,
    RepairRecommendationsNode as any,
    ReportGeneratorNode as any,
    ViewStatusFlow as any,
    ViewAuditFlow as any,
    CollateDigestNode as any,
    CollateMetadataIndexNode as any,
    SyncIncrementalIndexNode as any,
    QueryIndicesNode as any,
  ],
  'TBC Dex Plugin - Index generation, refresh operations, and SRE health checks',
);

export { TBCDexPlugin };
