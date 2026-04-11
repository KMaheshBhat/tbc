import { describe, expect, test } from 'bun:test';
import { runMonorepoCommand } from '../../../scripts/common';
import { CLI_TARGET, SANDBOX, TBC_ROOT, UUID_SEARCH_REGEX } from './test-helper';

describe('🐵 031 LETS-GO: tbc mem recall', () => {

    test('should recall companion identity (who am i)', () => {
        const { output, success, exitCode } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            'mem',
            'recall',
            'companion',
            '--root',
            TBC_ROOT,
        ]);
        expect(success).toBe(true);
        expect(exitCode).toBe(0);
        expect(output).toContain('Companion Identity');
        expect(output).toContain('Mojo');
        const matches = output.match(UUID_SEARCH_REGEX);
        expect(matches).not.toBeNull();
    });

    test('should recall prime identity (who is my prime)', () => {
        const { output, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            'mem',
            'recall',
            'prime',
            '--root',
            TBC_ROOT,
        ]);
        expect(success).toBe(true);
        expect(output).toContain('Prime Identity');
        expect(output).toContain('Jojo');
        const matches = output.match(UUID_SEARCH_REGEX);
        expect(matches).not.toBeNull();
    });

    test('should recall a list of recent memories by default', () => {
        const { output, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            'mem',
            'recall',
            '--root',
            TBC_ROOT,
        ]);
        expect(success).toBe(true);
        expect(output).toContain('Recalled Memories');
        expect(output).toContain('[✓]');
        expect(output).toContain('note');
        expect(output).toContain('goal');
        expect(output).toContain('Master Plan');
        expect(output).toContain('Buy more bananas for Mojo');
        expect(output).toContain('Suggestion: Lookup those record(s)');
    });

    test('should filter recall results by type (e.g., goals)', () => {
        const { output, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            'mem',
            'recall',
            '--type',
            'goal',
            '--root',
            TBC_ROOT,
        ]);
        expect(success).toBe(true);
        expect(output).toContain('goal');
        expect(output).toContain('New goal');
        expect(output).not.toContain('note');
        expect(output).not.toContain('Buy more bananas');
    });

    test('should support search queries across titles', () => {
        const { output, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            'mem',
            'recall',
            'bananas',
            '--root',
            TBC_ROOT,
        ]);
        expect(success).toBe(true);
        expect(output).toContain('Recalled Memories');
        expect(output).toContain('Buy more bananas for Mojo');
        expect(output).toContain('note');
        expect(output).toContain('Found 2 memory record(s)');
        expect(output).not.toContain('Master Plan');
    });

    test('should handle queries with no matches gracefully', () => {
        const { output, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            'mem',
            'recall',
            'nonexistent-memory-term',
            '--root',
            TBC_ROOT,
        ]);
        expect(success).toBe(true);
        expect(output).toContain('No memory records found.');
        expect(output).toContain('Suggestion: Try a different query!');
        expect(output).not.toContain('┌┤ Recalled Memories');
    });

    test('should return zero results when type filter excludes keyword matches', () => {
        const { output, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            'mem',
            'recall',
            'bananas',
            '--type',
            'goal',
            '--root',
            TBC_ROOT,
        ]);
        expect(success).toBe(true);
        expect(output).toContain('No memory records found.');
    });

    test('should abort recall if run in a non-TBC directory', () => {
        const { output, success } = runMonorepoCommand(SANDBOX, CLI_TARGET, [
            'mem',
            'recall',
            '--root',
            SANDBOX,
        ]);
        expect(success).toBe(true);
        expect(output).toContain('error | recall-flow');
        expect(output).toContain('has no existing companion (not a valid TBC Root)');
        expect(output).toContain('Suggestion: Use "tbc sys init" instead.');
    });

    test('should respect the --limit flag and return the newest records first', () => {
        const limit = 3;
        const { output, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            'mem',
            'recall',
            '--limit',
            limit.toString(),
            '--root',
            TBC_ROOT,
        ]);
        expect(success).toBe(true);
        expect(output).toContain(`Found ${limit} memory record(s)`);
        expect(output).toContain('Master Plan');
        expect(output).not.toContain('party      ] Mojo');
        expect(output).not.toContain('party      ] Jojo');
        const tableContent = output.split('┌┤ Recalled Memories')[1] || '';
        const matchCount = (tableContent.match(/\[✓\]/g) || []).length;
        expect(matchCount).toBe(limit);
    });

    test('should query SQLite for recall results (hybrid querier)', () => {
        const { output, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            'mem',
            'recall',
            '--root',
            TBC_ROOT,
            '--verbose',
        ]);
        expect(success).toBe(true);
        expect(output).toContain('SQLite');
    });

    test('should support rapid keyword search via SQLite', () => {
        const { output, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            'mem',
            'recall',
            'bananas',
            '--root',
            TBC_ROOT,
        ]);
        expect(success).toBe(true);
        expect(output).toContain('Buy more bananas for Mojo');
    });

});
