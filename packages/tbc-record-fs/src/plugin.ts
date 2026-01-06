import { createPlugin } from "@hami-frameworx/core";

import { StoreRecordsNode } from "./ops/store-records.js";
import { QueryRecordsNode } from "./ops/query-records.js";
import { FetchRecordsNode } from "./ops/fetch-records.js";

/**
 * TBC Record File System Plugin for HAMI.
 * Provides essential TBC record file system operations.
 *
 * Included operations:
 * - `tbc-record-fs:store-records`: Stores records into a collection directory
 * - `tbc-record-fs:query-records`: Queries records from a collection directory
 * - `tbc-record-fs:fetch-records`: Fetches records by IDs from a collection directory
 */
const TBCRecordFSPlugin = createPlugin(
    "@tbc-frameworx/tbc-record-fs",
    "0.1.0",
    [
        FetchRecordsNode as any,
        StoreRecordsNode as any,
        QueryRecordsNode as any,
    ],
    "TBC Record File System Plugin - File system operations for TBC directories",
);

export { TBCRecordFSPlugin };