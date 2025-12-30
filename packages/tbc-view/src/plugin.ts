import { createPlugin } from "@hami-frameworx/core";

import { GenerateDexCoreNode } from "./ops/generate-dex-core.js";
import { GenerateDexRecordsNode } from "./ops/generate-dex-records.js";
import { GenerateDexExtensionsNode } from "./ops/generate-dex-extensions.js";
import { GenerateDexSkillsNode } from "./ops/generate-dex-skills.js";
import { RefreshCoreFlow } from "./ops/refresh-core.js";
import { RefreshRecordsFlow } from "./ops/refresh-records.js";
import { RefreshExtensionsFlow } from "./ops/refresh-extensions.js";
import { RefreshSkillsFlow } from "./ops/refresh-skills.js";

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
    ],
    "TBC View Plugin - Index generation and refresh operations",
);

export { TBCViewPlugin };