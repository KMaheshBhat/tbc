import { describe, expect, test } from 'bun:test';

import {
    TBC_ROOT,
    SANDBOX,
    CLI_TARGET,
    runMonorepoCommand,
    NON_TBC_ROOT,
} from './test-helper';

describe('🐵 0500 tbc int probe', () => {

    test('00 should probe successfully when provided a valid TBC_ROOT', () => {
        const { output, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            'int',
            'probe',
            '--root',
            TBC_ROOT,
        ]);
        expect(success).toBe(true);
        expect(output).toMatch(/TBC Root:.*\(valid\)/);
        expect(output).toContain('Application Info');
        expect(output).toContain('TBC Info');
        expect(output).toContain('System Info');
        expect(output).toContain('OS and Shell Info');
        expect(output).toContain('TBC CLI:');
        expect(output).toContain('Node.js Version:');
        expect(output).toContain('Platform:');
        expect(output).toContain(TBC_ROOT);
    });

    test('01 should probe sanely when run in a non-TBC directory (SANDBOX)', () => {
        const { output, success } = runMonorepoCommand(SANDBOX, CLI_TARGET, [
            'int',
            'probe',
            '--root',
            NON_TBC_ROOT,
        ]);
        expect(success).toBe(true);
        expect(output).toContain('DEGRADED');
        expect(output).toContain('Essential record "root.md" is missing');
        expect(output).toMatch(/TBC Root:.*\(invalid\)/);
        expect(output).toContain('System Info');
        expect(output).toContain('User:');
        expect(output).toContain('OS and Shell Info');
        expect(output).toContain('(invalid)');
    });

});
