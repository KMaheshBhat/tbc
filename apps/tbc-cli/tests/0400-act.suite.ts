import { describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import {
    TBC_ROOT,
    CLI_TARGET,
    runMonorepoCommand,
    querySqlite,
    expectSQLiteDataMojo,
} from './test-helper';

describe('🐵 0400 LETS-GO: tbc act', () => {
    let activity1ID: string = '';
    let activity2ID: string = '';

    test('should start a new activity in \'current\' directory', () => {
        const { output, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            'act',
            'start',
            '--root',
            TBC_ROOT,
        ]);
        expect(success).toBe(true);
        expect(output).toContain('Activity started');
        const lines = output.split('\n');
        const successLine = lines.find(l => l.includes('Activity started'));
        const match = successLine?.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
        activity1ID = match ? match[0] : '';
        expect(activity1ID).not.toBe('');
        const currentPath = path.join(TBC_ROOT, 'act', 'current', activity1ID);
        expect(existsSync(currentPath)).toBe(true);
        const contextFile = path.join(currentPath, `${activity1ID}.md`);
        expect(existsSync(contextFile)).toBe(true);
    });

    test('should start a new activity using an externally minted UUID', () => {
        const genResult = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            'gen',
            'uuid',
            '--root',
            TBC_ROOT,
        ]);
        expect(genResult.success).toBe(true);
        const uuidMatch = genResult.output.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
        const externalUuid = uuidMatch ? uuidMatch[0] : '';
        expect(externalUuid).not.toBe('');
        activity2ID = externalUuid;
        const { output, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            'act',
            'start',
            externalUuid,
            '--root',
            TBC_ROOT,
        ]);
        expect(success).toBe(true);
        expect(output).toContain('Activity started');
        expect(output).toContain(externalUuid);
        const contextFile = path.join(TBC_ROOT, 'act', 'current', externalUuid, `${externalUuid}.md`);
        expect(existsSync(contextFile)).toBe(true);
        const content = readFileSync(contextFile, 'utf-8');
        expect(content).toContain('Activity Log');
        expect(content).toContain(externalUuid);
    });

    test('should show active activities in the \'show\' command', () => {
        const { output, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            'act',
            'show',
            '--root',
            TBC_ROOT,
        ]);
        expect(success).toBe(true);
        expect(output).toContain('Active [current]');
        expect(output).toContain(activity1ID);
        expect(output).toContain(activity2ID);
        expect(output).toMatch(/Activity Log \d{4}-\d{2}-\d{2}/);
        expect(output).toContain('Suggestion: Found at act/current');
    });

    test('should show active activities without clutter from artifacts', () => {
        const activity1Dir = path.join(TBC_ROOT, 'act', 'current', activity1ID);
        fs.writeFileSync(path.join(activity1Dir, 'research-notes.md'), '# Research\nSome notes.');
        fs.writeFileSync(path.join(activity1Dir, 'data-dump.json'), '{"key": "value"}');
        const { output, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            'act',
            'show',
            '--root',
            TBC_ROOT,
        ]);
        expect(success).toBe(true);
        const activity1Matches = (output.match(new RegExp(activity1ID, 'g')) || []).length;
        expect(activity1Matches).toBe(2);
        expect(output).not.toContain('research-notes');
        expect(output).not.toContain('data-dump');
    });

    test('should pause an activity (move from current to backlog)', () => {
        const { output, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            'act',
            'pause',
            activity1ID,
            '--root',
            TBC_ROOT,
        ]);
        expect(success).toBe(true);
        expect(existsSync(path.join(TBC_ROOT, 'act', 'current', activity1ID))).toBe(false);
        expect(existsSync(path.join(TBC_ROOT, 'act', 'backlog', activity1ID))).toBe(true);
        expect(output).toContain(`Paused activity: ${activity1ID}`);
        expect(output).toContain(`Use "tbc act start ${activity1ID}" to resume`);
    });

    test('should report error when trying to pause a non-existent activity', () => {
        const fakeUUID = '019c3b94-fake-uuid-not-real-4f9c9c52f482';
        const { output } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            'act',
            'pause',
            fakeUUID,
            '--root',
            TBC_ROOT,
        ]);
        expect(output).toContain(`Activity ${fakeUUID} not found in current workspace.`);
        expect(output).toContain('Check "tbc act show"');
        expect(existsSync(path.join(TBC_ROOT, 'act', 'backlog', fakeUUID))).toBe(false);
    });

    test('should resume an activity (move from backlog to current)', () => {
        const { success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            'act',
            'start',
            activity1ID,
            '--root',
            TBC_ROOT,
        ]);
        expect(success).toBe(true);
        expect(existsSync(path.join(TBC_ROOT, 'act', 'current', activity1ID))).toBe(true);
        expect(existsSync(path.join(TBC_ROOT, 'act', 'backlog', activity1ID))).toBe(false);
    });

    test('should report error when trying to close a non-existent activity', () => {
        const ghostUUID = '019c3baf-dead-beef-8f39-c4d0e390c158';
        const { output, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            'act',
            'close',
            ghostUUID,
            '--root',
            TBC_ROOT,
        ]);
        expect(success).toBe(true);
        expect(output).toContain(`Activity ${ghostUUID} not found in current workspace.`);
        expect(output).toContain('Verify the ID with "tbc act show"');
        expect(existsSync(path.join(TBC_ROOT, 'act', 'archive', ghostUUID))).toBe(false);
        expect(existsSync(path.join(TBC_ROOT, 'mem', `${ghostUUID}.md`))).toBe(false);
    });

    test('should close and assimilate activity (move to archive and promote to mem/)', () => {
        const { output, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            'act',
            'close',
            activity1ID,
            '--root',
            TBC_ROOT,
        ]);
        expect(success).toBe(true);
        const currentPath = path.join(TBC_ROOT, 'act', 'current', activity1ID);
        const archivePath = path.join(TBC_ROOT, 'act', 'archive', activity1ID);
        const memRecordPath = path.join(TBC_ROOT, 'mem', `${activity1ID}.md`);
        expect(existsSync(currentPath)).toBe(false);
        expect(existsSync(archivePath)).toBe(true);
        expect(existsSync(memRecordPath)).toBe(true);
        expect(existsSync(path.join(archivePath, `${activity1ID}.md`))).toBe(true);
        expect(existsSync(path.join(archivePath, 'research-notes.md'))).toBe(true);
        expect(existsSync(path.join(TBC_ROOT, 'mem', 'research-notes.md'))).toBe(false);
        const memContent = readFileSync(memRecordPath, 'utf-8');
        expect(memContent).toContain('record_type: log');
        expect(memContent).toContain(`id: ${activity1ID}`);
        expect(memContent).not.toContain(`id: ${activity1ID}.md`);
        const logDexPath = path.join(TBC_ROOT, 'dex', 'log.memory.jsonl');
        if (existsSync(logDexPath)) {
            const dexContent = readFileSync(logDexPath, 'utf-8');
            expect(dexContent).toContain(activity1ID);
        }
    });

    test('should close and promote activity to SQLite (dual-write assimilation)', () => {
        const { output, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            'act',
            'start',
            '--root',
            TBC_ROOT,
        ]);
        const lines = output.split('\n');
        const successLine = lines.find(l => l.includes('Activity started'));
        const activityId = successLine?.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0];
        expect(activityId).toBeDefined();
        const closeResult = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            'act',
            'close',
            activityId!,
            '--root',
            TBC_ROOT,
        ]);
        expect(closeResult.success).toBe(true);
        const memPath = path.join(TBC_ROOT, 'mem', `${activityId}.md`);
        expect(existsSync(memPath)).toBe(true);
        expectSQLiteDataMojo(activityId!, 'collection', 'mem');
        expectSQLiteDataMojo(activityId!, 'record_type', 'log');
    });
});
