import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
    TBC_ROOT_NEXT,
    CLI_TARGET,
    runMonorepoCommand,
} from './test-helper';

describe('🦍 LETS-GO: tbc int (Kong/Next)', () => {

    test('int probe should correctly identify protocol-specific paths', () => {
        const { output, success } = runMonorepoCommand(TBC_ROOT_NEXT, CLI_TARGET, [
            'int', 'probe',
            '--root', TBC_ROOT_NEXT,
        ]);
        expect(success).toBe(true);
        
        // Protocol Awareness Check:
        // It should identify sys_next and skills_next, not the defaults
        expect(output).toContain('sys_next');
        
        // Validation check for the Next profile
        expect(output).toMatch(/TBC Root:.*\(valid\)/);
        expect(output).toContain('STABLE');
    });

    test('int generic should synthesize AGENTS.md using Kong profile data', () => {
        const { success } = runMonorepoCommand(TBC_ROOT_NEXT, CLI_TARGET, [
            'int', 'generic',
            '--root', TBC_ROOT_NEXT,
        ]);
        expect(success).toBe(true);

        const agentsPath = join(TBC_ROOT_NEXT, 'AGENTS.md');
        expect(existsSync(agentsPath)).toBe(true);

        const content = readFileSync(agentsPath, 'utf-8');
        
        // Verify it points to protocol-aware internal links
        // In Kong, @tbc/root.md should be in sys_next
        expect(content).toContain('ALWAYS read @tbc/root.md');
        
        // Verify the Companion name from the Kong sys_next/companion.id
        // (Assuming the test setup seeds Kong with a specific name)
        expect(content).toContain('Kong'); 
    });

    test('int goose should respect protocol-aware skill locations', () => {
        const { output, success } = runMonorepoCommand(TBC_ROOT_NEXT, CLI_TARGET, [
            'int', 'goose',
            '--root', TBC_ROOT_NEXT,
        ]);

        expect(success).toBe(true);
        const goosePath = join(TBC_ROOT_NEXT, '.goosehints');
        expect(existsSync(goosePath)).toBe(true);

        // Verification: Ensure the generation didn't accidentally create 
        // a legacy 'skills' folder in a 'Next' root.
        const legacySkills = join(TBC_ROOT_NEXT, 'skills');
        expect(existsSync(legacySkills)).toBe(false);
    });

    test('int github-copilot should function in a hybrid SQLite environment', () => {
        const { success } = runMonorepoCommand(TBC_ROOT_NEXT, CLI_TARGET, [
            'int', 'github-copilot',
            '--root', TBC_ROOT_NEXT,
        ]);

        expect(success).toBe(true);
        const copilotPath = join(TBC_ROOT_NEXT, '.github', 'agents', 'kong.agent.md');
        expect(existsSync(copilotPath)).toBe(true);

        const content = readFileSync(copilotPath, 'utf-8');
        // Ensure identity was pulled from the correct profile's ID records
        expect(content).toContain('interaction');
        expect(content).toContain('Kong');
    });

});