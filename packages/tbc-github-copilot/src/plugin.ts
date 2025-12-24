import { createPlugin } from "@hami-frameworx/core";

import { GenerateCoreNode } from "./ops/generate-core.js";

/**
 * TBC GitHub Copilot Plugin for HAMI.
 * Provides operations for generating GitHub Copilot integration files.
 *
 * Included operations:
 * - `tbc-github-copilot:generate-core`: Generates GitHub Copilot instructions configuration
 */
const TBCGitHubCopilotPlugin = createPlugin(
    "@tbc-frameworx/tbc-github-copilot",
    "0.1.0",
    [
        GenerateCoreNode as any,
    ],
    "TBC GitHub Copilot Plugin - Operations for GitHub Copilot integration",
);

export { TBCGitHubCopilotPlugin };