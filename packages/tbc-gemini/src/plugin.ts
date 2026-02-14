import { createPlugin } from "@hami-frameworx/core";

import { GenerateCoreNode } from "./ops/generate-core.js";
import { LoadAssetsNode } from "./ops/load-assets.js";
import { SynthesizeIntegrationRecordsNode } from "./ops/synthesize-integration-records.js";

/**
 * TBC Gemini Plugin for HAMI.
 * Provides operations for generating Gemini CLI integration files.
 *
 * Included operations:
 * - `tbc-gemini:generate-core`: Generates Gemini CLI configuration
 * - `tbc-gemini:load-assets`: Load templates
 * - `tbc-gemini:synthesize-integration-records`: Synthetize agent records for Gemini CLI interface
 */
const TBCGeminiPlugin = createPlugin(
    "@tbc-frameworx/tbc-gemini",
    "0.1.0",
    [
        GenerateCoreNode as any,
        LoadAssetsNode as any,
        SynthesizeIntegrationRecordsNode as any,
    ],
    "TBC Gemini Plugin - Operations for Gemini CLI integration",
);

export { TBCGeminiPlugin };