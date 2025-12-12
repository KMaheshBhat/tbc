import { createPlugin } from "@hami-frameworx/core";

import { UuidNode } from "./ops/uuid.js";
import { TsidNode } from "./ops/tsid.js";

/**
 * TBC Generator Plugin for HAMI.
 * Provides essential TBC ID generation operations.
 *
 * Included operations:
 * - `tbc-generator:uuid`: Generates a UUID v7
 * - `tbc-generator:tsid`: Generates a UTC timestamp ID in YYYYMMDDHHmmSS format
 */
const TBCGeneratorPlugin = createPlugin(
    "@tbc-frameworx/tbc-generator",
    "0.1.0",
    [
        UuidNode as any,
        TsidNode as any,
    ],
    "TBC Generator Plugin - ID generation operations for TBC",
);

export { TBCGeneratorPlugin };