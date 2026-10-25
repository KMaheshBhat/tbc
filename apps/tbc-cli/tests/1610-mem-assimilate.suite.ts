import { describe, expect, test, beforeAll } from 'bun:test';
import { existsSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { runTbcCommand } from './test-helper';

import { CLI_TARGET, TBC_ROOT_NEXT, querySqliteNext } from './test-helper';

describe('🦍 1610 tbc mem assimilate', () => {
    const manualMemId = '019d6261-c37d-77e5-8460-c6c5a896bc67';
    const manualMemPath = join(TBC_ROOT_NEXT, 'mem_next', `${manualMemId}.md`);

    beforeAll(() => {
        const content = `---
id: ${manualMemId}
record_type: note
record_title: Manual memory for assimilate test (Kong)
record_create_date: ${new Date().toISOString()}
record_tags: [assimilate, test, kong]
---
# Manual memory for assimilate test (Kong)
This was added manually to test mem assimilate on Kong.`;
        writeFileSync(manualMemPath, content);
    });

    test('00 should assimilate memory from FS to FS+SQLite', async () => {
        const { output, success } = runTbcCommand(TBC_ROOT_NEXT, [
            'mem',
            'assimilate',
            '--root',
            TBC_ROOT_NEXT,
            '--verbose',
        ]);
        expect(success).toBe(true);
        expect(output).toContain('Found');
        expect(output).toContain('record(s) to assimilate.');
        expect(output).toContain('Broadcast');
        expect(existsSync(manualMemPath)).toBe(true);
        // The store key differs between the two implementations:
        //  - the legacy implementation wrote the file name with the '.md' suffix;
        //  - the current implementation writes the bare record id — the same key
        //    `tbc mem remember` and `act close` use (see the `tbc mem assimilate`
        //    design plan, §6.1 — the legacy created a second row for every record).
        const results = querySqliteNext(
            'SELECT record_id FROM record WHERE record_id IN (?, ?)',
            [manualMemId, `${manualMemId}.md`],
        );
        expect(results.length).toBeGreaterThan(0);
    });

    test('01 should store the bare record id with the mined record_type', () => {
        const results = querySqliteNext('SELECT record_id, record_kind FROM record WHERE record_id = ?', [manualMemId]);
        expect(results.length).toBe(1);
        expect((results[0] as any).record_kind).toBe('note');
    });

    test('02 should mine the relationships and bake the front matter', () => {
        const relations = querySqliteNext(
            'SELECT relation_kind, from_record_id, to_record_id FROM record_relation WHERE from_record_id = ?',
            [manualMemId],
        );
        const tags = relations.map((r: any) => r.to_record_id);
        expect(relations.length).toBeGreaterThan(0);
        expect(tags).toContain('t/assimilate');
        expect(tags).toContain('t/test');
        expect(tags).toContain('c/agent/kong');
        const content = readFileSync(manualMemPath, 'utf-8');
        expect(content).toContain('id: ' + manualMemId);
        expect(content).toContain('- t/assimilate');
        expect(content).toContain('- c/agent/kong');
    });

    test('03 should be idempotent — a second assimilate must change nothing', () => {
        const rowsBefore = querySqliteNext('SELECT record_id FROM record WHERE collection = ?', ['mem_next']).length;
        const relationsBefore = querySqliteNext('SELECT relation_id FROM record_relation WHERE collection = ?', ['mem_next']).length;
        const updatedBefore = (querySqliteNext(
            'SELECT record_id, updated_at FROM record WHERE record_id = ?',
            [manualMemId],
        ) as Array<{ record_id: string; updated_at: string }>)[0]?.updated_at;
        const before = readFileSync(manualMemPath, 'utf-8');
        const { success } = runTbcCommand(TBC_ROOT_NEXT, ['mem', 'assimilate', '--root', TBC_ROOT_NEXT, '--verbose']);
        expect(success).toBe(true);
        expect(querySqliteNext('SELECT record_id FROM record WHERE collection = ?', ['mem_next']).length).toBe(rowsBefore);
        expect(querySqliteNext('SELECT relation_id FROM record_relation WHERE collection = ?', ['mem_next']).length).toBe(relationsBefore);
        expect(readFileSync(manualMemPath, 'utf-8')).toBe(before);
        // The index row of an already-indexed record must not be rewritten when
        // its payload is unchanged — a second assimilate must leave `updated_at`
        // exactly where the first one left it (D12).
        const updatedAfter = (querySqliteNext(
            'SELECT record_id, updated_at FROM record WHERE record_id = ?',
            [manualMemId],
        ) as Array<{ record_id: string; updated_at: string }>)[0]?.updated_at;
        expect(updatedAfter).toBe(updatedBefore);
    });
});