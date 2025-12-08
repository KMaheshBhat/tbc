import { createPlugin } from "@hami-frameworx/core";

import { ResolveNode } from "./ops/resolve.js";
import { ValidateNode } from "./ops/validate.js";
import { FetchRecordsByIdsNode } from "./ops/fetch-records-by-ids.js";

/**
 * TBC Record File System Plugin for HAMI.
 * Provides essential TBC record file system operations.
 *
 * Included operations:
 * - `tbc-record-fs:resolve`: Resolves strategy to target working directory
 * - `tbc-record-fs:validate`: Validates TBC directory structure (tbc/, vault/, dex/)
 * - `tbc-record-fs:fetch-records-by-ids`: Fetches records by IDs from a collection directory
 */
const TBCRecordFSPlugin = createPlugin(
    "@tbc-frameworx/tbc-record-fs",
    "0.1.0",
    [
        ResolveNode as any,
        ValidateNode as any,
        FetchRecordsByIdsNode as any,
    ],
    "TBC Record File System Plugin - File system operations for TBC directories",
);

export { TBCRecordFSPlugin };