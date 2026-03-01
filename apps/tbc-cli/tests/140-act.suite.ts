import { describe, expect, test } from 'bun:test';
import { existsSync } from 'node:fs';
import path from 'node:path';

import {
    TBC_ROOT_NEXT,
    CLI_TARGET,
    runMonorepoCommand,
    querySqliteNext,
    expectSQLiteData
} from './test-helper';

describe('🦍 LETS-GO: tbc act (Kong/Next)', () => {
    let activityID: string = '';

    test('should manage activity lifecycle on FS (Mojo-parity)', () => {
        // 1. Start
        const start = runMonorepoCommand(TBC_ROOT_NEXT, CLI_TARGET, ['act', 'start', '--root', TBC_ROOT_NEXT]);
        activityID = start.output.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0] || '';
        
        expect(existsSync(path.join(TBC_ROOT_NEXT, 'act', 'current', activityID))).toBe(true);

        // 2. Pause
        runMonorepoCommand(TBC_ROOT_NEXT, CLI_TARGET, ['act', 'pause', activityID, '--root', TBC_ROOT_NEXT]);
        expect(existsSync(path.join(TBC_ROOT_NEXT, 'act', 'backlog', activityID))).toBe(true);

        // 3. SQLite Boundary Check: Activity should NOT be in DB yet
        const rows = querySqliteNext('SELECT count(*) as count FROM record WHERE record_id = ?', [activityID]) as any[];
        expect(rows[0].count).toBe(0);
    });

    test('should promote to SQLite only upon close (Assimilation)', () => {
        // Resume first to move to current
        runMonorepoCommand(TBC_ROOT_NEXT, CLI_TARGET, ['act', 'start', activityID, '--root', TBC_ROOT_NEXT]);

        const { success } = runMonorepoCommand(TBC_ROOT_NEXT, CLI_TARGET, [
            'act', 'close', activityID, '--root', TBC_ROOT_NEXT,
        ]);

        expect(success).toBe(true);

        // 1. FS Verification: It's now a memory in mem_next
        const memPath = path.join(TBC_ROOT_NEXT, 'mem_next', `${activityID}.md`);
        expect(existsSync(memPath)).toBe(true);

        // 2. SQLite Verification: The "Promotion" happened
        // The record should now be indexed because it entered the mem_next collection
        expectSQLiteData(activityID, 'collection', 'mem_next');
        expectSQLiteData(activityID, 'record_type', 'log');
    });
});
