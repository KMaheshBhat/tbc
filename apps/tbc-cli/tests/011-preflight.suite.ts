import { describe, expect, test } from 'bun:test';

import { runMonorepoCommand } from '../../../scripts/common';

import { CLI_TARGET, SANDBOX, TBC_ROOT } from './test-helper';

describe('🐵 PRE-FLIGHT', () => {
    describe('tbc ', () => {
        test('running with no args gives help and error exit code (still provides Usage)', () => {
            const { output, exitCode, success } = runMonorepoCommand(SANDBOX, CLI_TARGET, []);
            expect(success).toBe(false);
            expect(exitCode).toBe(1);
            expect(output).toContain('Third Brain Companion CLI');
            expect(output).toContain('Usage:');
        });

        test('running with --help gives help and success exit code', () => {
            const { output, exitCode, success } = runMonorepoCommand(SANDBOX, CLI_TARGET, [
                '--help',
            ]);
            expect(success).toBe(true);
            expect(exitCode).toBe(0);
            expect(output).toContain('Third Brain Companion CLI');
            expect(output).toContain('Usage:');
        });
    });

    describe('tbc sys init', () => {
        test('running sys init with missing flags is fails with helpful message', () => {
            {
                const { output, exitCode, success } = runMonorepoCommand(SANDBOX, CLI_TARGET, [
                    'sys',
                    'init',
                ]);
                expect(success).toBe(false);
                expect(exitCode).toBe(1);
                expect(output).toContain('Both --companion and --prime flags are required');
            }
            {
                const { output, exitCode, success } = runMonorepoCommand(SANDBOX, CLI_TARGET, [
                    'sys',
                    'init',
                    '--root',
                    TBC_ROOT,
                ]);
                expect(success).toBe(false);
                expect(exitCode).toBe(1);
                expect(output).toContain('Both --companion and --prime flags are required');
            }
            {
                const { output, exitCode, success } = runMonorepoCommand(SANDBOX, CLI_TARGET, [
                    'sys',
                    'init',
                    '--root',
                    TBC_ROOT,
                    '--companion',
                    'Mojo',
                ]);
                expect(success).toBe(false);
                expect(exitCode).toBe(1);
                expect(output).toContain('Both --companion and --prime flags are required');
            }
            {
                const { output, exitCode, success } = runMonorepoCommand(SANDBOX, CLI_TARGET, [
                    'sys',
                    'init',
                    '--root',
                    TBC_ROOT,
                    '--prime',
                    'Jojo',
                ]);
                expect(success).toBe(false);
                expect(exitCode).toBe(1);
                expect(output).toContain('Both --companion and --prime flags are required');
            }
        });
    });

    describe('tbc sys upgrade', () => {
        test('running sys upgrade on non-TBC-Root should fail with helpful message', async () => {
            const { output, exitCode, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
                'sys',
                'upgrade',
                '--root',
                TBC_ROOT,
            ]);
            expect(exitCode).toBe(0);
            expect(output).toContain('[✗] ┬─ error | upgrade-flow | has no existing companion (not a valid TBC Root)');
            expect(output).toContain('    └─ Suggestion: Use "tbc sys init" instead');
        });
    });

});
