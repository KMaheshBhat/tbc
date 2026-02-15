import { file } from 'bun';
import { describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import {
    CLI_TARGET,
    TBC_ROOT_NEXT,
    expectUUID,
    expectSQLiteRecord,
    expectSQLiteData,
    runMonorepoCommand,
    querySqliteNext
} from './test-helper';

describe('🦍 LETS-GO: tbc sys (Kong/Next)', () => {

    test('sys init --profile next should sync identity to SQLite', async () => {
        const { output, success } = runMonorepoCommand(TBC_ROOT_NEXT, CLI_TARGET, [
            'sys', 'init',
            '--root', TBC_ROOT_NEXT,
            '--companion', 'Kong',
            '--prime', 'Zilla',
            '--profile', 'next'
        ]);
        console.log(output);

        expect(success).toBe(true);

        // 1. Verify FS Authority (The Mojo way)
        const companionId = (await file(join(TBC_ROOT_NEXT, 'sys', 'companion.id')).text()).trim();
        expectUUID(companionId);

        // 2. Verify SQLite Projection (The Kong way)
        // This confirms the 'Entity Service' successfully intercepted the init flow
        expectSQLiteRecord(companionId);

        // 3. Verify JSON 'data' bag parity
        // This is where your professional Entity Store pattern comes in
        expectSQLiteData(companionId, 'record_title', 'Companion: Kong');
        expectSQLiteData(companionId, 'record_type', 'identity');
    });

});