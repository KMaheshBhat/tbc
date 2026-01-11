import { createPlugin } from "@hami-frameworx/core";

import { MintUuidNode } from "./ops/mint.js";


/**
 * TBC Generator UUID Plugin for HAMI.
 * Provides essential TBC UUID minting operations.
 *
 * Included operations:
 * - `tbc-generator-uuid:mint`: Mints UUID v7 IDs
 */
const TBCGeneratorUuidPlugin = createPlugin(
    "@tbc-frameworx/tbc-generator-uuid",
    "0.1.0",
    [
        MintUuidNode as any,
    ],
    "TBC Generator UUID Plugin - UUID minting operations for TBC",
);

export { TBCGeneratorUuidPlugin };