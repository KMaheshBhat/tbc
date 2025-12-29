import { createPlugin } from "@hami-frameworx/core";

/**
 * TBC Interface Plugin for HAMI.
 * Provides interface operations for TBC.
 *
 * Included operations:
 * - Interface flows for various tools (Kilo Code, Goose, GitHub Copilot, etc.)
 */
const TBCInterfacePlugin = createPlugin(
    "@tbc-frameworx/tbc-interface",
    "0.1.0",
    [], // No nodes to register, flows are used directly
    "TBC Interface Plugin - Interface operations for TBC",
);

export { TBCInterfacePlugin };