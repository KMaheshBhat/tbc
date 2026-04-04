import { createPlugin, HAMIFlow, HAMINode } from '@hami-frameworx/core';

import { StoreRecordsNode } from './ops/store-records.js';
import { QueryRecordsNode } from './ops/query-records.js';
import { FetchRecordsNode } from './ops/fetch-records.js';

/**
 * TBC Record SQLite Plugin for HAMI.
 * Provides essential TBC record SQLite operations.
 *
 * Included operations:
 * - `tbc-record-sqlite:store-records`: Stores records into a SQLite database
 * - `tbc-record-sqlite:query-records`: Queries records from a SQLite database
 * - `tbc-record-sqlite:fetch-records`: Fetches records from a SQLite database
 */
const TBCRecordSQLitePlugin = createPlugin(
    '@tbc-frameworx/tbc-record-sqlite',
    '0.1.0',
    [
        // Nodes
        StoreRecordsNode,
        QueryRecordsNode,
        FetchRecordsNode,
    ] as unknown as (typeof HAMINode | typeof HAMIFlow)[],
    'TBC Record SQLite Plugin - SQLite database operations for TBC records',
);


export { TBCRecordSQLitePlugin };