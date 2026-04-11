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

describe('🦍 140 LETS-GO: tbc act (Kong/Next)', () => {
    let activityID: string = '';

    test('should manage activity lifecycle on FS (Mojo-parity)', () => {
        const start = runMonorepoCommand(TBC_ROOT_NEXT, CLI_TARGET, [
            'act',
            'start',
            '--root',
            TBC_ROOT_NEXT,
        ]);
        const lines = start.output.split('\n');
        const successLine = lines.find(l => l.includes('Activity started'));
        activityID = successLine?.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0] || '';
        expect(activityID).not.toBe('');
        const currentPath = path.join(TBC_ROOT_NEXT, 'act_next', 'current', activityID);
        expect(existsSync(currentPath)).toBe(true);
        runMonorepoCommand(TBC_ROOT_NEXT, CLI_TARGET, [
            'act',
            'pause',
            activityID,
            '--root',
            TBC_ROOT_NEXT,
        ]);
        const backlogPath = path.join(TBC_ROOT_NEXT, 'act_next', 'backlog', activityID);
        expect(existsSync(backlogPath)).toBe(true);
        const rows = querySqliteNext('SELECT count(*) as count FROM record WHERE record_id = ?', [activityID]) as any[];
        expect(rows[0].count).toBe(0);
    });

    test('should promote to SQLite only upon close (Assimilation)', () => {
        runMonorepoCommand(TBC_ROOT_NEXT, CLI_TARGET, [
            'act',
            'start',
            activityID,
            '--root',
            TBC_ROOT_NEXT,
        ]);
        const { success, output } = runMonorepoCommand(TBC_ROOT_NEXT, CLI_TARGET, [
            'act',
            'close',
            activityID,
            '--root',
            TBC_ROOT_NEXT,
        ]);
        expect(success).toBe(true);
        const memPath = path.join(TBC_ROOT_NEXT, 'mem_next', `${activityID}.md`);
        expect(existsSync(memPath)).toBe(true);
        expectSQLiteData(activityID, 'collection', 'mem_next');
        expectSQLiteData(activityID, 'record_type', 'log');
    });
});
