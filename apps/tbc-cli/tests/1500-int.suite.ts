import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
    TBC_ROOT_NEXT,
    CLI_TARGET,
    runMonorepoCommand,
} from './test-helper';

describe('🦍 1500 LETS-GO: tbc int (Kong/Next)', () => {

    test('int probe should correctly identify protocol-specific paths', () => {
        const { output, success } = runMonorepoCommand(TBC_ROOT_NEXT, CLI_TARGET, [
            'int',
            'probe',
            '--root',
            TBC_ROOT_NEXT,
        ]);
        expect(success).toBe(true);
        expect(output).toContain('sys_next');
        expect(output).toMatch(/TBC Root:.*\(valid\)/);
        expect(output).toContain('STABLE');
    });

    test('int generic should synthesize AGENTS.md using Kong profile data', () => {
        const { success } = runMonorepoCommand(TBC_ROOT_NEXT, CLI_TARGET, [
            'int',
            'generic',
            '--root',
            TBC_ROOT_NEXT,
        ]);
        expect(success).toBe(true);
        const agentsPath = join(TBC_ROOT_NEXT, 'AGENTS.md');
        expect(existsSync(agentsPath)).toBe(true);
        const content = readFileSync(agentsPath, 'utf-8');
        expect(content).toContain('ALWAYS read @sys/root.md');
        expect(content).toContain('ALWAYS READ FULLY');
        expect(content).toContain('sys.digest.txt');
        expect(content).toContain('skills.jsonl');
        expect(content).toContain('tbc dex rebuild');
        expect(content).toContain('Kong');
    });

    test('int goose should respect protocol-aware skill locations', () => {
        const { output, success } = runMonorepoCommand(TBC_ROOT_NEXT, CLI_TARGET, [
            'int',
            'goose',
            '--root',
            TBC_ROOT_NEXT,
        ]);
        expect(success).toBe(true);
        const goosePath = join(TBC_ROOT_NEXT, '.goosehints');
        expect(existsSync(goosePath)).toBe(true);
        const legacySkills = join(TBC_ROOT_NEXT, 'skills');
        expect(existsSync(legacySkills)).toBe(false);
    });

    test('int github-copilot should function in a hybrid SQLite environment', () => {
        const { success } = runMonorepoCommand(TBC_ROOT_NEXT, CLI_TARGET, [
            'int',
            'github-copilot',
            '--root',
            TBC_ROOT_NEXT,
        ]);
        expect(success).toBe(true);
        const copilotPath = join(TBC_ROOT_NEXT, '.github', 'agents', 'kong.agent.md');
        expect(existsSync(copilotPath)).toBe(true);
        const content = readFileSync(copilotPath, 'utf-8');
        expect(content).toContain('interaction');
        expect(content).toContain('Kong');
    });

    test('int pi should generate .pi/SYSTEM.md with role definition', () => {
        const { success } = runMonorepoCommand(TBC_ROOT_NEXT, CLI_TARGET, [
            'int',
            'pi',
            '--root',
            TBC_ROOT_NEXT,
        ]);
        expect(success).toBe(true);
        const piPath = join(TBC_ROOT_NEXT, '.pi', 'SYSTEM.md');
        expect(existsSync(piPath)).toBe(true);
        const content = readFileSync(piPath, 'utf-8');
        expect(content).toContain('You are an Expert Assistant');
        expect(content).toContain('Kong');
        expect(content).toContain('Available Tools');
    });

});