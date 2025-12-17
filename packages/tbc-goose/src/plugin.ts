import { createPlugin } from "@hami-frameworx/core";

import { GenerateCoreNode } from "./ops/generate-core.js";

/**
 * TBC Goose Plugin for HAMI.
 * Provides operations for generating Goose integration files.
 *
 * Included operations:
 * - `tbc-goose:generate-core`: Generates Goose hints configuration
 */
const TBCGoosePlugin = createPlugin(
    "@tbc-frameworx/tbc-goose",
    "0.1.0",
    [
        GenerateCoreNode as any,
    ],
    "TBC Goose Plugin - Operations for Goose integration",
);

export { TBCGoosePlugin };