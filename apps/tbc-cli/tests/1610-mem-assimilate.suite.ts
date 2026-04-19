import { describe, expect, test, beforeAll } from 'bun:test';
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { runMonorepoCommand } from '../../../scripts/common';

import { CLI_TARGET, TBC_ROOT_NEXT, querySqliteNext } from './test-helper';

describe('🦍 1610 tbc mem assimilate', () => {
    const manualMemId = '019d6261-c37d-77e5-8460-c6c5a896bc67';
    const manualMemPath = join(TBC_ROOT_NEXT, 'mem_next', `${manualMemId}.md`);

    beforeAll(() => {
        const content = `---
id: ${manualMemId}
record_type: note
record_title: Manual memory for assimilate test (Kong)
record_create_date: ${new Date().toISOString()}
record_tags: [assimilate, test, kong]
---
# Manual memory for assimilate test (Kong)
This was added manually to test mem assimilate on Kong.`;
        writeFileSync(manualMemPath, content);
    });

    test('00 should assimilate memory from FS to FS+SQLite', async () => {
        const { output, success } = runMonorepoCommand(TBC_ROOT_NEXT, CLI_TARGET, [
            'mem',
            'assimilate',
            '--root',
            TBC_ROOT_NEXT,
            '--verbose',
        ]);
        expect(success).toBe(true);
        expect(output).toContain('Found');
        expect(output).toContain('record(s) to assimilate.');
        expect(output).toContain('Broadcast');
        expect(existsSync(manualMemPath)).toBe(true);
        const results = querySqliteNext('SELECT record_id FROM record WHERE record_id = ?', [`${manualMemId}.md`]);
        expect(results.length).toBeGreaterThan(0);
    });
});