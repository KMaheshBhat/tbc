import { describe, expect, test } from 'bun:test';
import { runTbcCommand } from './test-helper';
import { CLI_TARGET, NON_TBC_ROOT, SANDBOX, TBC_ROOT, UUID_SEARCH_REGEX } from './test-helper';

describe('🐵 0301 tbc mem recall', () => {

    test('00 should recall companion identity (who am i)', () => {
        const { output, success, exitCode } = runTbcCommand(TBC_ROOT, [
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

    test('02 should recall prime identity (who is my prime)', () => {
        const { output, success } = runTbcCommand(TBC_ROOT, [
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

    test('03 should recall a list of recent memories by default', () => {
        const { output, success } = runTbcCommand(TBC_ROOT, [
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

    test('04 should filter recall results by type (e.g., goals)', () => {
        const { output, success } = runTbcCommand(TBC_ROOT, [
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

    test('05 should support search queries across titles', () => {
        const { output, success } = runTbcCommand(TBC_ROOT, [
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

    test('06 should handle queries with no matches gracefully', () => {
        const { output, success } = runTbcCommand(TBC_ROOT, [
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

    test('07 should return zero results when type filter excludes keyword matches', () => {
        const { output, success } = runTbcCommand(TBC_ROOT, [
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

    test('08 should abort recall if run in a non-TBC directory', () => {
        const { output, success } = runTbcCommand(SANDBOX, [
            'mem',
            'recall',
            '--root',
            NON_TBC_ROOT,
        ]);
        expect(success).toBe(true);
        // The label is a DX artefact; the behaviour is the OX/AX surface. Assert
        // the guard's behaviour, not its label (D16, §5.2.1).
        expect(output).toMatch(/error\s+\|\s+[^|]+\|\s+has no existing companion/);
        expect(output).toContain('has no existing companion (not a valid TBC Root)');
        expect(output).toContain('Suggestion: Use "tbc sys init" instead.');
    });

    test('09 should respect the --limit flag and return the newest records first', () => {
        const limit = 3;
        const { output, success } = runTbcCommand(TBC_ROOT, [
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

    test('10 should query SQLite for recall results (hybrid querier)', () => {
        const { output, success } = runTbcCommand(TBC_ROOT, [
            'mem',
            'recall',
            '--root',
            TBC_ROOT,
            '--verbose',
        ]);
        expect(success).toBe(true);
        expect(output).toContain('SQLite');
    });

    test('11 should support rapid keyword search via SQLite', () => {
        const { output, success } = runTbcCommand(TBC_ROOT, [
            'mem',
            'recall',
            'bananas',
            '--root',
            TBC_ROOT,
        ]);
        expect(success).toBe(true);
        expect(output).toContain('Buy more bananas for Mojo');
    });

    test('12 should find a record by a body-only keyword (the SQLite index carries the body)', () => {
        // The filesystem is the durable store, SQLite is the index that makes
        // the search fast. Both stores must therefore carry the record body,
        // otherwise a body-only keyword is not searchable through the index.
        const bodyPhrase = 'zzqx-body-only-marker';
        const remembered = runTbcCommand(TBC_ROOT, [
            'mem',
            'remember',
            `A thought whose body carries ${bodyPhrase} and nothing else`,
            '--type',
            'note',
            '--title',
            'Body Index Probe',
            '--root',
            TBC_ROOT,
        ]);
        expect(remembered.success).toBe(true);

        const { output, success } = runTbcCommand(TBC_ROOT, [
            'mem',
            'recall',
            bodyPhrase,
            '--root',
            TBC_ROOT,
        ]);
        expect(success).toBe(true);
        expect(output).toContain('Body Index Probe');
    });

});
