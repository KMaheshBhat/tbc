import { createPlugin } from '@hami-frameworx/core';

import { StoreRecordsNode } from './ops/store-records.js';

/**
 * TBC Record SQLite Plugin for HAMI.
 * Provides essential TBC record SQLite operations.
 *
 * Included operations:
 * - `tbc-record-sqlite:store-records`: Stores records into a SQLite database
 */
const TBCRecordSQLitePlugin = createPlugin(
    '@tbc-frameworx/tbc-record-sqlite',
    '0.1.0',
    [
        StoreRecordsNode as any,
    ],
    'TBC Record SQLite Plugin - SQLite database operations for TBC records',
);

export { TBCRecordSQLitePlugin };