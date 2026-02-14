import assert from 'node:assert';

import { HAMINode } from '@hami-frameworx/core';
import { Database } from 'bun:sqlite';

import { TBCStore } from '@tbc-frameworx/tbc-record';

import type { TBCRecordSQLiteShared as Shared, TBCRecordSQLite as Record } from '../types.js';
import { ensureTables } from '../store.js';

type NodeInput = {
    storePath: string;
    collection: string;
    records: Record[];
};

type NodeOutput = TBCStore;

export class StoreRecordsNode extends HAMINode<Shared> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return 'tbc-record-sqlite:store-records';
    }

    async prep(shared: Shared): Promise<NodeInput> {
        assert(shared.record, 'shared.record is required');
        assert(shared.storePath, 'shared.storePath is required');
        assert(shared.record.collection, 'shared.record.collection is required');
        assert(shared.record.records, 'shared.record.records is required');
        return {
            storePath: shared.storePath!,
            collection: shared.record.collection!,
            records: shared.record.records!,
        };
    }

    async exec(params: NodeInput): Promise<NodeOutput> {
        const db = new Database(params.storePath);
        try {
            // Ensure tables exist
            ensureTables(db);

            const storedTBCStore: TBCStore = {
                [params.collection]: {},
            };

            for (const record of params.records) {
                if (!record.id) {
                    console.error('Record missing id:', record);
                    continue;
                }

                try {
                    await this.storeRecord(db, params.collection, record);
                    storedTBCStore[params.collection][record.id!] = record;
                } catch (error) {
                    console.error(`Error storing record ${record.id}:`, error);
                    // Continue with other records
                }
            }

            return storedTBCStore;
        } catch (error: any) {
            console.error(`Error storing records to ${params.storePath}:`, error);
            return { [params.collection]: {} };
        } finally {
            db.close();
        }
    }

    private async storeRecord(db: Database, collection: string, record: Record): Promise<void> {
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
            nodeData.file_path,
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

            attrQuery.run(record.id!, key, valueStr, valueType, now);
        }
    }

    private generateHash(record: Record): string {
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

    async post(shared: Shared, _prepRes: NodeInput, execRes: NodeOutput): Promise<string | undefined> {
        assert(shared.record, 'shared.record is required');
        if (!shared.record.result) shared.record.result = {};
        shared.record.result.records = execRes;
        shared.record.result.totalCount = Object.values(execRes).reduce((sum, collection) => sum + Object.keys(collection).length, 0);
        return 'default';
    }
}