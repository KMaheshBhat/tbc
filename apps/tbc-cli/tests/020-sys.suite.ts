import { file } from 'bun';
import { describe, expect, test } from 'bun:test';
import { join } from 'node:path';

import { generateFileTree, runMonorepoCommand } from '../../../scripts/common';
import packageJson from '../package.json' with { type: 'json' };

import { CLI_TARGET, TBC_ROOT, expectUUID } from './test-helper';

describe('🐵 LETS-GO: tbc sys', () => {

    test('running sys init with companion and prime flags is successful', async () => {
        const { output, exitCode, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            'sys',
            'init',
            '--root',
            TBC_ROOT,
            '--companion',
            'Mojo',
            '--prime',
            'Jojo',
        ]);
        expect(success).toBe(true);
        expect(exitCode).toBe(0);
        const companionIdPath = join(TBC_ROOT, 'sys', 'companion.id');
        const companionId = (await file(companionIdPath).text()).trim();
        expectUUID(companionId);
        const primeIdPath = join(TBC_ROOT, 'sys', 'prime.id');
        const primeId = (await file(primeIdPath).text()).trim();
        expectUUID(primeId);
        expect(output).toContain('┌┤ Minted IDs ├');
        expect(output).toContain('├┤ Keyed ├');
        expect(output).toContain('[i] ── info  | init-flow | companionID: ');
        expect(output).toContain('[i] ── info  | init-flow | primeID: ');
        expect(output).toContain('[i] ── info  | init-flow | memoryMapID: ');
        expect(output).toContain('[✓] STABLE   | 0 error(s) detected.');
        expect(output).toContain('[i] ── info  | init-flow | Companion: Mojo');
        expect(output).toContain('[i] ── info  | init-flow | Prime: Jojo');
        expect(output).toContain('[i] ── info  | init-flow | Map of Memories');
        expect(output).toContain(`[✓] Third Brain Companion ${packageJson.version} initialized.`);
    });

    test('running sys init on existing TBC-Root should fail with helpful message', async () => {
        const { output, exitCode, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            'sys',
            'init',
            '--root',
            TBC_ROOT,
            '--companion',
            'Mojo',
            '--prime',
            'Jojo',
        ]);
        if (!success) {
            console.log(output);
            console.log('Tree on failure:');
            console.log(generateFileTree(TBC_ROOT));
        }
        expect(exitCode).toBe(0);
        expect(output).toContain('[✓] STABLE   | 0 error(s) detected.');
        expect(output).toContain('[✗] ┬─ error | init-flow | has existing companion');
        expect(output).toContain('    └─ Suggestion: Use "tbc sys upgrade" instead.');
    });

    test('running sys upgrade on TBC-Root is successful', async () => {
        const { output, exitCode, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            'sys',
            'upgrade',
            '--root',
            TBC_ROOT,
        ]);
        expect(success).toBe(true);
        expect(exitCode).toBe(0);
        expect(output).toContain(`[✓] Third Brain Companion upgraded to ${packageJson.version}.`);
    });

    test('running sys validate on a healthy root', () => {
        const { output, exitCode, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            'sys',
            'validate',
            '--root',
            TBC_ROOT,
        ]);
        expect(success).toBe(true);
        expect(exitCode).toBe(0);
        // Verify the Audit Box exists
        expect(output).toContain('┌┤ Validation Audit ├');
        expect(output).toContain('Verified presence of "root.md"');
        expect(output).toContain('Referenced Root Memory Map');
        // Verify the Status Line
        expect(output).toContain('[✓] STABLE');
        expect(output).toContain('0 error(s) detected.');
        // Ensure debug noise is NOT present
        expect(output).not.toContain('[»] ── debug');
    });

    test('running sys validate with --verbose shows deep trace', () => {
        const { output, exitCode, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            'sys',
            'validate',
            '--root',
            TBC_ROOT,
            '--verbose',
        ]);
        expect(success).toBe(true);
        expect(exitCode).toBe(0);
        // Verify AX/DX Debug lines are present
        expect(output).toContain('[»] ── debug | load-core-memories | Identifying companionID');
        expect(output).toContain('[»] ── debug | load-specifications-flow | Query');
        // Verify the core audit is still there
        expect(output).toContain('┌┤ Validation Audit ├');
        expect(output).toContain('[✓] STABLE');
    });
});
