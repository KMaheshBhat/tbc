import { file } from 'bun';
import { describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { readdirSync } from 'node:fs';

import { generateFileTree } from '../../../scripts/common';
import { runTbcCommand } from './test-helper';
import packageJson from '../package.json' with { type: 'json' };

import { CLI_TARGET, TBC_ROOT, expectUUID, querySqlite, expectSQLiteDataMojo, expectSQLiteRecordMojo } from './test-helper';

describe('🐵 0200 tbc sys', () => {

    test('00 running sys init with companion and prime flags is successful', async () => {
        const { output, exitCode, success } = runTbcCommand(TBC_ROOT, [
            'sys',
            'init',
            '--root',
            TBC_ROOT,
            '--companion',
            'Mojo',
            '--prime',
            'Jojo',
        ]);
        expect(success).toBe(true);
        expect(exitCode).toBe(0);
        const companionIdPath = join(TBC_ROOT, 'sys', 'companion.id');
        const companionId = (await file(companionIdPath).text()).trim();
        expectUUID(companionId);
        const primeIdPath = join(TBC_ROOT, 'sys', 'prime.id');
        const primeId = (await file(primeIdPath).text()).trim();
        expectUUID(primeId);
        expect(output).toMatch(/┌┤ Minted IDs ├[─]+/);
        expect(output).toMatch(/├┤ Keyed ├[─]+/);
        expect(output).toMatch(/\[i\]\s+──\s+info\s+\|\s+[^|]+\|\s+companionID:\s+/);
        expect(output).toMatch(/\[i\]\s+──\s+info\s+\|\s+[^|]+\|\s+primeID:\s+/);
        expect(output).toMatch(/\[i\]\s+──\s+info\s+\|\s+[^|]+\|\s+memoryMapID:\s+/);
        expect(output).toMatch(/\[✓\]\s+STABLE\s+\|\s+0 error\(s\) detected\./);
        expect(output).toMatch(/\[i\]\s+──\s+info\s+\|\s+[^|]+\|\s+Companion:\s+Mojo/);
        expect(output).toMatch(/\[i\]\s+──\s+info\s+\|\s+[^|]+\|\s+Prime:\s+Jojo/);
        expect(output).toMatch(/\[i\]\s+──\s+info\s+\|\s+[^|]+\|\s+Map of Memories/);
        expect(output).toMatch(/\[✓\]\s+Third Brain Companion\s+0\.6\.0\s+initialized\./);

        // Validate frontmatter in skill record (single block, no duplicates)
        const skillPath = join(TBC_ROOT, 'skills', 'core', 'tbc-act-ops', 'SKILL.md');
        const content = await file(skillPath).text();
        // Should have exactly two --- delimiter lines
        const delimiterMatches = content.match(/^---$/gm);
        expect(delimiterMatches?.length).toBe(2);
        // Extract the frontmatter text (between first two delimiters)
        const firstDelimiterEnd = content.indexOf('---') + 3;
        const secondDelimiterStart = content.indexOf('---', firstDelimiterEnd);
        const frontmatterText = content.substring(firstDelimiterEnd, secondDelimiterStart).trim();
        // Verify expected metadata fields (plain text)
        expect(frontmatterText).toContain('id: tbc-act-ops');
        expect(frontmatterText).toContain('record_type: specification');
        expect(frontmatterText).toContain('record_tags:');
        expect(frontmatterText).toContain('- c/public/tbc');
        expect(frontmatterText).toContain('specification_name: tbc-act-ops');
        expect(frontmatterText).toContain('description:');
        expect(frontmatterText).toContain('record_create_date:');
        // Ensure body does NOT start with additional frontmatter
        const body = content.substring(secondDelimiterStart + 3).trim();
        expect(body.startsWith('---')).toBe(false);
    });

    test('01 running sys init on existing TBC-Root should fail with helpful message', async () => {
        const { output, exitCode, success } = runTbcCommand(TBC_ROOT, [
            'sys',
            'init',
            '--root',
            TBC_ROOT,
            '--companion',
            'Mojo',
            '--prime',
            'Jojo',
        ]);
        expect(exitCode).toBe(0);
        expect(output).toMatch(/\[✓\]\s+STABLE\s+\|\s+0 error\(s\) detected\./);
        expect(output).toMatch(/\[✗\]\s+┬─\s+error\s+\|\s+[^|]+\|\s+has existing companion/);
        expect(output).toMatch(/└─\s+Suggestion:\s+Use "tbc sys upgrade" instead\./);
    });

    test('02 running sys upgrade on TBC-Root is successful', async () => {
        const { output, exitCode, success } = runTbcCommand(TBC_ROOT, [
            'sys',
            'upgrade',
            '--root',
            TBC_ROOT,
        ]);
        expect(success).toBe(true);
        expect(exitCode).toBe(0);
        expect(output).toMatch(new RegExp(`\\[✓\\]\\s+Third Brain Companion upgraded to\\s+${packageJson.version}\\.`));
        expect(output).toMatch(/┌┤ Validation Audit ├[─]+/);
        expect(output).toMatch(/\[✓\]\s+STABLE/);

        // Validate frontmatter in skill record after upgrade (single block, no duplicates)
        const skillPath = join(TBC_ROOT, 'skills', 'core', 'tbc-act-ops', 'SKILL.md');
        const content = await file(skillPath).text();
        const delimiterMatches = content.match(/^---$/gm);
        expect(delimiterMatches?.length).toBe(2);
        const firstDelimiterEnd = content.indexOf('---') + 3;
        const secondDelimiterStart = content.indexOf('---', firstDelimiterEnd);
        const frontmatterText = content.substring(firstDelimiterEnd, secondDelimiterStart).trim();
        expect(frontmatterText).toContain('id: tbc-act-ops');
        expect(frontmatterText).toContain('record_type: specification');
        expect(frontmatterText).toContain('record_tags:');
        expect(frontmatterText).toContain('- c/public/tbc');
        expect(frontmatterText).toContain('specification_name: tbc-act-ops');
        expect(frontmatterText).toContain('description:');
        expect(frontmatterText).toContain('record_create_date:');
        const body = content.substring(secondDelimiterStart + 3).trim();
        expect(body.startsWith('---')).toBe(false);
    });

    test('03 running sys validate on a healthy root', () => {
        const { output, exitCode, success } = runTbcCommand(TBC_ROOT, [
            'sys',
            'validate',
            '--root',
            TBC_ROOT,
        ]);
        expect(success).toBe(true);
        expect(exitCode).toBe(0);
        expect(output).toMatch(/┌┤ Validation Audit ├[─]+/);
        expect(output).toMatch(/Verified presence of "root\.md"/);
        expect(output).toMatch(/Referenced Root Memory Map/);
        expect(output).toMatch(/\[✓\]\s+STABLE/);
        expect(output).toMatch(/0 error\(s\) detected\./);
        expect(output).not.toMatch(/\[»\]\s+──\s+debug/);
    });

    test('04 running sys validate with --verbose shows deep trace', () => {
        const { output, exitCode, success } = runTbcCommand(TBC_ROOT, [
            'sys',
            'validate',
            '--root',
            TBC_ROOT,
            '--verbose',
        ]);
        expect(success).toBe(true);
        expect(exitCode).toBe(0);
        expect(output).toMatch(/\[»\]\s+──\s+debug\s+\|\s+[^|]+\|\s+Identifying companionID/);
        expect(output).toMatch(/\[»\]\s+──\s+debug\s+\|\s+[^|]+\|\s+Query/);
        expect(output).toMatch(/┌┤ Validation Audit ├[─]+/);
        expect(output).toMatch(/\[✓\]\s+STABLE/);
    });

    test('05 sys init should write identity to SQLite (dual-write verification)', async () => {
        const companionIdPath = join(TBC_ROOT, 'sys', 'companion.id');
        const companionId = (await file(companionIdPath).text()).trim();
        const primeIdPath = join(TBC_ROOT, 'sys', 'prime.id');
        const primeId = (await file(primeIdPath).text()).trim();
        expectSQLiteRecordMojo(companionId);
        expectSQLiteRecordMojo(primeId);
        expectSQLiteDataMojo(companionId, 'record_title', 'Mojo');
        expectSQLiteDataMojo(companionId, 'record_type', 'party');
        expectSQLiteDataMojo(primeId, 'record_title', 'Jojo');
        const dbRecords = querySqlite('SELECT record_id FROM record WHERE collection = ?', ['mem']);
        expect(dbRecords.length).toBeGreaterThan(0);
    });
});
