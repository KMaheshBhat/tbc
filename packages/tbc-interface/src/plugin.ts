import { createPlugin } from "@hami-frameworx/core";

import { GenerateGenericCoreNode } from "./ops/generate-generic-core.js";
import { IntProbeFlow } from "./ops/int-probe-flow.js";
import { IntGeminiCliFlow } from "./ops/int-gemini-cli-flow.js";
import { IntGooseFlow } from "./ops/int-goose-flow.js";
import { IntGitHubCopilotFlow } from "./ops/int-github-copilot-flow.js";
import { IntKiloCodeFlow } from "./ops/int-kilocode-flow.js";
import { IntGenericFlow } from "./ops/int-generic-flow.js";
import { AgentIntegrateFlow } from "./ops/agent-integrate-flow.js";
import { LoadGenericAssetsNode } from "./ops/load-generic-asset.js";
import { SynthesizeGenericRecordsNode } from "./ops/synthesize-generic-records.js";

/**
 * TBC Interface Plugin for HAMI.
 * Provides interface operations for TBC.
 *
 * Included operations:
 * - Interface flows for various tools (Kilo Code, Goose, GitHub Copilot, etc.)
 * - need to write in following format:
 * - `tbc-interface:generate-generic-core`: Generates generic core files for TBC integrations
 * - `tbc-interface:int-probe-flow`: Comprehensive flow for probing TBC environment
 * - `tbc-interface:int-gemini-cli-flow`: Comprehensive flow for Gemini CLI integrations
 * - `tbc-interface:int-goose-flow`: Comprehensive flow for Goose integrations
 * - `tbc-interface:int-github-copilot-flow`: Comprehensive flow for GitHub Copilot integrations
 * - `tbc-interface:int-kilocode-flow`: Comprehensive flow for Kilo Code integrations
 * - `tbc-interface:int-generic-flow`: Comprehensive flow for generic TBC integrations
 * - `tbc-interface:agent-integrate-flow`: Generate files required for agent integrations
 * - `tbc-interface:load-generic-assets`: Loads generic assets into shared stage records
 * - `tbc-interface:synthetize-generic-records`: Synthetize agent records (AGENTS.md) for generic interface
 */
const TBCInterfacePlugin = createPlugin(
    "@tbc-frameworx/tbc-interface",
    "0.1.0",
    [
        GenerateGenericCoreNode as any,
        IntProbeFlow as any,
        IntGeminiCliFlow as any,
        IntGooseFlow as any,
        IntGitHubCopilotFlow as any,
        IntKiloCodeFlow as any,
        IntGenericFlow as any,
        AgentIntegrateFlow as any,
        LoadGenericAssetsNode as any,
        SynthesizeGenericRecordsNode as any,
    ],
    "TBC Interface Plugin - Interface operations for TBC",
);

export { TBCInterfacePlugin };