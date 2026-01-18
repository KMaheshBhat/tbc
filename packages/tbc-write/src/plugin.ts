import { createPlugin } from "@hami-frameworx/core";

import { WriteRecordsFlow } from "./ops/write-records.js";

/**
 * TBC Write Plugin for HAMI.
 * Provides write facade operations for TBC.
 *
 * Included operations:
 * - `tbc-write:write-records-flow`: Writes records using configured providers and updates inDEXes
 */
const TBCWritePlugin = createPlugin(
    "@tbc-frameworx/tbc-write",
    "0.1.0",
    [
        WriteRecordsFlow as any,
    ],
    "TBC Write Plugin - Write facade operations for TBC",
);

export { TBCWritePlugin };