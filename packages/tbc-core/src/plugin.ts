import { createPlugin } from "@hami-frameworx/core";

import { ProbeNode } from "./ops/probe.js";

/**
 * TBC Core Plugin for HAMI.
 * Provides essential TBC core operations for probing environment information.
 *
 * Included operations:
 * - `tbc-core:probe`: Probes the environment for TBC CLI version and OS/shell information
 */
const TBCCorePlugin = createPlugin(
    "@tbc-frameworx/tbc-core",
    "0.1.0",
    [
        ProbeNode as any,
    ],
    "TBC Core Plugin - Environment probing operations",
);

export { TBCCorePlugin };