import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
    TBC_ROOT,
    CLI_TARGET,
    runMonorepoCommand,
} from './test-helper';

describe('🐵 LETS-GO: tbc int generate (Goose)', () => {

    test('should generate .goosehints with correct role definition', () => {
        const { output, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            'int', 'goose',
            '--root', TBC_ROOT,
        ]);

        expect(success).toBe(true);
        expect(output).toContain('Agent Type: goose');
        expect(output).toContain('STABLE');

        // Targeted path for Goose integration
        const goosePath = join(TBC_ROOT, '.goosehints');
        expect(existsSync(goosePath)).toBe(true);

        const content = readFileSync(goosePath, 'utf-8');

        // Verify identity hydration and core requirements
        // Using "interaction" (the correct spelling found in your output)
        expect(content).toContain('Mojo');
        expect(content).toContain('ALWAYS read @tbc/root.md');
        expect(content).toContain('interaction');
    });

    test('should be idempotent (running twice changes nothing)', () => {
        const goosePath = join(TBC_ROOT, '.goosehints');

        // Ensure first state exists
        runMonorepoCommand(TBC_ROOT, CLI_TARGET, ['int', 'goose', '--root', TBC_ROOT]);
        const firstRunContent = readFileSync(goosePath, 'utf-8');

        // Run again
        const { success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            'int', 'goose',
            '--root', TBC_ROOT,
        ]);

        expect(success).toBe(true);
        const secondRunContent = readFileSync(goosePath, 'utf-8');

        // Content should be identical
        expect(secondRunContent).toBe(firstRunContent);
    });
});
