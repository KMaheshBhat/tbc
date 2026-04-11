import { createPlugin, HAMIFlow, HAMINode } from '@hami-frameworx/core';

import { StoreRecordsFlow } from './ops/store-records.js';
import { QueryRecordsFlow } from './ops/query-records.js';
import { FetchRecordsFlow } from './ops/fetch-records.js';

/**
 * TBC Record Plugin for HAMI.
 * Provides record facade operations for TBC.
 *
 * Included operations:
 * - `tbc-record:store-records-flow`: Stores records using configured providers
 * - `tbc-record:query-records-flow`: Queries records from configured providers
 * - `tbc-record:fetch-records-flow`: Fetches records from configured providers
 */
const TBCRecordPlugin = createPlugin(
    '@tbc-frameworx/tbc-record',
    '0.1.0',
    [
        // Flows
        StoreRecordsFlow,
        QueryRecordsFlow,
        FetchRecordsFlow,
    ] as unknown as (typeof HAMIFlow)[],
    'TBC Record Plugin - Record facade operations for TBC',
);

export { TBCRecordPlugin };