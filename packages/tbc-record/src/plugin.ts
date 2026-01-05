import { createPlugin } from "@hami-frameworx/core";

import { FetchRecordsFlow } from "./ops/fetch-records.js";
import { StoreRecordsFlow } from "./ops/store-records.js";

/**
 * TBC Record Plugin for HAMI.
 * Provides record facade operations for TBC.
 *
 * Included operations:
 * - `tbc-record:fetch-records-flow`: Fetches records from configured providers
 * - `tbc-record:store-records-flow`: Stores records using configured providers
 */
const TBCRecordPlugin = createPlugin(
    "@tbc-frameworx/tbc-record",
    "0.1.0",
    [
        FetchRecordsFlow as any,
        StoreRecordsFlow as any,
    ],
    "TBC Record Plugin - Record facade operations for TBC",
);

export { TBCRecordPlugin };