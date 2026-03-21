import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { SQLiteStore } from '../src/sqlite-store';
import { join } from 'node:path';
import { mkdirSync, existsSync, rmSync } from 'node:fs';

type TBCRecord = { id: string; kind: string; data: any; contentHash?: string };

const TEST_DIR = join(import.meta.dir, '../../../_test/sqlite-record-store');
const TEST_DB_PATH = join(TEST_DIR, 'persistence.db');

describe('SQLiteStore Contract (RecordStore)', () => {
  let store: SQLiteStore;

  beforeAll(async () => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });

    store = new SQLiteStore(TEST_DB_PATH);
    await store.initialize();
  });

  afterAll(async () => {
    await store.teardown();
  });

  /* ============================================================
     LIFECYCLE & HANDSHAKE
  ============================================================ */

  describe('Lifecycle & Handshake', () => {
    it('reports correct capabilities for a managed store', async () => {
      const caps = await store.initialize();
      expect(caps).toContain('store');
      expect(caps).toContain('query');
      expect(caps).toContain('fetch');
      expect(caps).toContain('graph');
      expect(caps).not.toContain('index');
    });

    it('requires initialize() before operations', async () => {
      const fresh = new SQLiteStore(':memory:');
      await expect(fresh.fetch('sys', ['x'])).rejects.toThrow();
    });
  });

  /* ============================================================
     PERSISTENCE (store)
  ============================================================ */

  describe('Persistence (store)', () => {
    it('persists a batch of records into a specific collection', async () => {
      const records: TBCRecord[] = [
        { id: 'rec_1', kind: 'memory', data: { val: 'A' } },
        { id: 'rec_2', kind: 'memory', data: { val: 'B' } }
      ];

      await store.store('mem', records);

      const results = await store.fetch('mem', ['rec_1', 'rec_2']);
      expect(results.mem?.['rec_1']?.data.val).toBe('A');
      expect(results.mem?.['rec_2']?.data.val).toBe('B');
    });

    it('replaces records atomically (no partial merging)', async () => {
      const COL = 'atomicity';

      await store.store(COL, [
        { id: 'atom_1', kind: 'note', data: { oldKey: 'x' } }
      ]);

      await store.store(COL, [
        { id: 'atom_1', kind: 'note', data: { newKey: 'y' } }
      ]);

      const result = await store.fetch(COL, ['atom_1']);

      expect(result[COL]?.['atom_1']?.data.oldKey).toBeUndefined();
      expect(result[COL]?.['atom_1']?.data.newKey).toBe('y');
    });

    it('enforces collection boundaries', async () => {
      const record: TBCRecord = {
        id: 'cross_1',
        kind: 'config',
        data: { secret: 123 }
      };

      await store.store('sys', [record]);

      const sysResult = await store.fetch('sys', ['cross_1']);
      const memResult = await store.fetch('mem', ['cross_1']);

      expect(sysResult.sys?.['cross_1']).toBeDefined();
      expect(memResult.mem?.['cross_1']).toBeUndefined();
    });
  });

  /* ============================================================
     DISCOVERY (query + count)
  ============================================================ */

  describe('Discovery (query)', () => {
    const COL = 'dex';

    beforeAll(async () => {
      await store.store(COL, [
        { id: 'query_1', kind: 'skill', data: { tags: ['logic'], text: 'alpha' } },
        { id: 'query_2', kind: 'skill', data: { tags: ['math'], text: 'beta' } }
      ]);
    });

    it('supports search-by-content within a collection', async () => {
      const ids = await store.query(COL, {
        type: 'search-by-content',
        searchTerm: 'math'
      });

      expect(ids).toContain('query_2');
      expect(ids).not.toContain('query_1');
    });

    it('supports sorted listing with type: list', async () => {
      const ids = await store.query(COL, {
        type: 'list',
        sortBy: 'id',
        sortOrder: 'desc'
      } as any);

      expect(ids[0]).toBe('query_2');
      expect(ids[1]).toBe('query_1');
    });

    it('handles limit 0 and large offsets gracefully', async () => {
      const empty = await store.query(COL, { type: 'list', limit: 0 } as any);
      const ghost = await store.query(COL, { type: 'list', offset: 999 } as any);

      expect(empty).toHaveLength(0);
      expect(ghost).toHaveLength(0);
    });

    it('counts nodes with filters', async () => {
      expect(await store.countNodes('skill', COL)).toBe(2);
      expect(await store.countNodes('ghost', COL)).toBe(0);
    });
  });

  /* ============================================================
     NAVIGATION (graph)
  ============================================================ */

  describe('Navigation (graph)', () => {
    const COL = 'act';

    it('navigates relationships using the store relation batch', async () => {
      // Define records and relations as a single atomic unit
      const records = [
        { id: 'task_1', kind: 'task', data: { name: 'First' } },
        { id: 'task_2', kind: 'task', data: { name: 'Second' } }
      ];
      const relations = [
        { id: 'edge_1', kind: 'depends_on', from: 'task_2', to: 'task_1', data: {} }
      ];

      await store.store(COL, records, relations);

      const related = await store.graph(COL, 'task_2', 'out', 'depends_on');
      expect(related).toContain('task_1');
    });

    it('enforces foreign key integrity (cannot link to non-existent nodes)', async () => {
      const relations = [
        { id: 'bad_edge', kind: 'rel', from: 'ghost_a', to: 'ghost_b', data: {} }
      ];

      // This should fail because ghost_a/b are not in the 'act' collection (or any)
      await expect(
        store.store(COL, [], relations)
      ).rejects.toThrow();
    });

    it('cascades delete on node removal via RecordStore contract', async () => {
      const COL_DEL = 'cleanup';
      await store.store(COL_DEL, [
        { id: 'node_a', kind: 'k', data: {} },
        { id: 'node_b', kind: 'k', data: {} }
      ], [
        { id: 'edge_ab', kind: 'rel', from: 'node_a', to: 'node_b' }
      ]);

      // We use the RDBMS internal for deleteNode as RecordStore 
      // often delegates "deletes" to the FileSystem in a CQRS setup, 
      // but for a standalone test, we ensure it works:
      await (store as any).deleteNode('node_b', COL_DEL);

      const related = await store.graph(COL_DEL, 'node_a', 'out');
      expect(related).not.toContain('node_b');
    });

    it('deduplicates in both-direction traversal', async () => {
      const COL_LOOP = 'loop';
      await store.store(COL_LOOP,
        [{ id: 'loop_node', kind: 'k', data: {} }],
        [{ id: 'loop_edge', kind: 'self', from: 'loop_node', to: 'loop_node' }]
      );

      const both = await store.graph(COL_LOOP, 'loop_node', 'both');
      expect(both).toEqual(['loop_node']);
    });

    it('returns empty array for unknown navigation starts', async () => {
      const related = await store.graph('empty_col', 'ghost_node', 'out');
      expect(related).toEqual([]);
    });
  });

  /* ============================================================
     SAFETY & INTERNALS
  ============================================================ */

  describe('Safety & Integrity', () => {
    it('is resilient to SQL injection attempts', async () => {
      const malicious = "'; DROP TABLE record; --";

      await store.store('safe', [
        { id: 'injection_1', kind: 'k', data: { text: malicious } }
      ]);

      const results = await store.query('safe', {
        type: 'search-by-content',
        searchTerm: malicious
      });

      expect(results).toContain('injection_1');

      const count = await store.countNodes();
      expect(count).toBeGreaterThan(0);
    });

    it('updates internal metadata (updated_at)', async () => {
      const id = 'meta_1';

      await store.store('meta', [
        { id, kind: 'k', data: { v: 1 } }
      ]);

      const db = (store as any).db;
      const row1 = db.query(
        'SELECT updated_at FROM record WHERE record_id = ?'
      ).get(id);

      await new Promise(r => setTimeout(r, 10));

      await store.store('meta', [
        { id, kind: 'k', data: { v: 2 } }
      ]);

      const row2 = db.query(
        'SELECT updated_at FROM record WHERE record_id = ?'
      ).get(id);

      expect(row2.updated_at).not.toBe(row1.updated_at);
    });
  });

  /* ============================================================
     HYDRATION (fetch)
  ============================================================ */

  describe('Hydration (fetch)', () => {
    it('returns a structured TBCStore object', async () => {
      await store.store('skills', [
        { id: 'skill_1', kind: 'core', data: { name: 'rust' } }
      ]);

      const hydration = await store.fetch('skills', ['skill_1']);

      expect(hydration.skills).toBeDefined();
      expect(hydration.skills?.['skill_1']?.data.name).toBe('rust');
    });

    it('gracefully handles missing IDs', async () => {
      const hydration = await store.fetch('mem', ['non_existent']);
      expect(hydration.mem?.['non_existent']).toBeUndefined();
    });
  });
});
