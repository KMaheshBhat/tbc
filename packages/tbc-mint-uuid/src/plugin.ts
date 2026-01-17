import { createPlugin } from "@hami-frameworx/core";

import { MintUuidNode } from "./ops/mint.js";


/**
 * TBC Mint UUID Plugin for HAMI.
 * Provides essential TBC UUID minting operations.
 *
 * Included operations:
 * - `tbc-mint-uuid:mint`: Mints UUID v7 IDs
 */
const TBCMintUuidPlugin = createPlugin(
    "@tbc-frameworx/tbc-mint-uuid",
    "0.1.0",
    [
        MintUuidNode as any,
    ],
    "TBC Mint UUID Plugin - UUID minting operations for TBC",
);

export { TBCMintUuidPlugin };