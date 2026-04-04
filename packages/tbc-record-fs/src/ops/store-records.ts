import assert from 'node:assert';

import { HAMINode, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from '@hami-frameworx/core';
import { TBCRecord, TBCStore } from '@tbc-frameworx/tbc-record';

import { FSStore } from '../fs-store.js';
import { TBCRecordFSShared as Shared } from '../types.js';

const storeCache: Map<string, FSStore> = new Map();

async function getOrCreateStore(rootDirectory: string, collection: string, config: Config): Promise<FSStore> {
    let store = storeCache.get(`${rootDirectory}:${collection}`);
    if (!store) {
        store = new FSStore();
        await store.initialize({ rootDirectory, ...config });
        storeCache.set(rootDirectory, store);
    }
    return store;
}

interface Config {
    eagerIndex?: boolean;
}

const ConfigSchema: ValidationSchema = {
    type: 'object',
    properties: {
        eagerIndex: { type: 'boolean' },
    },
    required: [],
};

export class StoreRecordsNode extends HAMINode<Shared, Config> {

    validateConfig(config: Config): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, ConfigSchema);
        return { valid: result.isValid, errors: result.errors || [] };
    }

    kind(): string {
        return 'tbc-record-fs:store-records';
    }

    async prep(shared: Shared): Promise<[string, string, Record<string, any>[]]> {
        assert(shared.record, 'shared.record is required');
        assert(shared.record?.rootDirectory, 'shared.record.rootDirectory is required');
        assert(shared.record?.collection, 'shared.record.collection is required');
        assert(shared.record?.records, 'shared.record.records is required');
        return [
            shared.record?.rootDirectory!,
            shared.record?.collection!,
            shared.record?.records!,
        ];
    }

    async exec(params: [string, string, Record<string, any>[]]): Promise<TBCStore> {
        const [rootDirectory, collection, records] = params;

        const store = await getOrCreateStore(rootDirectory, collection, this.config || {});
        await store.store(collection, records);

        const storedTBCStore: TBCStore = {
            [collection]: {},
        };
        for (const record of records) {
            if (!record.id) {
                console.error('Record missing id:', record);
                continue;
            }
            storedTBCStore[collection][record.id] = record;
        }
        return storedTBCStore;
    }

    async post(
        shared: Shared,
        _prepRes: [string, string, Record<string, any>[]],
        execRes: TBCStore,
    ): Promise<string | undefined> {
        assert(shared.record, 'shared.record is required');
        if (!shared.record.result) shared.record.result = {};
        shared.record.result.records = execRes;
        shared.record.result.totalCount = Object.values(execRes).reduce((sum, collection) => sum + Object.keys(collection).length, 0);
        return 'default';
    }
}