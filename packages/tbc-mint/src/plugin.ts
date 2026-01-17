import { createPlugin } from "@hami-frameworx/core";

import { UuidNode } from "./ops/uuid.js";
import { TsidNode } from "./ops/tsid.js";
import { GenUuidFlow } from "./ops/gen-uuid-flow.js";
import { GenTsidFlow } from "./ops/gen-tsid-flow.js";
import { MintIDsFlow } from "./ops/mint-ids-flow.js";


/**
 * TBC Mint Plugin for HAMI.
 * Provides essential TBC ID minting operations.
 *
 * Included operations:
 * - `tbc-mint:uuid`: Generates a UUID v7
 * - `tbc-mint:tsid`: Generates a UTC timestamp ID in YYYYMMDDHHmmSS format
 * - `tbc-cli:gen-uuid`: Flow to generate multiple UUIDs and log them
 * - `tbc-cli:gen-tsid`: Flow to generate multiple TSIDs and log them
 * - `tbc-mint:mint-ids-flow`: Flow to generate multiple IDs (keyed and batched) for given types
 */
const TBCMintPlugin = createPlugin(
    "@tbc-frameworx/tbc-mint",
    "0.1.0",
    [
        UuidNode as any,
        TsidNode as any,
        GenUuidFlow as any,
        GenTsidFlow as any,
        MintIDsFlow as any,
    ],
    "TBC Mint Plugin - ID minting operations for TBC",
);

export { TBCMintPlugin };