import { createPlugin } from "@hami-frameworx/core";

import { LoadAssetsNode } from "./ops/load-assets.js";
import { SynthesizeIntegrationRecordsNode } from "./ops/synthesize-integration-records.js";

/**
 * TBC GitHub Copilot Plugin for HAMI.
 * Provides operations for generating GitHub Copilot integration files.
 *
 * Included operations:
 * - `tbc-github-copilot:load-assets`: Load templates
 * - `tbc-github-copilot:synthesize-integration-records`: Synthetize agent records for GitHub Copilot interface
 */
const TBCGitHubCopilotPlugin = createPlugin(
    "@tbc-frameworx/tbc-github-copilot",
    "0.1.0",
    [
        LoadAssetsNode as any,
        SynthesizeIntegrationRecordsNode as any,
    ],
    "TBC GitHub Copilot Plugin - Operations for GitHub Copilot integration",
);

export { TBCGitHubCopilotPlugin };