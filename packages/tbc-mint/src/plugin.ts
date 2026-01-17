import { createPlugin } from "@hami-frameworx/core";

import { MintIDsFlow } from "./ops/mint-ids-flow.js";


/**
 * TBC Mint Plugin for HAMI.
 * Provides essential TBC ID minting operations.
 *
 * Included operations:
 * - `tbc-mint:mint-ids-flow`: Flow to generate multiple IDs (keyed and batched) for given types
 */
const TBCMintPlugin = createPlugin(
    "@tbc-frameworx/tbc-mint",
    "0.1.0",
    [
        MintIDsFlow as any,
    ],
    "TBC Mint Plugin - ID minting operations for TBC",
);

export { TBCMintPlugin };