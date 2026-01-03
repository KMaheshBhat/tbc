import { createPlugin } from "@hami-frameworx/core";

import { GenerateGenericCoreNode } from "./ops/generate-generic-core.js";
import { IntProbeFlow } from "./ops/int-probe-flow.js";
import { IntGenericFlow } from "./ops/int-generic-flow.js";
import { IntGeminiCliFlow } from "./ops/int-gemini-cli-flow.js";
import { IntGooseFlow } from "./ops/int-goose-flow.js";
import { IntGitHubCopilotFlow } from "./ops/int-github-copilot-flow.js";
import { IntKiloCodeFlow } from "./ops/int-kilocode-flow.js";

/**
 * TBC Interface Plugin for HAMI.
 * Provides interface operations for TBC.
 *
 * Included operations:
 * - Interface flows for various tools (Kilo Code, Goose, GitHub Copilot, etc.)
 * - need to write in following format:
 * - `tbc-interface:generate-generic-core`: Generates generic core files for TBC integrations
 * - `tbc-interface:int-probe-flow`: Comprehensive flow for probing TBC environment
 * - `tbc-interface:int-generic-flow`: Comprehensive flow for generic TBC integrations
 * - `tbc-interface:int-gemini-cli-flow`: Comprehensive flow for Gemini CLI integrations
 * - `tbc-interface:int-goose-flow`: Comprehensive flow for Goose integrations
 * - `tbc-interface:int-github-copilot-flow`: Comprehensive flow for GitHub Copilot integrations
 * - `tbc-interface:int-kilocode-flow`: Comprehensive flow for Kilo Code integrations
 */
const TBCInterfacePlugin = createPlugin(
    "@tbc-frameworx/tbc-interface",
    "0.1.0",
    [
        GenerateGenericCoreNode as any,
        IntProbeFlow as any,
        IntGenericFlow as any,
        IntGeminiCliFlow as any,
        IntGooseFlow as any,
        IntGitHubCopilotFlow as any,
        IntKiloCodeFlow as any,
    ],
    "TBC Interface Plugin - Interface operations for TBC",
);

export { TBCInterfacePlugin };