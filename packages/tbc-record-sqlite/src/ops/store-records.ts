import assert from 'node:assert';
import { join } from 'node:path';

import { HAMINode } from '@hami-frameworx/core';
import { TBCStore, TBCShared } from '@tbc-frameworx/tbc-record';

import { SQLiteStore } from '../sqlite-store.js';

/**
 * Type alias for the shared object used by this node.
 * Uses TBCShared from @tbc-frameworx/tbc-record.
 */
type Shared = TBCShared;

/**
 * Cache of SQLiteStore instances keyed by database path.
 * This ensures we reuse connections for the same database path.
 */
const storeCache: Map<string, SQLiteStore> = new Map();

/**
 * Get or create a SQLiteStore instance for the given database path.
 */
async function getOrCreateStore(dbPath: string): Promise<SQLiteStore> {
    let store = storeCache.get(dbPath);
    if (!store) {
        store = new SQLiteStore(dbPath);
        await store.initialize();
        storeCache.set(dbPath, store);
    }
    return store;
}

/**
 * StoreRecordsNode - HAMI Node for storing records in SQLite database.
 * 
 * This node implements the same interface as tbc-record-fs:store-records
 * but uses SQLite as the storage backend instead of the file system.
 * 
 * It can be used as a provider in tbc-record:store-records-flow.
 */
export class StoreRecordsNode extends HAMINode<Shared> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return 'tbc-record-sqlite:store-records';
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
        
        // Derive database path from root directory
        const dbPath = join(rootDirectory, 'records.db');
        
        // Get or create store instance
        const store = await getOrCreateStore(dbPath);
        
        const storedTBCStore: TBCStore = {
            [collection]: {},
        };

        for (const record of records) {
            if (!record.id) {
                console.error('Record missing id:', record);
                continue;
            }

            try {
                // Upsert the record into SQLite
                // Using 'record' as the kind, and storing the entire record as data
                await store.upsertNode(
                    record.id,
                    'record',
                    collection,
                    record,
                );
                storedTBCStore[collection][record.id] = record;
            } catch (error) {
                console.error(`Error storing record ${record.id}:`, error);
                // Continue with other records
            }
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
        shared.record.result.totalCount = Object.values(execRes).reduce(
            (sum, collection) => sum + Object.keys(collection).length,
            0
        );
        return 'default';
    }
}
