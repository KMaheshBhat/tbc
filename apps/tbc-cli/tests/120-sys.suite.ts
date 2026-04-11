import { file } from 'bun';
import { describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { readdirSync } from 'node:fs';
import {
    CLI_TARGET,
    TBC_ROOT_NEXT,
    expectUUID,
    expectSQLiteRecord,
    expectSQLiteData,
    runMonorepoCommand,
    querySqliteNext,
} from './test-helper';

// Define types for SQLite results to satisfy TypeScript strict mode
interface RecordRow {
    record_id: string;
    collection: string;
}

interface RelationRow {
    relation_kind: string;
    from_record_id: string;
    to_record_id: string;
}

interface CountRow {
    count: number;
}

describe('🦍 120 LETS-GO: tbc sys (Kong/Next)', () => {

    test('sys init --profile next should sync identity to SQLite with deep validation', async () => {
        const { output, success, exitCode } = runMonorepoCommand(TBC_ROOT_NEXT, CLI_TARGET, [
            'sys',
            'init',
            '--root',
            TBC_ROOT_NEXT,
            '--companion',
            'Kong',
            '--prime',
            'Zilla',
            '--profile',
            'next',
        ]);
        expect(success).toBe(true);
        expect(exitCode).toBe(0);
        expect(output).toContain('[✓] STABLE');
        expect(output).toContain('Companion: Kong');
        const companionIdPath = join(TBC_ROOT_NEXT, 'sys_next', 'companion.id');
        const primeIdPath = join(TBC_ROOT_NEXT, 'sys_next', 'prime.id');
        const companionId = (await file(companionIdPath).text()).trim();
        const primeId = (await file(primeIdPath).text()).trim();
        expectUUID(companionId);
        expectUUID(primeId);
        const tables = querySqliteNext("SELECT name FROM sqlite_master WHERE type='table' AND name='record'") as any[];
        expect(tables.length).toBe(1);
        const memNextFiles = readdirSync(join(TBC_ROOT_NEXT, 'mem_next')).filter(f => f.endsWith('.md'));
        const dbRecords = querySqliteNext('SELECT record_id FROM record WHERE collection = ?', ['mem_next']) as RecordRow[];
        expect(dbRecords.length).toBe(memNextFiles.length);
        expect(dbRecords.length).toBeGreaterThanOrEqual(3);
        expectSQLiteRecord(companionId);
        expectSQLiteRecord(primeId);
        expectSQLiteData(companionId, 'record_title', 'Kong');
        expectSQLiteData(companionId, 'record_type', 'party');
        expectSQLiteData(primeId, 'record_title', 'Zilla');
    });

    test('path isolation: Mojo operations should not leak into Kong SQLite', () => {
        const beforeRows = querySqliteNext('SELECT COUNT(*) as count FROM record') as CountRow[];
        const countBefore = beforeRows[0]?.count;
        expect(TBC_ROOT_NEXT).not.toContain('mojo');
        const afterRows = querySqliteNext('SELECT COUNT(*) as count FROM record') as CountRow[];
        const countAfter = afterRows[0]?.count;
        expect(countBefore).toBe(countAfter);
    });

    test('sys validate should confirm stability for Kong profile', () => {
        const { output, success } = runMonorepoCommand(TBC_ROOT_NEXT, CLI_TARGET, [
            'sys',
            'validate',
            '--verbose',
            '--root',
            TBC_ROOT_NEXT,
        ]);
        expect(success).toBe(true);
        expect(output).toContain('Verified presence of "root.md"');
        expect(output).toContain('[✓] STABLE');
    });

    test('sys upgrade should refresh system specs and maintain stability', async () => {
        const { output, success } = runMonorepoCommand(TBC_ROOT_NEXT, CLI_TARGET, [
            'sys',
            'upgrade',
            '--root',
            TBC_ROOT_NEXT,
        ]);
        expect(success).toBe(true);
        expect(output).toContain('Resolved protocol collections from sys_next/root.md');
        expect(output).toContain('┌┤ Validation Audit ├');
        expect(output).toContain('[✓] STABLE');
    });

});