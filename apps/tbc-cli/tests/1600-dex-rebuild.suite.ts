import { describe, expect, test, beforeAll } from 'bun:test';
import { existsSync, writeFileSync, readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

import { runMonorepoCommand } from '../../../scripts/common';

import { CLI_TARGET, TBC_ROOT_NEXT } from './test-helper';

describe('🦍 1600 DEX REBUILD: tbc dex rebuild (Kong)', () => {
    const manualMemId = '019d6261-c37d-77e5-8460-c6c5a896bc65';
    const manualMemPath = join(TBC_ROOT_NEXT, 'mem_next', `${manualMemId}.md`);
    const dexShardPath = join(TBC_ROOT_NEXT, 'dex_next', 'mem_next.note.jsonl');
    const sysDigestPath = join(TBC_ROOT_NEXT, 'dex_next', 'sys.digest.txt');
    const skillsJsonlPath = join(TBC_ROOT_NEXT, 'dex_next', 'skills.jsonl');

    beforeAll(() => {
        const content = `---
id: ${manualMemId}
record_type: note
record_title: Manual memory for dex test (Kong)
record_create_date: ${new Date().toISOString()}
---
# Manual memory for dex test (Kong)
This was added manually to test dex rebuild on Kong.`;
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
        const { output, success } = runMonorepoCommand(TBC_ROOT_NEXT, CLI_TARGET, [
            'dex',
            'rebuild',
            '--root',
            TBC_ROOT_NEXT,
            '--verbose',
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