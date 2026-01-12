import { createPlugin } from "@hami-frameworx/core";

import { PrepareMessagesNode } from "./ops/prepare-messages.js";
import { ClearMessagesNode } from "./ops/clear-messages.js";
import { LogAndClearMessagesNode } from "./ops/log-and-clear-messages.js";
import { ResolveRootDirectoryNode } from "./ops/resolve-root-directory.js";
import { LoadSystemAssetsNode } from "./ops/load-system-asset.js";
import { PrepareRecordsManifestNode } from "./ops/prepare-records-manifest.js";
import { SynthesizeMemRecordsNode } from "./ops/synthesize-mem-records.js";
import { SynthesizeSysRecordsNode } from "./ops/synthesize-sys-records.js";
import { ProbeNode } from "./ops/probe.js";
import { InitNode } from "./ops/init.js";
import { CopyAssetsNode } from "./ops/copy-assets.js";
import { GenerateRootNode } from "./ops/generate-root.js";
import { GenerateInitRecordsNode } from "./ops/generate-init-records.js";
import { GenerateInitIdsNode } from "./ops/generate-init-ids.js";
import { BackupSysNode } from "./ops/backup-sys.js";
import { BackupSkillNode } from "./ops/backup-skills.js";
import { RestoreSysExtensionsNode } from "./ops/restore-sys-extensions.js";
import { RestoreSkillExtensionsNode } from "./ops/restore-skill-extensions.js"; 
import { RestoreRootNode } from "./ops/restore-root.js";
import { ValidateNode } from "./ops/validate.js";
import { ValidateSystemNode } from "./ops/validate-system.js";
import { GenerateRoleDefinitionNode } from "./ops/generate-role-definition.js";
import { InitFlow } from "./ops/init-flow.js";
import { SysUpgradeFlow } from "./ops/sys-upgrade-flow.js";
import { SysValidateFlow } from "./ops/validate-flow.js";

/**
 * TBC System Plugin for HAMI.
 * Provides essential TBC system operations for probing environment information, initialization, validation, and core management.
 *
 * Included operations:
 * - `tbc-system:prepare-messages`: Setup staged messages for TBC operations
 * - `tbc-system:clear-messages`: Clear staged messages but add to allMessages
 * - `tbc-system:log-and-clear-messages`: Log staged messages but add to allMessages
 * - `tbc-system:resolve-root-directory`: Resolves working directory for TBC operations
 * - `tbc-system:load-system-assets`: Loads system assets into shared stage records
 * - `tbc-system:prepare-records-manifest`: Recreates the stage.manifest from stage.records
 * - `tbc-system:synthesize-mem-records`: Generates initial Party (companion and prime) and Structure (map of memory) records
 * - `tbc-system:synthesize-sys-records`: Generates system specification and connection records records
 * - `tbc-system:probe`: Probes the environment for TBC CLI version and OS/shell information
 * - `tbc-system:init`: Creates TBC directory structure (tbc/, vault/, dex/)
 * - `tbc-system:copy-assets`: Copies specs and tools from assets to TBC structure
 * - `tbc-system:generate-root`: Generates initial tbc/root.md file
 * - `tbc-system:generate-init-ids`: Generates companion.id and prime.id records for tbc/ collection
 * - `tbc-system:backup-sys`: Creates timestamped backup of sys/ directory
 * - `tbc-system:backup-skills`: Creates timestamped backup of skills/ directory
 * - `tbc-system:restore-sys-extensions`: Restores extensions/ from backup and cleans up
 * - `tbc-system:restore-skill-extensions`: Restores skills/extensions/ from backup and cleans up
 * - `tbc-system:validate`: Validates TBC directory structure (tbc/, vault/, dex/)
 * - `tbc-system:validate-system`: Validates the loaded system manifest
 * - `tbc-system:generate-role-definition`: Generates standard TBC role definition for AI integrations
 * - `tbc-system:init-flow`: Comprehensive flow for initializing a TBC environment
 * - `tbc-system:sys-upgrade-flow`: Comprehensive flow for upgrading a TBC environment
 * - `tbc-system:validate-flow`: Comprehensive flow for validating a TBC environment
 */
const TBCSystemPlugin = createPlugin(
    "@tbc-frameworx/tbc-system",
    "0.1.0",
    [
        PrepareMessagesNode as any,
        ClearMessagesNode as any,
        LogAndClearMessagesNode as any,
        ResolveRootDirectoryNode as any,
        LoadSystemAssetsNode as any,
        PrepareRecordsManifestNode as any,
        SynthesizeMemRecordsNode as any,
        SynthesizeSysRecordsNode as any,
        ProbeNode as any,
        InitNode as any,
        CopyAssetsNode as any,
        GenerateRootNode as any,
        GenerateInitRecordsNode as any,
        GenerateInitIdsNode as any,
        BackupSysNode as any,
        BackupSkillNode as any,
        RestoreSysExtensionsNode as any,
        RestoreSkillExtensionsNode as any,
        RestoreRootNode as any,
        ValidateNode as any,
        ValidateSystemNode as any,
        GenerateRoleDefinitionNode as any,
        InitFlow as any,
        SysUpgradeFlow as any,
        SysValidateFlow as any,
    ],
    "TBC System Plugin - Environment probing, initialization, validation, and core management operations",
);

export { TBCSystemPlugin };