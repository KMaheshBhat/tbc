import { describe, expect, test } from 'bun:test';
import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
    TBC_ROOT,
    CLI_TARGET,
    runMonorepoCommand,
} from './test-helper';

describe('🐵 0506 tbc int generate (Pi)', () => {

    test('00 should generate Pi specific configuration (.pi/SYSTEM.md)', () => {
        const { output, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            'int',
            'pi',
            '--root',
            TBC_ROOT,
        ]);
        expect(success).toBe(true);
        expect(output).toContain('Agent Type: pi');
        expect(output).toContain('STABLE');
        const piDir = join(TBC_ROOT, '.pi');
        expect(existsSync(piDir)).toBe(true);
        expect(lstatSync(piDir).isDirectory()).toBe(true);
        const systemPath = join(piDir, 'SYSTEM.md');
        expect(existsSync(systemPath)).toBe(true);
        const content = readFileSync(systemPath, 'utf-8');
        expect(content).toContain('You are an Expert Assistant');
        expect(content).toContain('For the interaction, you will act as Mojo.');
        expect(content).toContain('ALWAYS read @sys/root.md');
        expect(content).toContain('ALWAYS READ FULLY');
        expect(content).toContain('sys.digest.txt');
        expect(content).toContain('skills.jsonl');
        expect(content).toContain('tbc dex rebuild');
        expect(content).toContain('Available Tools');
        expect(content).toContain('read');
        expect(content).toContain('bash');
        expect(content).toContain('edit');
        expect(content).toContain('write');
    });

    test('01 should be idempotent (running twice changes nothing)', () => {
        const systemPath = join(TBC_ROOT, '.pi', 'SYSTEM.md');
        runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            'int',
            'pi',
            '--root',
            TBC_ROOT,
        ]);
        const firstRunContent = readFileSync(systemPath, 'utf-8');
        const { success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            'int',
            'pi',
            '--root',
            TBC_ROOT,
        ]);
        expect(success).toBe(true);
        const secondRunContent = readFileSync(systemPath, 'utf-8');
        expect(secondRunContent).toBe(firstRunContent);
    });
});