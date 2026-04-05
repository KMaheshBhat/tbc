import { describe, expect, test, beforeAll } from 'bun:test';
import { existsSync, writeFileSync, readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

import { runMonorepoCommand } from '../../../scripts/common';

import { CLI_TARGET, TBC_ROOT } from './test-helper';

describe('🐵 DEX REBUILD: tbc dex rebuild (Mojo)', () => {
    const manualMemId = '0199-test-dex-rebuild-manual';
    const manualMemPath = join(TBC_ROOT, 'mem', `${manualMemId}.md`);
    const dexShardPath = join(TBC_ROOT, 'dex', 'mem.note.jsonl');
    const sysDigestPath = join(TBC_ROOT, 'dex', 'sys.digest.txt');
    const skillsJsonlPath = join(TBC_ROOT, 'dex', 'skills.jsonl');

    beforeAll(() => {
        const content = `---
id: ${manualMemId}
record_type: note
record_title: Manual memory for dex test
record_create_date: ${new Date().toISOString()}
---
# Manual memory for dex test
This was added manually to test dex rebuild.`;
        writeFileSync(manualMemPath, content);

        if (existsSync(sysDigestPath)) {
            unlinkSync(sysDigestPath);
        }
        if (existsSync(skillsJsonlPath)) {
            unlinkSync(skillsJsonlPath);
        }
    });

    test('should rebuild dex index to include manually added memory', async () => {
        expect(existsSync(sysDigestPath)).toBe(false);
        expect(existsSync(skillsJsonlPath)).toBe(false);

        const { output, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            'dex', 'rebuild', '--root', TBC_ROOT,
        ]);
        expect(success).toBe(true);
        expect(output).toContain('System Index (Dex) Rebuilt');

        expect(existsSync(sysDigestPath)).toBe(true);
        expect(existsSync(skillsJsonlPath)).toBe(true);
        expect(existsSync(dexShardPath)).toBe(true);

        const shardContent = readFileSync(dexShardPath, 'utf-8');
        expect(shardContent).toContain(manualMemId);

        const digestContent = readFileSync(sysDigestPath, 'utf-8');
        expect(digestContent).toContain('sys');
    });
});