import { createPlugin } from "@hami-frameworx/core";

import { ProbeNode } from "./ops/probe.js";
import { InitNode } from "./ops/init.js";
import { CopyAssetsNode } from "./ops/copy-assets.js";
import { GenerateRootNode } from "./ops/generate-root.js";
import { BackupTbcNode } from "./ops/backup-tbc.js";
import { RestoreExtensionsNode } from "./ops/restore-extensions.js";
import { ResolveNode } from "./ops/resolve.js";
import { ValidateNode } from "./ops/validate.js";
import { WriteCoreNode } from "./ops/write-core.js";

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
 * - `tbc-core:write-core`: Writes collated system definitions to dex/core.md
 */
const TBCCorePlugin = createPlugin(
    "@tbc-frameworx/tbc-core",
    "0.1.0",
    [
        ProbeNode as any,
        InitNode as any,
        CopyAssetsNode as any,
        GenerateRootNode as any,
        BackupTbcNode as any,
        RestoreExtensionsNode as any,
        ResolveNode as any,
        ValidateNode as any,
        WriteCoreNode as any,
    ],
    "TBC Core Plugin - Environment probing, initialization, validation, and core management operations",
);

export { TBCCorePlugin };