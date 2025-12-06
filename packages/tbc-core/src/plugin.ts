import { createPlugin } from "@hami-frameworx/core";

import { ProbeNode } from "./ops/probe.js";
import { InitNode } from "./ops/init.js";
import { CopyAssetsNode } from "./ops/copy-assets.js";
import { GenerateRootNode } from "./ops/generate-root.js";

/**
 * TBC Core Plugin for HAMI.
 * Provides essential TBC core operations for probing environment information and initialization.
 *
 * Included operations:
 * - `tbc-core:probe`: Probes the environment for TBC CLI version and OS/shell information
 * - `tbc-core:init`: Creates TBC directory structure (tbc/, vault/, dex/)
 * - `tbc-core:copy-assets`: Copies specs and tools from assets to TBC structure
 * - `tbc-core:generate-root`: Generates initial tbc/root.md file
 */
const TBCCorePlugin = createPlugin(
    "@tbc-frameworx/tbc-core",
    "0.1.0",
    [
        ProbeNode as any,
        InitNode as any,
        CopyAssetsNode as any,
        GenerateRootNode as any,
    ],
    "TBC Core Plugin - Environment probing and initialization operations",
);

export { TBCCorePlugin };