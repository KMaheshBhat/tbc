import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
    TBC_ROOT,
    CLI_TARGET,
    runMonorepoCommand,
} from './test-helper';

describe('🐵 0505 tbc int generate (Kilocode)', () => {

    test('00 should generate .kilocodemodes with correct schema and identity', () => {
        const { output, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            'int',
            'kilocode',
            '--root',
            TBC_ROOT,
        ]);
        expect(success).toBe(true);
        expect(output).toContain('Agent Type: kilocode');
        const kiloPath = join(TBC_ROOT, '.kilocodemodes');
        expect(existsSync(kiloPath)).toBe(true);
        const content = readFileSync(kiloPath, 'utf-8');
        expect(content).toContain('customModes:');
        expect(content).toContain('slug: mojo');
        expect(content).toContain('groups:');
        expect(content).toContain('- read');
        expect(content).toContain('- mcp');
        expect(content).toContain('source: project');
        expect(content).toContain('name: Mojo');
        expect(content).toContain('ALWAYS read @sys/root.md');
        expect(content).toContain('ALWAYS READ FULLY');
        expect(content).toContain('sys.digest.txt');
        expect(content).toContain('skills.jsonl');
        expect(content).toContain('tbc dex rebuild');
        expect(content).toContain('interaction');
        expect(content).toMatch(/slug: mojo\s+name: Mojo/);
    });

    test('01 should be idempotent (running twice changes nothing)', () => {
        const kiloPath = join(TBC_ROOT, '.kilocodemodes');
        runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            'int',
            'kilocode',
            '--root',
            TBC_ROOT,
        ]);
        const firstRunContent = readFileSync(kiloPath, 'utf-8');
        const { success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            'int',
            'kilocode',
            '--root',
            TBC_ROOT,
        ]);
        expect(success).toBe(true);
        const secondRunContent = readFileSync(kiloPath, 'utf-8');
        expect(secondRunContent).toBe(firstRunContent);
    });
});
