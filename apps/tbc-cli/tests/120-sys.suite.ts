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

        // 1. Verify FS Authority (The Kong/Next way)
        // We use 'sys_shiggles' because that is the collection name for the 'next' profile
        const companionIdPath = join(TBC_ROOT_NEXT, 'sys_shiggles', 'companion.id');
        const companionId = (await file(companionIdPath).text()).trim();
        
        expectUUID(companionId);

        // 2. Verify SQLite Projection (The Kong way)
        expectSQLiteRecord(companionId);

        // 3. Verify JSON 'data' bag parity
        // Note: Check your synthesizer title; earlier it was just "Kong", 
        // if your record_title includes the prefix, keep it as is.
        expectSQLiteData(companionId, 'record_title', 'Kong'); 
        expectSQLiteData(companionId, 'record_type', 'party'); // Synthesizer sets this to 'party'
    });

});