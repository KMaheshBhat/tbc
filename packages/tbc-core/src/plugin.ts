import { createPlugin } from "@hami-frameworx/core";

import { ProbeNode } from "./ops/probe.js";
import { InitNode } from "./ops/init.js";
import { CopyAssetsNode } from "./ops/copy-assets.js";
import { GenerateRootNode } from "./ops/generate-root.js";
import { CreateRecordsNode } from "./ops/create-records.js";
import { WriteIdsNode } from "./ops/write-ids.js";
import { BackupTbcNode } from "./ops/backup-tbc.js";
import { RestoreExtensionsNode } from "./ops/restore-extensions.js";
import { RestoreRootNode } from "./ops/restore-root.js";
import { ResolveNode } from "./ops/resolve.js";
import { ValidateNode } from "./ops/validate.js";
import { WriteDexCoreNode } from "./ops/write-dex-core.js";
import { WriteDexRecordsNode } from "./ops/write-dex-records.js";
import { RefreshRecordsFlow } from "./ops/refresh-records.js";

/**
 * TBC Core Plugin for HAMI.
 * Provides essential TBC core operations for probing environment information, initialization, validation, and core management.
 *
 * Included operations:
 * - `tbc-core:probe`: Probes the environment for TBC CLI version and OS/shell information
 * - `tbc-core:init`: Creates TBC directory structure (tbc/, vault/, dex/)
 * - `tbc-core:copy-assets`: Copies specs and tools from assets to TBC structure
 * - `tbc-core:generate-root`: Generates initial tbc/root.md file
 * - `tbc-core:backup-tbc`: Creates timestamped backup of tbc/ directory
 * - `tbc-core:restore-extensions`: Restores extensions/ from backup and cleans up
 * - `tbc-core:resolve`: Resolves working directory for TBC operations
 * - `tbc-core:validate`: Validates TBC directory structure (tbc/, vault/, dex/)
 * - `tbc-core:write-dex-core`: Writes collated system definitions to dex/core.md
 * - `tbc-core:write-dex-records`: Writes records indexes to dex/{record_type}.md files
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
        CreateRecordsNode as any,
        WriteIdsNode as any,
        BackupTbcNode as any,
        RestoreExtensionsNode as any,
        RestoreRootNode as any,
        ResolveNode as any,
        ValidateNode as any,
        WriteDexCoreNode as any,
        WriteDexRecordsNode as any,
        RefreshRecordsFlow as any,
    ],
    "TBC Core Plugin - Environment probing, initialization, validation, and core management operations",
);

export { TBCCorePlugin };