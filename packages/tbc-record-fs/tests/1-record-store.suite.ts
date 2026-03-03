import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { FSStore } from '../src/fs-store';
import { join } from 'node:path';
import { mkdirSync, existsSync, rmSync, readFileSync } from 'node:fs';

const TEST_DIR = join(import.meta.dir, '../../../_test/fs-record-store');

describe('FSStore Contract (RecordStore)', () => {
    let store: FSStore;

    beforeAll(async () => {
        if (existsSync(TEST_DIR)) {
            rmSync(TEST_DIR, { recursive: true, force: true });
        }
        mkdirSync(TEST_DIR, { recursive: true });

        // Configuration includes the mandatory dex collection name
        store = new FSStore();
        await store.initialize({ 
            rootDirectory: TEST_DIR,
            dexCollection: 'dex',
            shardKey: 'kind' 
        });
    });

    afterAll(async () => {
        await store.teardown();
    });

    /* ============================================================
       CAPABILITIES & INITIALIZATION
    ============================================================ */
    describe('Handshake', () => {
        it('reports capabilities including index and store', async () => {
            const caps = await store.initialize({ rootDirectory: TEST_DIR });
            expect(caps).toContain('store');
            expect(caps).toContain('fetch');
            expect(caps).toContain('index');
            expect(caps).toContain('query');
            // FS usually doesn't do native graph traversal efficiently
            expect(caps).not.toContain('graph');
        });
    });

    /* ============================================================
       PERSISTENCE & DEX PROJECTION
    ============================================================ */
    describe('Persistence (store)', () => {
        it('persists full record to disk and projects metadata to dex', async () => {
            const records = [
                { id: 'task_1', kind: 'memory', data: { title: 'Buy Milk', secret: 'abc' } }
            ];

            await store.store!('goals', records);

            // 1. Check Source of Truth (The JSON file)
            const fullPath = join(TEST_DIR, 'goals', 'task_1.json');
            expect(existsSync(fullPath)).toBe(true);
            const saved = JSON.parse(readFileSync(fullPath, 'utf-8'));
            expect(saved.data.secret).toBe('abc');

            // 2. Check Dex Shard (The Metadata projection)
            const dexPath = join(TEST_DIR, 'dex', 'goals.memory.jsonl');
            expect(existsSync(dexPath)).toBe(true);
            
            const dexLine = readFileSync(dexPath, 'utf-8').trim();
            const entry = JSON.parse(dexLine);
            expect(entry.id).toBe('task_1');
            // IMPORTANT: Metadata projection should strip heavy 'data' or specific fields
            expect(entry.data?.secret).toBeUndefined();
        });

        it('replaces records in both full-store and dex (no duplicates)', async () => {
            const COL = 'updates';
            const rec = { id: 'u1', kind: 'info', data: { v: 1 } };
            
            await store.store!(COL, [rec]);
            await store.store!(COL, [{ ...rec, data: { v: 2 } }]);

            const dexPath = join(TEST_DIR, 'dex', `${COL}.info.jsonl`);
            const lines = readFileSync(dexPath, 'utf-8').trim().split('\n');
            
            expect(lines).toHaveLength(1); // Ensure old entry was removed from .jsonl
        });
    });

    /* ============================================================
       DISCOVERY (query)
    ============================================================ */
    describe('Discovery (query)', () => {
        it('supports list-all-ids via the dex shards', async () => {
            const ids = await store.query!('goals', { type: 'list-all-ids' });
            expect(ids).toContain('task_1');
        });

        it('supports search-by-content using dex text scan', async () => {
            // This tests the FS's ability to scan the small .jsonl files for matches
            const ids = await store.query!('goals', { 
                type: 'search-by-content', 
                searchTerm: 'Buy Milk' 
            });
            expect(ids).toContain('task_1');
        });
    });

    /* ============================================================
       RECONCILIATION (index)
    ============================================================ */
    describe('Indexing (index)', () => {
        it('can rebuild the dex shards from raw JSON files', async () => {
            // 1. Wipe the dex
            const dexDir = join(TEST_DIR, 'dex');
            rmSync(dexDir, { recursive: true, force: true });
            
            // 2. Rebuild for 'goals' collection
            await store.index!('rebuild', 'goals');

            expect(existsSync(join(dexDir, 'goals.memory.jsonl'))).toBe(true);
        });
    });

    /* ============================================================
       HYDRATION (fetch)
    ============================================================ */
    describe('Hydration (fetch)', () => {
        it('hydrates multiple records into a TBCStore structure', async () => {
            const result = await store.fetch!('goals', ['task_1']);
            expect(result.goals?.['task_1']?.data.title).toBe('Buy Milk');
        });

        it('gracefully handles non-existent files', async () => {
            const result = await store.fetch!('goals', ['ghost']);
            expect(result.goals?.['ghost']).toBeUndefined();
        });
    });

    /* ============================================================
       SAFETY
    ============================================================ */
    describe('Integrity', () => {
        it('prevents directory traversal attacks via ID', async () => {
            const maliciousId = '../../../etc/passwd';
            await expect(store.fetch!('sys', [maliciousId])).rejects.toThrow();
        });
    });
});
