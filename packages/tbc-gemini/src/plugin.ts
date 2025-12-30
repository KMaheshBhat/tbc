import { createPlugin } from "@hami-frameworx/core";

import { GenerateCoreNode } from "./ops/generate-core.js";

/**
 * TBC Gemini Plugin for HAMI.
 * Provides operations for generating Gemini CLI integration files.
 *
 * Included operations:
 * - `tbc-gemini:generate-core`: Generates Gemini CLI configuration
 */
const TBCGeminiPlugin = createPlugin(
    "@tbc-frameworx/tbc-gemini",
    "0.1.0",
    [
        GenerateCoreNode as any,
    ],
    "TBC Gemini Plugin - Operations for Gemini CLI integration",
);

export { TBCGeminiPlugin };