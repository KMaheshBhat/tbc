import { createPlugin } from "@hami-frameworx/core";

import { ProbeNode } from "./ops/probe.js";
import { InitNode } from "./ops/init.js";
import { CopyAssetsNode } from "./ops/copy-assets.js";
import { GenerateRootNode } from "./ops/generate-root.js";
import { GenerateInitRecordsNode } from "./ops/generate-init-records.js";
import { GenerateInitIdsNode } from "./ops/generate-init-ids.js";
import { BackupTbcNode } from "./ops/backup-tbc.js";
import { RestoreExtensionsNode } from "./ops/restore-extensions.js";
import { RestoreRootNode } from "./ops/restore-root.js";
import { ResolveNode } from "./ops/resolve.js";
import { ValidateNode } from "./ops/validate.js";
import { GenerateDexCoreNode } from "./ops/generate-dex-core.js";
import { GenerateDexRecordsNode } from "./ops/generate-dex-records.js";
import { RefreshRecordsFlow } from "./ops/refresh-records.js";
import { RefreshCoreFlow } from "./ops/refresh-core.js";

/**
 * TBC Core Plugin for HAMI.
 * Provides essential TBC core operations for probing environment information, initialization, validation, and core management.
 *
 * Included operations:
 * - `tbc-core:probe`: Probes the environment for TBC CLI version and OS/shell information
 * - `tbc-core:init`: Creates TBC directory structure (tbc/, vault/, dex/)
 * - `tbc-core:copy-assets`: Copies specs and tools from assets to TBC structure
 * - `tbc-core:generate-root`: Generates initial tbc/root.md file
 * - `tbc-core:generate-init-ids`: Generates companion.id and prime.id records for tbc/ collection
 * - `tbc-core:backup-tbc`: Creates timestamped backup of tbc/ directory
 * - `tbc-core:restore-extensions`: Restores extensions/ from backup and cleans up
 * - `tbc-core:resolve`: Resolves working directory for TBC operations
 * - `tbc-core:validate`: Validates TBC directory structure (tbc/, vault/, dex/)
 * - `tbc-core:generate-dex-core`: Generates collated system definitions record for dex/core.md
 * - `tbc-core:generate-dex-records`: Generates records indexes records for dex/{record_type}.md files
 * - `tbc-core:refresh-core`: Refreshes core system definitions index from root, specs, and extensions
 * - `tbc-core:refresh-records`: Refreshes all records indexes from vault
 */
const TBCCorePlugin = createPlugin(
    "@tbc-frameworx/tbc-core",
    "0.1.0",
    [
        ProbeNode as any,
        InitNode as any,
        CopyAssetsNode as any,
        GenerateRootNode as any,
        GenerateInitRecordsNode as any,
        GenerateInitIdsNode as any,
        BackupTbcNode as any,
        RestoreExtensionsNode as any,
        RestoreRootNode as any,
        ResolveNode as any,
        ValidateNode as any,
        GenerateDexCoreNode as any,
        GenerateDexRecordsNode as any,
        RefreshCoreFlow as any,
        RefreshRecordsFlow as any,
    ],
    "TBC Core Plugin - Environment probing, initialization, validation, and core management operations",
);

export { TBCCorePlugin };