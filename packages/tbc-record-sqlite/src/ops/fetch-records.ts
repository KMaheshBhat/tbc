import assert from 'node:assert';
import { join } from 'node:path';

import { HAMINode } from '@hami-frameworx/core';
import { TBCStore } from '@tbc-frameworx/tbc-record';

import { SQLiteStore } from '../sqlite-store.js';
import { TBCRecordSQLiteShared as Shared } from '../types.js';

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

export class FetchRecordsNode extends HAMINode<Shared> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return 'tbc-record-sqlite:fetch-records';
    }

    async prep(shared: Shared): Promise<[string, string, string[]]> {
        assert(shared.record, 'shared.record is required');
        assert(shared.record?.rootDirectory, 'shared.record.rootDirectory is required');
        assert(shared.record?.collection, 'shared.record.collection is required');
        assert(shared.record?.IDs, 'shared.record.IDs is required');
        return [
            shared.record?.rootDirectory!,
            shared.record?.collection!,
            shared.record?.IDs!,
        ];
    }

    async exec(params: [string, string, string[]]): Promise<TBCStore> {
        const [rootDirectory, collection, IDs] = params;

        const dbPath = join(rootDirectory, 'records.db');
        const store = await getOrCreateStore(dbPath);
        return await store.fetch(collection, IDs);
    }

    async post(
        shared: Shared,
        _prepRes: [string, string, string[]],
        execRes: TBCStore,
    ): Promise<string | undefined> {
        assert(shared.record, 'shared.record is required');
        if (!shared.record.result) shared.record.result = {};
        shared.record.result.records = execRes;
        shared.record.result.totalCount = Object.values(execRes).reduce((sum, collection) => sum + Object.keys(collection).length, 0);
        return 'default';
    }
}