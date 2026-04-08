import { describe, expect, test, beforeAll } from 'bun:test';
import { existsSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { runMonorepoCommand } from '../../../scripts/common';

import { CLI_TARGET, TBC_ROOT } from './test-helper';

describe('🐵 MEMORY ASSIMILATE: tbc mem assimilate (Mojo)', () => {
    const manualMemId = '019d6261-c37d-77e5-8460-c6c5a896bc66';
    const manualMemPath = join(TBC_ROOT, 'mem', `${manualMemId}.md`);

    beforeAll(() => {
        const content = `---
id: ${manualMemId}
record_type: note
record_title: Manual memory for assimilate test
record_create_date: ${new Date().toISOString()}
record_tags: [assimilate, test]
---
# Manual memory for assimilate test
This was added manually to test mem assimilate.`;
        writeFileSync(manualMemPath, content);
    });

    test('should assimilate memory from FS to all providers', async () => {
        const { output, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            'mem',
            'assimilate',
            '--root',
            TBC_ROOT,
            '--verbose',
        ]);
        expect(success).toBe(true);
        expect(output).toContain('Found');
        expect(output).toContain('record(s) to assimilate.');
        expect(output).toContain('Broadcast');
        const memContent = readFileSync(manualMemPath, 'utf-8');
        expect(memContent).toContain(manualMemId);
    });
});