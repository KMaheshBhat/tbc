import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { SQLiteStore } from '../src/sqlite-store';
import { join } from 'node:path';
import { mkdirSync, existsSync, rmSync } from 'node:fs';

const TEST_ARTIFACT_DIR = join(import.meta.dir, '../../../_test/record-sqlite');
const TEST_DB_PATH = join(TEST_ARTIFACT_DIR, 'persistence.db');

describe('🧪 SQLiteStore: Enhanced Implementation Suite', () => {
    let store: SQLiteStore;

    beforeAll(async () => {
        if (existsSync(TEST_ARTIFACT_DIR)) {
            rmSync(TEST_ARTIFACT_DIR, { recursive: true, force: true });
        }
        mkdirSync(TEST_ARTIFACT_DIR, { recursive: true });

        store = new SQLiteStore(TEST_DB_PATH);
        await store.initialize();
    });

    afterAll(async () => {
        await store.teardown();
    });

    describe('Core Operations & Atomic Upsert', () => {
        it('should handle complex JSON payloads and atomic overwrites', async () => {
            const id = 'node_1';
            // First version has 'oldKey'
            await store.upsertNode(id, 'note', 'default', { oldKey: 'detect me', text: 'find me' });

            // Second version DOES NOT have 'oldKey'
            await store.upsertNode(id, 'note', 'default', { newKey: 'i am new', updated: true });
            const record = await store.getNode(id);

            // If it merged, oldKey would still be there. 
            // If it replaced (correct), oldKey should be undefined.
            expect(record?.oldKey).toBeUndefined();
            expect(record?.newKey).toBe('i am new');
            expect(record?.updated).toBe(true);
        });
        it('should enforce cascading deletes on edges', async () => {
            await store.upsertNode('source', 'type', 'col', {});
            await store.upsertNode('target', 'type', 'col', {});
            await store.upsertEdge('edge_1', 'link', 'source', 'target', {});

            await store.deleteNode('target');
            const related = await store.getRelatedIds('source', 'out');
            expect(related).not.toContain('target');
        });
    });

    describe('Discovery (List, Count, Search)', () => {
        beforeAll(async () => {
            // Setup a fresh batch for discovery tests
            await store.upsertNode('search_1', 'post', 'blog', { content: 'apple banana' });
            await store.upsertNode('search_2', 'post', 'blog', { content: 'banana cherry' });
            await store.upsertNode('search_3', 'page', 'web', { content: 'cherry date' });
        });

        it('should count nodes correctly with filters', async () => {
            const total = await store.countNodes();
            const blogCount = await store.countNodes(undefined, 'blog');
            const pageCount = await store.countNodes('page');

            expect(total).toBeGreaterThanOrEqual(3);
            expect(blogCount).toBe(2);
            expect(pageCount).toBe(1);
        });

        it('should search node data using text queries', async () => {
            const results = await store.searchNodes('banana');
            expect(results).toContain('search_1');
            expect(results).toContain('search_2');
            expect(results).not.toContain('search_3');
        });

        it('should list IDs with collection filtering', async () => {
            const ids = await store.listNodeIds({ collection: 'web' });
            expect(ids).toEqual(['search_3']);
        });
    });

    describe('Pagination & Sorting', () => {
        beforeAll(async () => {
            // Create a sequence for predictable sorting
            await store.upsertNode('p_a', 'item', 'paged', { val: 1 });
            await store.upsertNode('p_b', 'item', 'paged', { val: 2 });
            await store.upsertNode('p_c', 'item', 'paged', { val: 3 });
        });

        it('should respect limit and offset', async () => {
            const first = await store.listNodeIds({ collection: 'paged', limit: 1, sortBy: 'id', sortOrder: 'asc' });
            const second = await store.listNodeIds({ collection: 'paged', limit: 1, offset: 1, sortBy: 'id', sortOrder: 'asc' });

            expect(first).toEqual(['p_a']);
            expect(second).toEqual(['p_b']);
        });

        it('should sort by ID in descending order', async () => {
            const ids = await store.listNodeIds({ collection: 'paged', sortBy: 'id', sortOrder: 'desc' });
            expect(ids).toEqual(['p_c', 'p_b', 'p_a']);
        });
    });

    describe('Advanced Graph Scenarios', () => {
        it('should handle circular and self-referencing relations', async () => {
            const nodeA = 'node_a';
            await store.upsertNode(nodeA, 'item', 'graph', {});

            // Self-reference
            await store.upsertEdge('edge_self', 'loops', nodeA, nodeA, {});

            const out = await store.getRelatedIds(nodeA, 'out', 'loops');
            const inc = await store.getRelatedIds(nodeA, 'in', 'loops');
            const both = await store.getRelatedIds(nodeA, 'both', 'loops');

            expect(out).toContain(nodeA);
            expect(inc).toContain(nodeA);
            expect(both.length).toBe(1); // Should deduplicate
        });

        it('should store and retrieve temporal metadata on edges', async () => {
            const edgeId = 'temporal_edge';
            const pastDate = '2020-01-01T00:00:00Z';
            const futureDate = '2030-01-01T00:00:00Z';

            // Manually upserting with temporal data
            const stmt = (store as any).db.prepare(`
                INSERT INTO record_relation (relation_id, relation_kind, from_record_id, to_record_id, data, valid_from, valid_to)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);

            await store.upsertNode('n1', 't', 'c', {});
            await store.upsertNode('n2', 't', 'c', {});
            stmt.run(edgeId, 'lived_in', 'n1', 'n2', '{}', pastDate, futureDate);

            // Verify the data exists in the DB
            const row = (store as any).db.query('SELECT valid_from, valid_to FROM record_relation WHERE relation_id = ?').get(edgeId);
            expect(row.valid_from).toBe(pastDate);
            expect(row.valid_to).toBe(futureDate);
        });

        it('should respect temporal bounds and hide expired relations', async () => {
            const nodeS = 'temp_source';
            const nodeT = 'temp_target';
            await store.upsertNode(nodeS, 't', 'c', {});
            await store.upsertNode(nodeT, 't', 'c', {});

            // 1. A relation that expired yesterday
            const yesterday = new Date(Date.now() - 86400000).toISOString();
            const wayPast = new Date(Date.now() - 172800000).toISOString();

            const stmt = (store as any).db.prepare(`
                INSERT INTO record_relation (relation_id, relation_kind, from_record_id, to_record_id, data, valid_from, valid_to)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            stmt.run('expired_edge', 'history', nodeS, nodeT, '{}', wayPast, yesterday);

            // 2. A relation that starts tomorrow
            const tomorrow = new Date(Date.now() + 86400000).toISOString();
            stmt.run('future_edge', 'history', nodeS, nodeT, '{}', tomorrow, null);

            // Querying for 'now' should return NOTHING
            const current = await store.getRelatedIds(nodeS, 'out', 'history');
            expect(current.length).toBe(0);

            // Querying for 'wayPast' should return the expired edge
            const oldResults = await store.getRelatedIds(nodeS, 'out', 'history', wayPast);
            expect(oldResults).toContain(nodeT);
        });
    });

    describe('Robustness & Error Handling', () => {
        it('should return empty results for non-existent IDs instead of throwing', async () => {
            const related = await store.getRelatedIds('ghost_id', 'both');
            const node = await store.getNode('ghost_id');
            const count = await store.countNodes('ghost_kind', 'ghost_col');

            expect(related).toEqual([]);
            expect(node).toBeNull();
            expect(count).toBe(0);
        });

        it('should handle special characters in search queries (SQL Injection Safety)', async () => {
            await store.upsertNode('inject_1', 'note', 'default', { content: "It's a trap; DROP TABLE record; --" });

            const results = await store.searchNodes("'; DROP TABLE record; --");
            const safeResults = await store.searchNodes("It's a trap");

            expect(results.length).toBe(0); // Should find nothing because of parameterization
            expect(safeResults).toContain('inject_1');

            // Verify table still exists
            const count = await store.countNodes();
            expect(count).toBeGreaterThan(0);
        });
    });

    it('should maintain idempotency on re-initialization', async () => {
        await store.initialize();
        const count = await store.countNodes();
        expect(count).toBeDefined();
    });
});
