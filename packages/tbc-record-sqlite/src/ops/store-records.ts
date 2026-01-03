import { HAMINode } from "@hami-frameworx/core";
import { Database } from "bun:sqlite";

import type { TBCRecordSQLiteStorage, TBCRecord } from "../types.js";

type StoreRecordsInput = {
    storePath: string;
    collection: string;
    records: TBCRecord[];
    database: 'records' | 'meta';
};

type StoreRecordsOutput = string[]; // array of stored IDs

export class StoreRecordsNode extends HAMINode<TBCRecordSQLiteStorage> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-record-sqlite:store-records";
    }

    async prep(shared: TBCRecordSQLiteStorage): Promise<StoreRecordsInput> {
        if (!shared.storePath || !shared.collection || !shared.records) {
            throw new Error("storePath, collection, and records are required in shared state");
        }
        const database = shared.database || 'records';
        return {
            storePath: shared.storePath,
            collection: shared.collection,
            records: shared.records,
            database,
        };
    }

    async exec(params: StoreRecordsInput): Promise<StoreRecordsOutput> {
        const db = new Database(params.storePath);
        try {
            // Ensure tables exist
            this.ensureTables(db);

            const storedIds: string[] = [];

            for (const record of params.records) {
                if (!record.id) {
                    console.error(`Record missing id:`, record);
                    continue;
                }

                try {
                    await this.storeRecord(db, params.collection, record);
                    storedIds.push(record.id);
                } catch (error) {
                    console.error(`Error storing record ${record.id}:`, error);
                    // Continue with other records
                }
            }

            return storedIds;
        } catch (error: any) {
            console.error(`Error storing records to ${params.storePath}:`, error);
            return [];
        } finally {
            db.close();
        }
    }

    private async storeRecord(db: Database, collection: string, record: TBCRecord): Promise<void> {
        const now = Date.now();

        // Prepare node data
        const nodeData = {
            id: record.id,
            collection,
            record_type: record.record_type || 'unknown',
            hash: this.generateHash(record),
            last_seen_at: now,
            created_at: record.created_at || now,
            file_path: record.filename || null,
        };

        // Insert/update node
        const nodeQuery = db.query(`
            INSERT OR REPLACE INTO nodes (id, collection, record_type, hash, last_seen_at, created_at, file_path)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        nodeQuery.run(
            nodeData.id,
            nodeData.collection,
            nodeData.record_type,
            nodeData.hash,
            nodeData.last_seen_at,
            nodeData.created_at,
            nodeData.file_path
        );

        // Store attributes
        const attrQuery = db.query(`
            INSERT OR REPLACE INTO node_attributes (node_id, key, value, value_type, updated_at)
            VALUES (?, ?, ?, ?, ?)
        `);

        for (const [key, value] of Object.entries(record)) {
            if (key === 'id' || key === 'filename' || key === 'contentType') continue;

            let valueStr: string;
            let valueType: string;

            if (typeof value === 'string') {
                valueStr = value;
                valueType = 'string';
            } else if (typeof value === 'number') {
                valueStr = value.toString();
                valueType = 'number';
            } else if (typeof value === 'boolean') {
                valueStr = value.toString();
                valueType = 'boolean';
            } else if (value === null || value === undefined) {
                valueStr = '';
                valueType = 'null';
            } else {
                valueStr = JSON.stringify(value);
                valueType = 'json';
            }

            attrQuery.run(record.id, key, valueStr, valueType, now);
        }
    }

    private generateHash(record: TBCRecord): string {
        // Simple hash for now - in production, use proper content hashing
        const content = JSON.stringify(record);
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(16);
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

    async post(shared: TBCRecordSQLiteStorage, _prepRes: StoreRecordsInput, execRes: StoreRecordsOutput): Promise<string | undefined> {
        shared.storeResults = { ...shared.storeResults, [shared.collection!]: execRes };
        return "default";
    }
}