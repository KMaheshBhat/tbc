import assert from 'node:assert';

import { HAMINode } from '@hami-frameworx/core';
import { TBCStore } from '@tbc-frameworx/tbc-record';

import { FSStore } from '../fs-store.js';
import { TBCRecordFSShared as Shared } from '../types.js';

const storeCache: Map<string, FSStore> = new Map();

async function getOrCreateStore(rootDirectory: string): Promise<FSStore> {
    let store = storeCache.get(rootDirectory);
    if (!store) {
        store = new FSStore();
        await store.initialize({ rootDirectory });
        storeCache.set(rootDirectory, store);
    }
    return store;
}

export class FetchRecordsNode extends HAMINode<Shared> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return 'tbc-record-fs:fetch-records';
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

        const store = await getOrCreateStore(rootDirectory);
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