import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { FSStore } from '../src/fs-store';
import { join } from 'node:path';
import {
    mkdirSync,
    existsSync,
    rmSync,
    readFileSync,
    writeFileSync
} from 'node:fs';

const TEST_DIR = join(import.meta.dir, '../../../_test/fs-record-store');

describe('FSStore Contract (RecordStore)', () => {
    let store: FSStore;

    beforeAll(async () => {
        if (existsSync(TEST_DIR)) {
            rmSync(TEST_DIR, { recursive: true, force: true });
        }
        mkdirSync(TEST_DIR, { recursive: true });
        store = new FSStore();
        const caps = await store.initialize({
            rootDirectory: TEST_DIR,
            dexCollection: 'dex'
        });
        expect(caps.sort()).toEqual(['fetch', 'index', 'query', 'store']);
    });

    afterAll(async () => {
        await store.teardown();
    });

/* ============================================================
        MARKDOWN + JSON PERSISTENCE
    ============================================================ */

    describe('Persistence', () => {
        it('persists markdown with frontmatter', async () => {
            await store.store('notes', [{
                id: 'md1',
                record_type: 'note',
                record_title: 'Meta Title',
                content: '# Header\nBody',
                contentType: 'markdown'
            }]);
            const file = join(TEST_DIR, 'notes', 'md1.md');
            expect(existsSync(file)).toBe(true);
            const raw = readFileSync(file, 'utf-8');
            expect(raw).toContain('record_title: Meta Title');
            expect(raw).toContain('# Header');
        });

        it('persists yaml files with yaml extension', async () => {
            await store.store('configs', [{
                id: 'app-config',
                record_type: 'config',
                record_title: 'App Config',
                data: { port: 3000 },
                contentType: 'yaml',
                filename: 'app-config.yaml'
            }]);
            const file = join(TEST_DIR, 'configs', 'app-config.yaml');
            expect(existsSync(file)).toBe(true);
            const raw = readFileSync(file, 'utf-8');
            expect(raw).toContain('port: 3000');
        });

        it('persists raw files without extension', async () => {
            await store.store('secrets', [{
                id: '.env',
                record_type: 'secret',
                contentType: 'text',
                content: 'API_KEY=abc123'
            }]);
            const file = join(TEST_DIR, 'secrets', '.env');
            expect(existsSync(file)).toBe(true);
            const raw = readFileSync(file, 'utf-8');
            expect(raw).toBe('API_KEY=abc123');
        });

        it('preserves filename from record', async () => {
            await store.store('notes', [{
                id: 'note1',
                record_type: 'note',
                record_title: 'Custom File',
                content: '# Title',
                filename: 'custom-filename.md'
            }]);
            const file = join(TEST_DIR, 'notes', 'custom-filename.md');
            expect(existsSync(file)).toBe(true);
        });

        it('extracts H1 if record_title missing', async () => {
            await store.store('notes', [{
                id: 'md2',
                record_type: 'note',
                content: '# Extracted Title\nSome content.'
            }]);
            const dexPath = join(TEST_DIR, 'dex', 'notes.note.jsonl');
            const line = readFileSync(dexPath, 'utf-8')
                .split('\n')
                .find(l => l.includes('md2'))!;
            const entry = JSON.parse(line);
            expect(entry.record_title).toBe('Extracted Title');
        });

        it('persists JSON and strips sensitive fields from dex', async () => {
            await store.store('goals', [{
                id: 'json1',
                record_type: 'memory',
                data: { title: 'Buy Milk', secret: 'abc' }
            }]);
            const dexPath = join(TEST_DIR, 'dex', 'goals.memory.jsonl');
            const entry = JSON.parse(readFileSync(dexPath, 'utf-8').trim());
            expect(entry.id).toBe('json1');
            expect(entry.record_title).toBe('Buy Milk');
            expect(entry.data).toBeUndefined();
        });

        it('replaces dex entries without duplication', async () => {
            await store.store('updates', [{
                id: 'u1',
                record_type: 'info',
                data: { v: 1 }
            }]);
            await store.store('updates', [{
                id: 'u1',
                record_type: 'info',
                data: { v: 2 }
            }]);
            const dexPath = join(TEST_DIR, 'dex', 'updates.info.jsonl');
            const lines = readFileSync(dexPath, 'utf-8')
                .trim()
                .split('\n');
            expect(lines).toHaveLength(1);
        });
    });

    /* ============================================================
       DISCOVERY
    ============================================================ */

    describe('Query', () => {
        it('supports list-all-ids', async () => {
            const ids = await store.query('notes', {
                type: 'list-all-ids'
            });
            expect(ids).toEqual(expect.arrayContaining(['md1', 'md2']));
        });

        it('isolates collections', async () => {
            const noteIds = await store.query('notes', { type: 'list-all-ids' });
            const goalIds = await store.query('goals', { type: 'list-all-ids' });
            expect(noteIds).not.toContain('json1');
            expect(goalIds).toContain('json1');
        });

        it('supports search-by-content via dex projection', async () => {
            const ids = await store.query('goals', {
                type: 'search-by-content',
                searchTerm: 'Buy Milk'
            });
            expect(ids).toContain('json1');
        });

        it('supports sorting by id asc/desc', async () => {
            await store.store('notes', [{
                id: 'a1',
                record_type: 'note',
                content: '# A1'
            }]);
            const asc = await store.query('notes', {
                type: 'list-all-ids',
                sortBy: 'id',
                sortOrder: 'asc'
            });
            const desc = await store.query('notes', {
                type: 'list-all-ids',
                sortBy: 'id',
                sortOrder: 'desc'
            });
            expect(asc[0]).not.toBe(desc[0]);
        });

        it('supports offset + limit', async () => {
            const ids = await store.query('notes', {
                type: 'list-all-ids',
                sortBy: 'id',
                sortOrder: 'asc',
                offset: 1,
                limit: 1
            });
            expect(ids.length).toBe(1);
        });

        it('throws for unsupported filter-by-tags', async () => {
            await expect(
                store.query('notes', {
                    type: 'filter-by-tags'
                } as any)
            ).rejects.toThrow(/not implemented/i);
        });
    });

    /* ============================================================
       INDEX REBUILD
    ============================================================ */

    describe('Index', () => {
        it('rebuilds from raw files and deduplicates', async () => {
            const manual = join(TEST_DIR, 'notes', 'manual.md');
            writeFileSync(manual, '---\nrecord_type: note\n---\n# Manual');
            await store.index('notes', { event: 'full-build' });
            const dexPath = join(TEST_DIR, 'dex', 'notes.note.jsonl');
            const lines = readFileSync(dexPath, 'utf-8')
                .trim()
                .split('\n');
            const manualLines = lines.filter(l => l.includes('manual'));
            expect(manualLines.length).toBe(1);
        });

        it('survives corrupt JSON file during rebuild', async () => {
            const bad = join(TEST_DIR, 'notes', 'bad.json');
            writeFileSync(bad, '{ invalid json');
            await store.index('notes', { event: 'full-build' });
        });
    });

    /* ============================================================
       HYDRATION
    ============================================================ */

    describe('Fetch', () => {
        it('hydrates mixed-format records', async () => {
            const result = await store.fetch('notes', ['md1', 'md2']);
            expect(result.notes?.['md1']).toBeDefined();
            expect(result.notes?.['md2']?.content).toContain('Some content.');
        });

        it('hydrates yaml files', async () => {
            const result = await store.fetch('configs', ['app-config']);
            expect(result.configs?.['app-config']).toBeDefined();
            expect(result.configs?.['app-config']?.data?.port).toBe(3000);
        });

        it('hydrates raw files', async () => {
            const result = await store.fetch('secrets', ['.env']);
            expect(result.secrets?.['.env']).toBeDefined();
            expect(result.secrets?.['.env']?.content).toBe('API_KEY=abc123');
        });

        it('prevents directory traversal', async () => {
            await expect(
                store.fetch('notes', ['../../../etc/passwd'])
            ).rejects.toThrow(/Security/);
        });
    });

    describe('Lifecycle', () => {
        it('rejects operations after teardown', async () => {
            await store.teardown();
            await expect(
                store.query('notes', { type: 'list-all-ids' })
            ).rejects.toThrow();
            await store.initialize({ rootDirectory: TEST_DIR });
        });
    });
});
