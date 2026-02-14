import { describe, expect, test } from 'bun:test';

import { runMonorepoCommand } from '../../../scripts/common';

import { CLI_TARGET, SANDBOX, TBC_ROOT, UUID_SEARCH_REGEX } from './test-helper';

describe('🐵 LETS-GO: tbc mem recall', () => {

    test('should recall companion identity (who am i)', () => {
        const { output, success, exitCode } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            'mem', 'recall', 'companion', '--root', TBC_ROOT,
        ]);

        expect(success).toBe(true);
        expect(exitCode).toBe(0);
        expect(output).toContain('Companion Identity');
        expect(output).toContain('Mojo');
        // Verify it displays the ID from the .id file
        const matches = output.match(UUID_SEARCH_REGEX);
        expect(matches).not.toBeNull();
    });

    test('should recall prime identity (who is my prime)', () => {
        const { output, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            'mem', 'recall', 'prime', '--root', TBC_ROOT,
        ]);

        expect(success).toBe(true);
        expect(output).toContain('Prime Identity');
        expect(output).toContain('Jojo');
        const matches = output.match(UUID_SEARCH_REGEX);
        expect(matches).not.toBeNull();
    });

    test('should recall a list of recent memories by default', () => {
        const { output, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            'mem', 'recall',
            '--root', TBC_ROOT,
        ]);

        expect(success).toBe(true);
        // Structural checks
        expect(output).toContain('Recalled Memories');
        expect(output).toContain('[✓]'); // Verify normalized success indicators

        // Content checks
        expect(output).toContain('note');
        expect(output).toContain('goal');
        expect(output).toContain('Master Plan');
        expect(output).toContain('Buy more bananas for Mojo');

        // Actionability check
        expect(output).toContain('Suggestion: Lookup those record(s)');
    });

    test('should filter recall results by type (e.g., goals)', () => {
        const { output, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            'mem', 'recall',
            '--type', 'goal',
            '--root', TBC_ROOT,
        ]);

        expect(success).toBe(true);
        expect(output).toContain('goal');
        expect(output).toContain('New goal');

        // Strict filtering check: should NOT show notes
        expect(output).not.toContain('note');
        expect(output).not.toContain('Buy more bananas');
    });

    test('should support search queries across titles', () => {
        // We are searching for "bananas"
        // This should match "Buy more bananas for Mojo"
        const { output, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            'mem', 'recall', 'bananas', '--root', TBC_ROOT,
        ]);

        expect(success).toBe(true);

        // 1. Verify the UI header for search results
        expect(output).toContain('Recalled Memories');

        // 2. Verify we found the specific record
        expect(output).toContain('Buy more bananas for Mojo');
        expect(output).toContain('note');

        // 3. Verify the count reflects a filtered view (should be 1, not 6)
        expect(output).toContain('Found 1 memory record(s)');

        // 4. Negative check: "Master Plan" should NOT be in the results for "bananas"
        expect(output).not.toContain('Master Plan');
    });

    test('should handle queries with no matches gracefully', () => {
        const { output, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            'mem', 'recall', 'nonexistent-memory-term', '--root', TBC_ROOT,
        ]);

        expect(success).toBe(true); // The command succeeded, even if 0 results found
        expect(output).toContain('No memory records found.');
        expect(output).toContain('Suggestion: Try a different query!');

        // Ensure the table isn't rendered if empty
        expect(output).not.toContain('┌┤ Recalled Memories');
    });

    test('should return zero results when type filter excludes keyword matches', () => {
        const { output, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            'mem', 'recall', 'bananas', '--type', 'goal', '--root', TBC_ROOT,
        ]);

        expect(success).toBe(true);
        expect(output).toContain('No memory records found.');
    });

    test('should abort recall if run in a non-TBC directory', () => {
        const { output, success } = runMonorepoCommand(SANDBOX, CLI_TARGET, [
            'mem', 'recall', '--root', SANDBOX,
        ]);

        // success should likely be false if the flow aborted on error
        expect(success).toBe(true);

        // Match the actual rendered strings
        expect(output).toContain('error | recall-flow');
        expect(output).toContain('has no existing companion (not a valid TBC Root)');
        expect(output).toContain('Suggestion: Use "tbc sys init" instead.');
    });

    test('should respect the --limit flag and return the newest records first', () => {
        const limit = 2;
        const { output, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            'mem', 'recall',
            '--limit', limit.toString(),
            '--root', TBC_ROOT,
        ]);

        expect(success).toBe(true);

        // 1. Verify the count in the footer message
        expect(output).toContain(`Found ${limit} memory record(s)`);

        // 2. Verify chronological integrity:
        // The newest record (Master Plan) should be there
        expect(output).toContain('Master Plan');

        // 3. Verify it's not showing older records that exceed the limit
        // Based on your output, "Mojo" and "Jojo" should be excluded
        expect(output).not.toContain('party      ] Mojo');
        expect(output).not.toContain('party      ] Jojo');

        // 4. (Optional) Check the UI table structure matches the limit
        // Count the number of checkmarks [✓] rendered in the results
        // 2. Isolate the table section to count accurately
        const tableContent = output.split('┌┤ Recalled Memories')[1] || '';
        const matchCount = (tableContent.match(/\[✓\]/g) || []).length;
        expect(matchCount).toBe(limit);
    });

});
