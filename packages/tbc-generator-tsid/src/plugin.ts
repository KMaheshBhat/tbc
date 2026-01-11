import { createPlugin } from "@hami-frameworx/core";

import { MintTsidNode } from "./ops/mint.js";


/**
 * TBC Generator TSID Plugin for HAMI.
 * Provides essential TBC TSID minting operations.
 *
 * Included operations:
 * - `tbc-generator-tsid:mint`: Mints TSID IDs
 */
const TBCGeneratorTsidPlugin = createPlugin(
    "@tbc-frameworx/tbc-generator-tsid",
    "0.1.0",
    [
        MintTsidNode as any,
    ],
    "TBC Generator TSID Plugin - TSID minting operations for TBC",
);

export { TBCGeneratorTsidPlugin };