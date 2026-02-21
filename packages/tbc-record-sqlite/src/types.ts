import { RDBMSStore } from '@tbc-frameworx/tbc-record';

/**
 * Configuration options for SQLiteStore.
 */
type SQLiteStoreConfig = {
    /** Path to the SQLite database file. Defaults to ':memory:' for in-memory database. */
    dbPath?: string;
};

/**
 * Shared storage interface for TBC record SQLite operations.
 */
type TBCRecordSQLiteShared = {
    /** The SQLite store instance for RDBMS operations. */
    store: RDBMSStore;
};

export {
    SQLiteStoreConfig,
    TBCRecordSQLiteShared,
};
