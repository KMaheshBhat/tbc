import { createPlugin } from "@hami-frameworx/core";

import { GenerateCoreNode } from "./ops/generate-core.js";

/**
 * TBC Kilo Code Plugin for HAMI.
 * Provides operations for generating Kilo Code integration files.
 *
 * Included operations:
 * - `tbc-kilocode:generate-core`: Generates Kilo Code modes configuration
 */
const TBCKilocodePlugin = createPlugin(
    "@tbc-frameworx/tbc-kilocode",
    "0.1.0",
    [
        GenerateCoreNode as any,
    ],
    "TBC Kilo Code Plugin - Operations for Kilo Code integration",
);

export { TBCKilocodePlugin };