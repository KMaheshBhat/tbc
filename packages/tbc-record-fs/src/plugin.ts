import { createPlugin, HAMIFlow, HAMINode } from '@hami-frameworx/core';

import { FetchRecordsNode } from './ops/fetch-records.js';
import { QueryRecordsNode } from './ops/query-records.js';
import { StoreRecordsNode } from './ops/store-records.js';

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
    '@tbc-frameworx/tbc-record-fs',
    '0.1.0',
    [
        // Nodes
        FetchRecordsNode,
        StoreRecordsNode,
        QueryRecordsNode,
    ] as (typeof HAMINode | typeof HAMIFlow)[],
    'TBC Record File System Plugin - File system operations for TBC directories',
);

export { TBCRecordFSPlugin };