import { createPlugin } from "@hami-frameworx/core";

import { FetchRecordsNode } from "./ops/fetch-records.js";
import { QueryRecordsNode } from "./ops/query-records.js";
import { StoreRecordsNode } from "./ops/store-records.js";
import { FetchRelationsNode } from "./ops/fetch-relations.js";
import { StoreRelationsNode } from "./ops/store-relations.js";

/**
 * TBC Record SQLite Plugin for HAMI.
 * Provides essential TBC record SQLite operations.
 *
 * Included operations:
 * - `tbc-record-sqlite:fetch-records`: Fetches records by IDs from a SQLite database
 * - `tbc-record-sqlite:query-records`: Queries records from a SQLite database collection
 * - `tbc-record-sqlite:store-records`: Stores records into a SQLite database
 * - `tbc-record-sqlite:fetch-relations`: Fetches relationships between records
 * - `tbc-record-sqlite:store-relations`: Stores relationships between records
 */
const TBCRecordSQLitePlugin = createPlugin(
    "@tbc-frameworx/tbc-record-sqlite",
    "0.1.0",
    [
        FetchRecordsNode as any,
        QueryRecordsNode as any,
        StoreRecordsNode as any,
        FetchRelationsNode as any,
        StoreRelationsNode as any,
    ],
    "TBC Record SQLite Plugin - SQLite database operations for TBC records",
);

export { TBCRecordSQLitePlugin };