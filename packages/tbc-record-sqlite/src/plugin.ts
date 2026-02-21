import { createPlugin } from '@hami-frameworx/core';

/**
 * TBC Record SQLite Plugin for HAMI.
 * Provides essential TBC record SQLite operations.
 *
 * Included operations:
 */
const TBCRecordSQLitePlugin = createPlugin(
    '@tbc-frameworx/tbc-record-sqlite',
    '0.1.0',
    [
    ],
    'TBC Record SQLite Plugin - SQLite database operations for TBC records',
);

export { TBCRecordSQLitePlugin };