import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
    TBC_ROOT,
    CLI_TARGET,
    runTbcCommand,
} from './test-helper';

describe('🐵 0501 tbc int generate (Generic)', () => {

    test('00 should generate AGENTS.md with correct role definition', () => {
        const { output, success } = runTbcCommand(TBC_ROOT, [
            'int',
            'generic',
            '--root',
            TBC_ROOT,
        ]);
        expect(success).toBe(true);
        const agentsPath = join(TBC_ROOT, 'AGENTS.md');
        expect(existsSync(agentsPath)).toBe(true);
        const content = readFileSync(agentsPath, 'utf-8');
        expect(content).toContain('Mojo');
        expect(content).toContain('ALWAYS read @sys/root.md');
        expect(content).toContain('@dex/sys.digest.txt');
        expect(content).toContain('ALWAYS READ FULLY');
        expect(content).toContain('sys.digest.txt');
        expect(content).toContain('skills.jsonl');
        expect(content).toContain('tbc dex rebuild');
    });

    test('01 should be idempotent (running twice changes nothing)', () => {
        runTbcCommand(TBC_ROOT, [
            'int',
            'generic',
        ]);
        const firstRun = readFileSync(join(TBC_ROOT, 'AGENTS.md'), 'utf-8');
        runTbcCommand(TBC_ROOT, [
            'int',
            'generic',
        ]);
        const secondRun = readFileSync(join(TBC_ROOT, 'AGENTS.md'), 'utf-8');
        expect(firstRun).toBe(secondRun);
    });
});
