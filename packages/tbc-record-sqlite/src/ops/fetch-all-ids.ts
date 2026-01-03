import { HAMINode } from "@hami-frameworx/core";
import { Database } from "bun:sqlite";

import type { TBCRecordSQLiteStorage } from "../types.js";

type FetchAllIdsInput = {
    storePath: string;
    collection: string;
    database: 'records' | 'meta';
};

type FetchAllIdsOutput = string[]; // array of IDs

export class FetchAllIdsNode extends HAMINode<TBCRecordSQLiteStorage> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-record-sqlite:fetch-all-ids";
    }

    async prep(shared: TBCRecordSQLiteStorage): Promise<FetchAllIdsInput> {
        if (!shared.storePath || !shared.collection) {
            throw new Error("storePath and collection are required in shared state");
        }
        const database = shared.database || 'records';
        return {
            storePath: shared.storePath,
            collection: shared.collection,
            database,
        };
    }

    async exec(params: FetchAllIdsInput): Promise<FetchAllIdsOutput> {
        const db = new Database(params.storePath);
        try {
            // Ensure tables exist
            this.ensureTables(db);

            const query = db.query("SELECT id FROM nodes WHERE collection = ? ORDER BY id");
            const rows = query.all(params.collection) as { id: string }[];
            return rows.map(row => row.id);
        } catch (error: any) {
            console.error(`Error fetching IDs from ${params.storePath}:`, error);
            return [];
        } finally {
            db.close();
        }
    }

    private ensureTables(db: Database): void {
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

    async post(shared: TBCRecordSQLiteStorage, _prepRes: FetchAllIdsInput, execRes: FetchAllIdsOutput): Promise<string | undefined> {
        shared.IDs = execRes;
        return "default";
    }
}