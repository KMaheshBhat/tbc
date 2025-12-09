import { createPlugin } from "@hami-frameworx/core";

import { FetchRecordsNode } from "./ops/fetch-records.js";
import { FetchAllIdsNode } from "./ops/fetch-all-ids.js";

/**
 * TBC Record File System Plugin for HAMI.
 * Provides essential TBC record file system operations.
 *
 * Included operations:
 * - `tbc-record-fs:fetch-records`: Fetches records by IDs from a collection directory
 * - `tbc-record-fs:fetch-all-ids`: Retrieves all record IDs from a collection directory
 */
const TBCRecordFSPlugin = createPlugin(
    "@tbc-frameworx/tbc-record-fs",
    "0.1.0",
    [
        FetchRecordsNode as any,
        FetchAllIdsNode as any,
    ],
    "TBC Record File System Plugin - File system operations for TBC directories",
);

export { TBCRecordFSPlugin };