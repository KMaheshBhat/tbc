import { Database } from 'bun:sqlite';

/**
 * TBC Record SQLite Store utilities.
 * Provides database schema management and common operations.
 */

/**
 * Ensures all required tables exist in the SQLite database.
 * This is the "golden schema" for TBC Record SQLite storage.
 *
 * @param db - The SQLite database instance
 */
export function ensureTables(db: Database): void {
    db.run(`
        CREATE TABLE IF NOT EXISTS nodes (
            id TEXT PRIMARY KEY,
            collection TEXT NOT NULL,
            record_type TEXT NOT NULL,
            hash TEXT NOT NULL,
            last_seen_at INTEGER NOT NULL,
            created_at INTEGER,
            file_path TEXT
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS node_attributes (
            node_id TEXT NOT NULL,
            key TEXT NOT NULL,
            value TEXT,
            value_type TEXT NOT NULL,
            updated_at INTEGER NOT NULL,
            PRIMARY KEY (node_id, key),
            FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS edges (
            source_id TEXT NOT NULL,
            target_id TEXT NOT NULL,
            edge_type TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            PRIMARY KEY (source_id, target_id, edge_type),
            FOREIGN KEY (source_id) REFERENCES nodes(id) ON DELETE CASCADE
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS edge_attributes (
            source_id TEXT NOT NULL,
            target_id TEXT NOT NULL,
            edge_type TEXT NOT NULL,
            key TEXT NOT NULL,
            value TEXT,
            PRIMARY KEY (source_id, target_id, edge_type, key),
            FOREIGN KEY (source_id, target_id, edge_type) REFERENCES edges(source_id, target_id, edge_type) ON DELETE CASCADE
        )
    `);
}