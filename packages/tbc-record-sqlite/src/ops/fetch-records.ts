import { HAMINode } from "@hami-frameworx/core";

import { Database } from "bun:sqlite";

import type { TBCRecordSQLiteStorage } from "../types.js";
type FetchRecordsInput = {
    storePath: string;
    collection: string;
    IDs: string[];
    database: 'records' | 'meta';
};

type FetchRecordsOutput = Record<string, Record<string, any>>; // id -> record

export class FetchRecordsNode extends HAMINode<TBCRecordSQLiteStorage> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-record-sqlite:fetch-records";
    }

    async prep(shared: TBCRecordSQLiteStorage): Promise<FetchRecordsInput> {
        if (!shared.storePath || !shared.collection || !shared.IDs) {
            throw new Error("storePath, collection, and IDs are required in shared state");
        }
        const database = shared.database || 'records';
        return {
            storePath: shared.storePath,
            collection: shared.collection,
            IDs: shared.IDs,
            database,
        };
    }

    async exec(params: FetchRecordsInput): Promise<FetchRecordsOutput> {
        const db = new Database(params.storePath);
        try {
            // Ensure tables exist
            this.ensureTables(db);

            const results: FetchRecordsOutput = {};

            for (const id of params.IDs) {
                const record = await this.fetchRecord(db, params.collection, id);
                if (record) {
                    results[id] = record;
                }
            }

            return results;
        } catch (error: any) {
            console.error(`Error fetching records from ${params.storePath}:`, error);
            return {};
        } finally {
            db.close();
        }
    }

    private async fetchRecord(db: Database, collection: string, id: string): Promise<Record<string, any> | null> {
        // Get node data
        const nodeQuery = db.query("SELECT * FROM nodes WHERE id = ? AND collection = ?");
        const nodeRow = nodeQuery.get(id, collection) as any;

        if (!nodeRow) {
            return null;
        }

        // Get attributes
        const attrQuery = db.query("SELECT key, value, value_type FROM node_attributes WHERE node_id = ?");
        const attrRows = attrQuery.all(id) as { key: string; value: string; value_type: string }[];

        // Reconstruct record
        const record: Record<string, any> = {
            id: nodeRow.id,
            record_type: nodeRow.record_type,
            ...nodeRow,
        };

        // Add attributes
        for (const attr of attrRows) {
            let value: any = attr.value;
            if (attr.value_type === 'number') {
                value = Number(attr.value);
            } else if (attr.value_type === 'boolean') {
                value = attr.value === 'true';
            } else if (attr.value_type === 'json') {
                try {
                    value = JSON.parse(attr.value);
                } catch {
                    // Keep as string
                }
            }
            record[attr.key] = value;
        }

        return record;
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

    async post(shared: TBCRecordSQLiteStorage, _prepRes: FetchRecordsInput, execRes: FetchRecordsOutput): Promise<string | undefined> {
        shared.fetchResults = { ...shared.fetchResults, [shared.collection!]: execRes };
        return "default";
    }
}