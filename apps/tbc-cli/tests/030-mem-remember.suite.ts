import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { runMonorepoCommand } from '../../../scripts/common';

import { CLI_TARGET, TBC_ROOT, UUID_SEARCH_REGEX, expectSQLiteDataMojo, expectSQLiteRecordMojo } from './test-helper';

describe('🐵 030 LETS-GO: tbc mem remember', () => {

    test('should remember a simple note with a generated UUID', async () => {
        const thought = 'Buy more bananas for Mojo';
        const { output, success, exitCode } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            'mem',
            'remember',
            thought,
            '--root',
            TBC_ROOT,
        ]);
        expect(success).toBe(true);
        expect(exitCode).toBe(0);
        expect(output).toContain('[✓] Memory persisted');
        expect(output).toContain('Suggestion:');
        const matches = output.match(UUID_SEARCH_REGEX);
        const mintedId = matches![matches!.length - 1];
        const memFilePath = join(TBC_ROOT, 'mem', `${mintedId}.md`);
        expect(existsSync(memFilePath)).toBe(true);
        const content = readFileSync(memFilePath, 'utf-8');
        expect(content).toContain(`id: ${mintedId}`);
        expect(content).toContain('record_type: note');
        expect(content).toContain('record_title: Buy more bananas for Mojo');
        expect(content).toContain('record_create_date: ');
        expect(content).toContain('# Buy more bananas for Mojo');
        expect(content).toContain('- c/agent/mojo');
        expect(content.endsWith('\n')).toBe(true);
    });

    test('should create a stub for a specific record type', async () => {
        const { output, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            'mem',
            'remember',
            '--type',
            'goal',
            '--root',
            TBC_ROOT,
        ]);
        expect(success).toBe(true);
        const matches = output.match(UUID_SEARCH_REGEX);
        const mintedId = matches![matches!.length - 1];
        const content = readFileSync(join(TBC_ROOT, 'mem', `${mintedId}.md`), 'utf-8');
        expect(content).toContain('record_type: goal');
        expect(content).toContain('record_title: New goal');
        expect(content).toContain('# New goal');
        expect(content).toContain('- c/agent/mojo');
        expect(content).not.toContain('Untitled');
    });

    test('should accept tags and title via flags', async () => {
        const detail = 'Detail about the plan';
        const { output, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            'mem',
            'remember',
            detail,
            '--type',
            'note',
            '--title',
            'Master Plan',
            '--tags',
            'plan,secret,mojo',
            '--root',
            TBC_ROOT,
        ]);
        expect(success).toBe(true);
        const matches = output.match(UUID_SEARCH_REGEX);
        const mintedId = matches![matches!.length - 1];
        const content = readFileSync(join(TBC_ROOT, 'mem', `${mintedId}.md`), 'utf-8');
        expect(content).toContain('record_title: Master Plan');
        expect(content).toContain('# Master Plan');
        expect(content).toContain(detail);
        expect(content).toContain('- t/plan');
        expect(content).toContain('- t/secret');
        expect(content).toContain('- t/mojo');
        expect(content).toContain('- c/agent/mojo');
    });

    test('should persist memory to both FS and SQLite (hybrid dual-write)', async () => {
        const thought = 'Test SQLite dual-write';
        const { output, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            'mem',
            'remember',
            thought,
            '--root',
            TBC_ROOT,
        ]);
        expect(success).toBe(true);
        const matches = output.match(UUID_SEARCH_REGEX);
        const mintedId = matches?.[matches.length - 1];
        expect(mintedId).toBeDefined();
        const memFilePath = join(TBC_ROOT, 'mem', `${mintedId}.md`);
        expect(existsSync(memFilePath)).toBe(true);
        expectSQLiteRecordMojo(mintedId!);
        expectSQLiteDataMojo(mintedId!, 'record_title', thought);
        expectSQLiteDataMojo(mintedId!, 'record_type', 'note');
    });

    test('should index tags into the SQLite relation table', async () => {
        const { output, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            'mem',
            'remember',
            'Scaling the empire',
            '--tags',
            'growth,bananas',
            '--root',
            TBC_ROOT,
        ]);
        const matches = output.match(UUID_SEARCH_REGEX);
        const mintedId = matches?.[matches.length - 1];
        expect(mintedId).toBeDefined();
        expectSQLiteDataMojo(mintedId!, 'record_tags', (tags: string) => {
            return tags.includes('t/growth') && tags.includes('t/bananas');
        });
    });

});
