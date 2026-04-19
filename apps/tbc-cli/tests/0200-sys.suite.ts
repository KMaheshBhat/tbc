import { file } from 'bun';
import { describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { readdirSync } from 'node:fs';

import { generateFileTree, runMonorepoCommand } from '../../../scripts/common';
import packageJson from '../package.json' with { type: 'json' };

import { CLI_TARGET, TBC_ROOT, expectUUID, querySqlite, expectSQLiteDataMojo, expectSQLiteRecordMojo } from './test-helper';

describe('🐵 0200 LETS-GO: tbc sys', () => {

    test('running sys init with companion and prime flags is successful', async () => {
        const { output, exitCode, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
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
        expect(output).toContain('┌┤ Minted IDs ├');
        expect(output).toContain('├┤ Keyed ├');
        expect(output).toContain('[i] ── info  | init-flow | companionID: ');
        expect(output).toContain('[i] ── info  | init-flow | primeID: ');
        expect(output).toContain('[i] ── info  | init-flow | memoryMapID: ');
        expect(output).toContain('[✓] STABLE   | 0 error(s) detected.');
        expect(output).toContain('[i] ── info  | init-flow | Companion: Mojo');
        expect(output).toContain('[i] ── info  | init-flow | Prime: Jojo');
        expect(output).toContain('[i] ── info  | init-flow | Map of Memories');
        expect(output).toContain(`[✓] Third Brain Companion ${packageJson.version} initialized.`);

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

    test('running sys init on existing TBC-Root should fail with helpful message', async () => {
        const { output, exitCode, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
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
        expect(output).toContain('[✓] STABLE   | 0 error(s) detected.');
        expect(output).toContain('[✗] ┬─ error | init-flow | has existing companion');
        expect(output).toContain('    └─ Suggestion: Use "tbc sys upgrade" instead.');
    });

    test('running sys upgrade on TBC-Root is successful', async () => {
        const { output, exitCode, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            'sys',
            'upgrade',
            '--root',
            TBC_ROOT,
        ]);
        expect(success).toBe(true);
        expect(exitCode).toBe(0);
        expect(output).toContain(`[✓] Third Brain Companion upgraded to ${packageJson.version}.`);
        expect(output).toContain('┌┤ Validation Audit ├');
        expect(output).toContain('[✓] STABLE');

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

    test('running sys validate on a healthy root', () => {
        const { output, exitCode, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            'sys',
            'validate',
            '--root',
            TBC_ROOT,
        ]);
        expect(success).toBe(true);
        expect(exitCode).toBe(0);
        expect(output).toContain('┌┤ Validation Audit ├');
        expect(output).toContain('Verified presence of "root.md"');
        expect(output).toContain('Referenced Root Memory Map');
        expect(output).toContain('[✓] STABLE');
        expect(output).toContain('0 error(s) detected.');
        expect(output).not.toContain('[»] ── debug');
    });

    test('running sys validate with --verbose shows deep trace', () => {
        const { output, exitCode, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            'sys',
            'validate',
            '--root',
            TBC_ROOT,
            '--verbose',
        ]);
        expect(success).toBe(true);
        expect(exitCode).toBe(0);
        expect(output).toContain('[»] ── debug | load-core-memories | Identifying companionID');
        expect(output).toContain('[»] ── debug | load-specifications-flow | Query');
        expect(output).toContain('┌┤ Validation Audit ├');
        expect(output).toContain('[✓] STABLE');
    });

    test('sys init should write identity to SQLite (dual-write verification)', async () => {
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
