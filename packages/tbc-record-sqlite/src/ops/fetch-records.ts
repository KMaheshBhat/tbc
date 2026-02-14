import assert from 'node:assert';

import { HAMINode } from '@hami-frameworx/core';
import { Database } from 'bun:sqlite';

import { TBCStore } from '@tbc-frameworx/tbc-record';

import type { TBCRecordSQLiteShared as Shared } from '../types.js';
import { ensureTables } from '../store.js';

type NodeInput = {
    storePath: string;
    collection: string;
    IDs: string[];
};

type NodeOutput = TBCStore;

export class FetchRecordsNode extends HAMINode<Shared> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return 'tbc-record-sqlite:fetch-records';
    }

    async prep(shared: Shared): Promise<NodeInput> {
        assert(shared.record, 'shared.record is required');
        assert(shared.storePath, 'shared.storePath is required');
        assert(shared.record.collection, 'shared.record.collection is required');
        assert(shared.record.IDs, 'shared.record.IDs is required');
        return {
            storePath: shared.storePath!,
            collection: shared.record.collection!,
            IDs: shared.record.IDs!,
        };
    }

    async exec(params: NodeInput): Promise<NodeOutput> {
        const db = new Database(params.storePath);
        try {
            // Ensure tables exist
            ensureTables(db);

            const results: Record<string, any> = {};

            for (const id of params.IDs) {
                const record = await this.fetchRecord(db, params.collection, id);
                if (record) {
                    results[id] = record;
                }
            }

            return { [params.collection]: results };
        } catch (error: any) {
            console.error(`Error fetching records from ${params.storePath}:`, error);
            return { [params.collection]: {} };
        } finally {
            db.close();
        }
    }

    private async fetchRecord(db: Database, collection: string, id: string): Promise<Record<string, any> | null> {
        // Get node data
        const nodeQuery = db.query('SELECT * FROM nodes WHERE id = ? AND collection = ?');
        const nodeRow = nodeQuery.get(id, collection) as any;

        if (!nodeRow) {
            return null;
        }

        // Get attributes
        const attrQuery = db.query('SELECT key, value, value_type FROM node_attributes WHERE node_id = ?');
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

    async post(
        shared: Shared,
        _prepRes: NodeInput,
        execRes: NodeOutput,
    ): Promise<string> {
        assert(shared.record, 'shared.record is required');
        if (!shared.record.result) shared.record.result = {};
        shared.record.result.records = execRes;
        shared.record.result.totalCount = Object.values(execRes).reduce((sum, collection) => sum + Object.keys(collection).length, 0);
        return 'default';
    }
}