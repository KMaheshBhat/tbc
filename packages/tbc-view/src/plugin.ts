import { createPlugin } from "@hami-frameworx/core";

import { GenerateDexCoreNode } from "./ops/generate-dex-core.js";
import { GenerateDexRecordsNode } from "./ops/generate-dex-records.js";
import { GenerateDexExtensionsNode } from "./ops/generate-dex-extensions.js";
import { GenerateDexSkillsNode } from "./ops/generate-dex-skills.js";
import { RefreshCoreFlow } from "./ops/refresh-core.js";
import { RefreshRecordsFlow } from "./ops/refresh-records.js";
import { RefreshExtensionsFlow } from "./ops/refresh-extensions.js";
import { RefreshSkillsFlow } from "./ops/refresh-skills.js";
import { GraphMinerFlow } from "./ops/graph-miner-flow.js";
import { FSWalkerNode } from "./ops/fs-walker.js";
import { ChangeDetectorNode } from "./ops/change-detector.js";
import { MetadataExtractorNode } from "./ops/metadata-extractor.js";
import { WatermarkExecutorNode } from "./ops/watermark-executor.js";
import { IntegrityReportFlow } from "./ops/integrity-report-flow.js";
import { HealthSummaryQueryNode } from "./ops/health-summary-query.js";
import { ZombieDetectionNode } from "./ops/zombie-detection.js";
import { OrphanDetectionNode } from "./ops/orphan-detection.js";
import { SchemaViolationCheckNode } from "./ops/schema-violation-check.js";
import { RepairRecommendationsNode } from "./ops/repair-recommendations.js";
import { ReportGeneratorNode } from "./ops/report-generator.js";
import { ViewStatusFlow } from "./ops/view-status-flow.js";
import { ViewAuditFlow } from "./ops/view-audit-flow.js";

/**
 * TBC View Plugin for HAMI.
 * Provides essential TBC view operations for generating and refreshing indexes.
 *
 * Included operations:
 * - `tbc-view:generate-dex-core`: Generates collated system definitions record for dex/core.md
 * - `tbc-view:generate-dex-records`: Generates records indexes records for dex/{record_type}.md files
 * - `tbc-view:generate-dex-extensions`: Generates extensions index record for dex/extensions.md
 * - `tbc-view:generate-dex-skills`: Generates skills index record for dex/skills.md
 * - `tbc-view:refresh-core`: Refreshes core system definitions index from root and specs
 * - `tbc-view:refresh-records`: Refreshes all records indexes from vault
 * - `tbc-view:refresh-extensions`: Refreshes extensions index from tbc/extensions
 * - `tbc-view:refresh-skills`: Refreshes skills index from skills/ directory
 * - `tbc-view:graph-miner-flow`: Indexes filesystem records into TKG database with watermark checks
 * - `tbc-view:fs-walker`: Discovers files in TBC collections
 * - `tbc-view:change-detector`: Detects changed files since last indexing
 * - `tbc-view:metadata-extractor`: Parses YAML frontmatter and extracts links
 * - `tbc-view:watermark-executor`: Executes integrity watermark checks
 * - `tbc-view:integrity-report-flow`: Generates comprehensive SRE integrity reports
 * - `tbc-view:health-summary-query`: Queries system health summary
 * - `tbc-view:zombie-detection`: Detects broken links (zombies)
 * - `tbc-view:orphan-detection`: Detects records with no incoming links
 * - `tbc-view:schema-violation-check`: Checks for schema compliance issues
 * - `tbc-view:repair-recommendations`: Generates repair suggestions
 * - `tbc-view:report-generator`: Compiles final integrity report
 */
const TBCViewPlugin = createPlugin(
    "@tbc-frameworx/tbc-view",
    "0.1.0",
    [
        GenerateDexCoreNode as any,
        GenerateDexRecordsNode as any,
        GenerateDexExtensionsNode as any,
        GenerateDexSkillsNode as any,
        RefreshCoreFlow as any,
        RefreshRecordsFlow as any,
        RefreshExtensionsFlow as any,
        RefreshSkillsFlow as any,
        GraphMinerFlow as any,
        FSWalkerNode as any,
        ChangeDetectorNode as any,
        MetadataExtractorNode as any,
        WatermarkExecutorNode as any,
        IntegrityReportFlow as any,
        HealthSummaryQueryNode as any,
        ZombieDetectionNode as any,
        OrphanDetectionNode as any,
        SchemaViolationCheckNode as any,
        RepairRecommendationsNode as any,
        ReportGeneratorNode as any,
        ViewStatusFlow as any,
        ViewAuditFlow as any,
    ],
    "TBC View Plugin - Index generation, refresh operations, and SRE health checks",
);

export { TBCViewPlugin };