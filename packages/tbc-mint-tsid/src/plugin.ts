import { createPlugin } from "@hami-frameworx/core";

import { MintTsidNode } from "./ops/mint.js";


/**
 * TBC Mint TSID Plugin for HAMI.
 * Provides essential TBC TSID minting operations.
 *
 * Included operations:
 * - `tbc-mint-tsid:mint`: Mints TSID IDs
 */
const TBCMintTsidPlugin = createPlugin(
    "@tbc-frameworx/tbc-mint-tsid",
    "0.1.0",
    [
        MintTsidNode as any,
    ],
    "TBC Mint TSID Plugin - TSID minting operations for TBC",
);

export { TBCMintTsidPlugin };