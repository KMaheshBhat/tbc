import assert from 'node:assert';

import { HAMINode, validateAgainstSchema, type HAMINodeConfigValidateResult, type ValidationSchema } from '@hami-frameworx/core';

import { FSStore } from '../fs-store.js';
import type { TBCRecordFSShared as Shared } from '../types.js';

interface DexRebuildConfig {
    collection: string;
    dexCollection?: string;
    verbose?: boolean;
}

const ConfigSchema: ValidationSchema = {
    type: 'object',
    properties: {
        collection: { type: 'string' },
        dexCollection: { type: 'string' },
        verbose: { type: 'boolean' },
    },
    required: [],
};

const storeCache: Map<string, FSStore> = new Map();

async function getOrCreateStore(rootDirectory: string, dexCollection: string): Promise<FSStore> {
    const key = `${rootDirectory}:${dexCollection}`;
    let store = storeCache.get(key);
    if (!store) {
        store = new FSStore();
        await store.initialize({ rootDirectory, dexCollection });
        storeCache.set(key, store);
    }
    return store;
}

export class DexRebuildNode extends HAMINode<Shared, DexRebuildConfig> {
    override kind(): string {
        return 'tbc-record-fs:dex-rebuild';
    }

    override validateConfig(config: DexRebuildConfig): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, ConfigSchema);
        return {
            valid: result.isValid,
            errors: result.errors || [],
        };
    }

    override async prep(shared: Shared): Promise<{ rootDirectory: string; collection: string; dexCollection: string; verbose: boolean }> {
        const anyShared = shared as any;
        const rootDirectory = shared.record?.rootDirectory || anyShared.stage?.rootDirectory || anyShared.rootDirectory;
        assert(rootDirectory, 'rootDirectory is required (shared.record.rootDirectory, shared.stage.rootDirectory, or shared.rootDirectory)');
        const collection = this.config?.collection || shared.record?.collection;
        const dexCollection = this.config?.dexCollection || anyShared.stage?.dexCollection || 'dex';
        assert(collection, 'config.collection or shared.record.collection is required');
        return {
            rootDirectory,
            collection,
            dexCollection,
            verbose: this.config?.verbose || false,
        };
    }

    override async exec(params: { rootDirectory: string; collection: string; dexCollection: string; verbose: boolean }): Promise<void> {
        const { rootDirectory, collection, dexCollection, verbose } = params;
        const store = await getOrCreateStore(rootDirectory, dexCollection);
        
        await store.index(collection, { event: 'full-build' });
    }

    override async post(shared: Shared): Promise<string> {
        return 'default';
    }
}