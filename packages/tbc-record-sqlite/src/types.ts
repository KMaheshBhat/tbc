import { SQLiteStore } from "./sqlite-store";

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
    store: SQLiteStore;
};

export {
    SQLiteStoreConfig,
    TBCRecordSQLiteShared,
};
