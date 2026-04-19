import { describe, expect, test } from 'bun:test';
import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
    TBC_ROOT,
    CLI_TARGET,
    runMonorepoCommand,
} from './test-helper';

describe('🐵 0504 tbc int generate (GitHub Copilot)', () => {

    test('00 should generate Copilot specific configuration in nested directory with slugified name', () => {
        const { output, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            'int',
            'github-copilot',
            '--root',
            TBC_ROOT,
        ]);
        expect(success).toBe(true);
        expect(output).toContain('Agent Type: github-copilot');
        expect(output).toContain('STABLE');
        const agentsDir = join(TBC_ROOT, '.github', 'agents');
        expect(existsSync(agentsDir)).toBe(true);
        expect(lstatSync(agentsDir).isDirectory()).toBe(true);
        const copilotPath = join(agentsDir, 'mojo.agent.md');
        expect(existsSync(copilotPath)).toBe(true);
        const content = readFileSync(copilotPath, 'utf-8');
        expect(content.startsWith('---')).toBe(true);
        expect(content).toContain('description: This custom agent personifies Mojo');
        expect(content).toContain('tools:');
        expect(content).toContain('- execute');
        expect(content).toContain('For the interaction, you will act as Mojo.');
        expect(content).toContain('ALWAYS read @sys/root.md');
        expect(content).toContain('ALWAYS READ FULLY');
        expect(content).toContain('sys.digest.txt');
        expect(content).toContain('skills.jsonl');
        expect(content).toContain('tbc dex rebuild');
    });

    test('01 should be idempotent (running twice changes nothing)', () => {
        const copilotPath = join(TBC_ROOT, '.github', 'agents', 'mojo.agent.md');
        runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            'int',
            'github-copilot',
            '--root',
            TBC_ROOT,
        ]);
        const firstRunContent = readFileSync(copilotPath, 'utf-8');
        const { success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            'int',
            'github-copilot',
            '--root',
            TBC_ROOT,
        ]);
        expect(success).toBe(true);
        const secondRunContent = readFileSync(copilotPath, 'utf-8');
        expect(secondRunContent).toBe(firstRunContent);
    });
});
