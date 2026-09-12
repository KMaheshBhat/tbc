import { describe, expect, test } from 'bun:test';

import { runTbcCommand } from './test-helper';

import { CLI_TARGET, SANDBOX, TBC_ROOT } from './test-helper';

describe('🐵 0101', () => {
    describe('tbc ', () => {
        test('00 running with no args gives help and error exit code (still provides Usage)', () => {
            const { output, exitCode, success } = runTbcCommand(SANDBOX, []);
            expect(success).toBe(false);
            expect(exitCode).toBe(1);
            expect(output).toContain('Third Brain Companion CLI');
            expect(output).toContain('Usage:');
        });

        test('01 running with --help gives help and success exit code', () => {
            const { output, exitCode, success } = runTbcCommand(SANDBOX, [
                '--help',
            ]);
            expect(success).toBe(true);
            expect(exitCode).toBe(0);
            expect(output).toContain('Third Brain Companion CLI');
            expect(output).toContain('Usage:');
        });
    });

    describe('tbc sys init', () => {
        test('10 running sys init with missing flags is fails with helpful message', () => {
            {
                const { output, exitCode, success } = runTbcCommand(SANDBOX, [
                    'sys',
                    'init',
                ]);
                expect(success).toBe(false);
                expect(exitCode).toBe(1);
                expect(output).toContain('Both --companion and --prime flags are required');
            }
            {
                const { output, exitCode, success } = runTbcCommand(SANDBOX, [
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
                const { output, exitCode, success } = runTbcCommand(SANDBOX, [
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
                const { output, exitCode, success } = runTbcCommand(SANDBOX, [
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
        test('20 running sys upgrade on non-TBC-Root should fail with helpful message', async () => {
            const { output, exitCode, success } = runTbcCommand(TBC_ROOT, [
                'sys',
                'upgrade',
                '--root',
                TBC_ROOT,
            ]);
            expect(exitCode).toBe(0);
            expect(output).toMatch(/\[✗\]\s+┬─\s+error\s+\|\s+[^|]+\|\s+has no existing companion/);
            expect(output).toMatch(/└─\s+Suggestion:\s+Use "tbc sys init" instead/);
        });
    });

});
