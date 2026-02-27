import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { SQLiteStore } from '../src/sqlite-store';
import { join } from 'node:path';
import { mkdirSync, existsSync, rmSync } from 'node:fs';

const TEST_DIR = join(import.meta.dir, '../../../_test/record-sqlite');
const TEST_DB_PATH = join(TEST_DIR, 'persistence.db');

describe('SQLiteStore Contract (CQRS Read Model)', () => {
    let store: SQLiteStore;

    beforeAll(async () => {
        // Clean ONLY at startup (retain artifacts after run)
        if (existsSync(TEST_DIR)) {
            rmSync(TEST_DIR, { recursive: true, force: true });
        }
        mkdirSync(TEST_DIR, { recursive: true });

        store = new SQLiteStore(TEST_DB_PATH);
        await store.initialize();
    });

    afterAll(async () => {
        // Close connection ONLY — retain DB file
        await store.teardown();
    });

    /* ============================================================
       LIFECYCLE
    ============================================================ */

    describe('Lifecycle', () => {
        it('requires initialize() before operations', async () => {
            const fresh = new SQLiteStore(':memory:');
            await expect(fresh.getNode('x')).rejects.toThrow();
        });

        it('is idempotent on re-initialize()', async () => {
            await store.initialize();
            expect(await store.countNodes()).toBeDefined();
        });
    });

    /* ============================================================
       NODE MODEL (Scoped Collection: nm)
    ============================================================ */

    describe('Node Model', () => {
        const COL = 'nm';

        it('upserts atomically (replace, not merge)', async () => {
            await store.upsertNode('nm_1', 'note', COL, { oldKey: 'x' });
            await store.upsertNode('nm_1', 'note', COL, { newKey: 'y' });

            const record = await store.getNode('nm_1');

            expect(record?.oldKey).toBeUndefined();
            expect(record?.newKey).toBe('y');
        });

        it('stores and updates content_hash', async () => {
            await store.upsertNode('nm_hash', 'k', COL, {}, 'abc');
            await store.upsertNode('nm_hash', 'k', COL, {}, 'xyz');

            const row = (store as any).db
                .query('SELECT content_hash FROM record WHERE record_id = ?')
                .get('nm_hash');

            expect(row.content_hash).toBe('xyz');
        });

        it('updates updated_at on atomic replace', async () => {
            await store.upsertNode('time_1', 'k', 'nm', { v: 1 });
            const row1 = (store as any).db
                .query('SELECT updated_at FROM record WHERE record_id = ?')
                .get('time_1');

            await new Promise(r => setTimeout(r, 5));

            await store.upsertNode('time_1', 'k', 'nm', { v: 2 });
            const row2 = (store as any).db
                .query('SELECT updated_at FROM record WHERE record_id = ?')
                .get('time_1');

            expect(row2.updated_at).not.toBe(row1.updated_at);
        });

        it('returns null for unknown node', async () => {
            expect(await store.getNode('nm_unknown')).toBeNull();
        });
    });

    /* ============================================================
       EDGE MODEL (Scoped Collection: em)
    ============================================================ */

    describe('Edge Model', () => {
        const COL = 'em';

        it('enforces foreign key constraints', async () => {
            await expect(
                store.upsertEdge('em_bad', 'link', 'ghost', 'ghost2', {})
            ).rejects.toThrow();
        });

        it('supports directional traversal', async () => {
            await store.upsertNode('em_a', 'k', COL, {});
            await store.upsertNode('em_b', 'k', COL, {});
            await store.upsertEdge('em_e1', 'rel', 'em_a', 'em_b', {});

            const out = await store.getRelatedIds('em_a', 'out');
            const inc = await store.getRelatedIds('em_b', 'in');

            expect(out).toContain('em_b');
            expect(inc).toContain('em_a');
        });

        it('cascades delete on node removal', async () => {
            await store.upsertNode('em_c1', 'k', COL, {});
            await store.upsertNode('em_c2', 'k', COL, {});
            await store.upsertEdge('em_e2', 'rel', 'em_c1', 'em_c2', {});

            await store.deleteNode('em_c2');

            const out = await store.getRelatedIds('em_c1', 'out');
            expect(out).not.toContain('em_c2');
        });

        it('deduplicates results in "both" direction', async () => {
            await store.upsertNode('em_loop', 'k', COL, {});
            await store.upsertEdge('em_loop_e', 'loop', 'em_loop', 'em_loop', {});

            const both = await store.getRelatedIds('em_loop', 'both');
            expect(both).toEqual(['em_loop']);
        });
    });

    /* ============================================================
       DISCOVERY SURFACE (Scoped Collection: ds)
    ============================================================ */

    describe('Discovery Surface', () => {
        const COL1 = 'ds_blog';
        const COL2 = 'ds_web';

        beforeAll(async () => {
            await store.upsertNode('ds_a', 'post', COL1, { text: 'apple banana' });
            await store.upsertNode('ds_b', 'post', COL1, { text: 'banana cherry' });
            await store.upsertNode('ds_c', 'page', COL2, { text: 'cherry date' });
        });

        it('counts nodes with filters', async () => {
            expect(await store.countNodes(undefined, COL1)).toBe(2);
            expect(await store.countNodes('page', COL2)).toBe(1);
        });

        it('searches JSON content safely', async () => {
            const results = await store.searchNodes('banana');
            expect(results).toEqual(expect.arrayContaining(['ds_a', 'ds_b']));
        });

        it('supports sorting and pagination', async () => {
            const ids = await store.listNodeIds({
                collection: COL1,
                sortBy: 'id',
                sortOrder: 'asc',
                limit: 1,
            });

            expect(ids.length).toBe(1);
        });

        it('handles limit 0 and large offset', async () => {
            expect(await store.listNodeIds({ limit: 0 })).toEqual([]);
            expect(await store.listNodeIds({ offset: 9999 })).toEqual([]);
        });
    });

    /* ============================================================
       SAFETY & INTEGRITY
    ============================================================ */

    describe('Safety & Integrity', () => {
        const COL = 'safe';

        it('is resilient to SQL injection attempts', async () => {
            await store.upsertNode(
                'safe_1',
                'note',
                COL,
                { content: "It's a trap; DROP TABLE record; --" }
            );

            const malicious = await store.searchNodes("'; DROP TABLE record; --");
            expect(malicious).toEqual([]);

            expect(await store.countNodes(undefined, COL)).toBe(1);
        });

        it('returns empty results for unknown IDs', async () => {
            expect(await store.getRelatedIds('ghost', 'both')).toEqual([]);
        });
    });
});
