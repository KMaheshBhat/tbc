import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
    TBC_ROOT,
    CLI_TARGET,
    runMonorepoCommand,
} from './test-helper';

describe('🐵 LETS-GO: tbc int generate (Gemini CLI)', () => {

    test('should generate Gemini specific configuration in nested directory', () => {
        const { output, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            'int', 'gemini-cli',
            '--root', TBC_ROOT,
        ]);
        expect(success).toBe(true);
        expect(output).toContain('Agent Type: gemini-cli');

        // Targeted nested path for Gemini integration
        const geminiPath = join(TBC_ROOT, '.gemini', 'GEMINI.md');
        expect(existsSync(geminiPath)).toBe(true);

        const content = readFileSync(geminiPath, 'utf-8');

        // Verify identity hydration and core requirements
        expect(content).toContain('Mojo');
        expect(content).toContain('ALWAYS read @tbc/root.md');
    });
});
