import { createPlugin } from "@hami-frameworx/core";

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
import { ResolveNode } from "./ops/resolve.js";
import { ValidateNode } from "./ops/validate.js";
import { GenerateRoleDefinitionNode } from "./ops/generate-role-definition.js";

/**
 * TBC System Plugin for HAMI.
 * Provides essential TBC system operations for probing environment information, initialization, validation, and core management.
 *
 * Included operations:
 * - `tbc-system:probe`: Probes the environment for TBC CLI version and OS/shell information
 * - `tbc-system:init`: Creates TBC directory structure (tbc/, vault/, dex/)
 * - `tbc-system:copy-assets`: Copies specs and tools from assets to TBC structure
 * - `tbc-system:generate-root`: Generates initial tbc/root.md file
 * - `tbc-system:generate-init-ids`: Generates companion.id and prime.id records for tbc/ collection
 * - `tbc-system:backup-sys`: Creates timestamped backup of sys/ directory
 * - `tbc-system:backup-skills`: Creates timestamped backup of skills/ directory
 * - `tbc-system:restore-sys-extensions`: Restores extensions/ from backup and cleans up
 * - `tbc-system:restore-skill-extensions`: Restores skills/extensions/ from backup and cleans up
 * - `tbc-system:resolve`: Resolves working directory for TBC operations
 * - `tbc-system:validate`: Validates TBC directory structure (tbc/, vault/, dex/)
 * - `tbc-system:generate-role-definition`: Generates standard TBC role definition for AI integrations
 */
const TBCSystemPlugin = createPlugin(
    "@tbc-frameworx/tbc-system",
    "0.1.0",
    [
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
        ResolveNode as any,
        ValidateNode as any,
        GenerateRoleDefinitionNode as any,
    ],
    "TBC System Plugin - Environment probing, initialization, validation, and core management operations",
);

export { TBCSystemPlugin };