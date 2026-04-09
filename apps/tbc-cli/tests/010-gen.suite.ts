import { describe, expect, test } from 'bun:test';

import { runMonorepoCommand } from '../../../scripts/common';

import { CLI_TARGET, SANDBOX, TSID_SEARCH_REGEX, UUID_SEARCH_REGEX, expectTSID, expectUUID } from './test-helper';

describe('🐵 GENERATOR: tbc gen', () => {

    test('should generate a single UUID v7 by default', () => {
        const { output, success } = runMonorepoCommand(SANDBOX, CLI_TARGET, [
            'gen',
            'uuid',
        ]);
        expect(success).toBe(true);
        expect(output).toContain('┌┤ Minted IDs ├');
        expect(output).toContain('├┤ Batch ├');
        const matches = output.match(UUID_SEARCH_REGEX);
        expect(matches).not.toBeNull();
        if (matches) expectUUID(matches[0]);
    });

    test('should generate multiple UUIDs using --count', () => {
        const count = 5;
        const { output, success } = runMonorepoCommand(SANDBOX, CLI_TARGET, [
            'gen',
            'uuid',
            '--count',
            count.toString(),
        ]);
        expect(success).toBe(true);
        const matches = output.match(new RegExp(UUID_SEARCH_REGEX, 'g'));
        expect(matches?.length).toBe(count);
    });

    test('should generate a single TSID (timestamp ID)', () => {
        const { output, success } = runMonorepoCommand(SANDBOX, CLI_TARGET, [
            'gen',
            'tsid',
        ]);
        expect(success).toBe(true);
        expect(output).toContain('┌┤ Minted IDs ├');
        const matches = output.match(TSID_SEARCH_REGEX);
        expect(matches).not.toBeNull();
        if (matches) expectTSID(matches[0]);
    });

    test('should generate multiple TSIDs using -c shorthand', () => {
        const count = 2;
        const { output, success } = runMonorepoCommand(SANDBOX, CLI_TARGET, [
            'gen',
            'tsid',
            '-c',
            count.toString(),
        ]);
        expect(success).toBe(true);
        const matches = output.match(new RegExp(TSID_SEARCH_REGEX.source, 'g'));
        expect(matches?.length).toBe(count);
    });

    test('should show error for invalid count', () => {
        const { success, exitCode } = runMonorepoCommand(SANDBOX, CLI_TARGET, [
            'gen',
            'uuid',
            '--count',
            'zero',
        ]);
        expect(success).toBe(false);
        expect(exitCode).toBe(1);
    });
});
