import assert from 'node:assert';
import { join } from 'node:path';

import { HAMINode } from '@hami-frameworx/core';
import { TBCQueryParams, TBCResult } from '@tbc-frameworx/tbc-record';

import { SQLiteStore } from '../sqlite-store.js';
import { TBCRecordSQLiteShared as Shared } from '../types.js';

type NodeInput = {
    rootDirectory: string;
    collection: string;
    query: TBCQueryParams;
};

type NodeOutput = TBCResult;

const storeCache: Map<string, SQLiteStore> = new Map();

async function getOrCreateStore(dbPath: string): Promise<SQLiteStore> {
    let store = storeCache.get(dbPath);
    if (!store) {
        store = new SQLiteStore(dbPath);
        await store.initialize();
        storeCache.set(dbPath, store);
    }
    return store;
}

export class QueryRecordsNode extends HAMINode<Shared> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return 'tbc-record-sqlite:query-records';
    }

    async prep(shared: Shared): Promise<NodeInput> {
        assert(shared.record, 'shared.record is required');
        assert(shared.record.rootDirectory, 'shared.record.rootDirectory is required');
        assert(shared.record.collection, 'shared.record.collection is required');
        assert(shared.record.query, 'shared.record.query is required');
        return {
            rootDirectory: shared.record.rootDirectory!,
            collection: shared.record.collection!,
            query: shared.record.query!,
        };
    }

    async exec(params: NodeInput): Promise<NodeOutput> {
        const { rootDirectory, collection, query } = params;

        if (query.type === 'filter-by-tags') {
            throw new Error('filter-by-tags not implemented');
        }

        const dbPath = join(rootDirectory, 'records.db');
        const store = await getOrCreateStore(dbPath);
        const IDs = await store.query(collection, query);

        return {
            IDs: IDs,
            totalCount: IDs.length,
        };
    }

    async post(
        shared: Shared,
        _prepRes: NodeInput,
        execRes: NodeOutput,
    ): Promise<string> {
        if (!shared.record!.result) shared.record!.result = {};
        Object.assign(shared.record!.result, execRes);
        return 'default';
    }
}