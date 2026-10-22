import { describe, expect, test, beforeAll } from 'bun:test';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { runTbcCommand } from './test-helper';

import { TBC_ROOT, TBC_ROOT_NEXT } from './test-helper';
import { queryCollection } from '../src/lib/fs.js';

/**
 * The portability contract of a TBC vault.
 *
 * A vault is a *portable* artefact: the same vault, cloned between a Windows
 * drive and a WSL2 drive, must carry the same identities on both hosts. Every
 * identity the product writes into a vault is a **POSIX-separated relative
 * path**:
 *
 *   - the collection record id (`queryCollection`)
 *   - the generated skill id (`dex/skills.jsonl`)
 *   - the digest `SOURCE` marker (`dex/sys.digest.txt`)
 *
 * On Windows the producers of these identities used to hand back the
 * OS-native separator (`\`), so a vault built on Windows indexed differently
 * from the same vault built on POSIX - and a `SOURCE` marker built on Windows
 * pointed at a path that does not resolve on a POSIX host.
 *
 * No existing suite asserted the separator format, so a green suite did not
 * catch the defect. These cases are the missing assertions.
 */

interface Vault {
    label: string;
    root: string;
    sys: string;
    skills: string;
    dex: string;
}

const VAULTS: Vault[] = [
    { label: 'Mojo (baseline)', root: TBC_ROOT, sys: 'sys', skills: 'skills', dex: 'dex' },
    { label: 'Kong (next)', root: TBC_ROOT_NEXT, sys: 'sys_next', skills: 'skills_next', dex: 'dex_next' },
];

/** A *doubly* nested spec - the case that carries a backslash unnormalised. */
function nestedSpecPath(vault: Vault): string {
    return join(vault.root, vault.sys, 'ext', 'nested', 'deep.md');
}

function seedNestedSpec(vault: Vault): void {
    mkdirSync(join(vault.root, vault.sys, 'ext', 'nested'), { recursive: true });
    writeFileSync(
        nestedSpecPath(vault),
        [
            '---',
            'id: deep',
            'record_type: specification',
            'specification_name: nested-ext',
            'record_title: Nested ext spec (portability probe)',
            'record_create_date: 2026-10-22 00:00:00 UTC',
            '---',
            '# Nested ext spec',
            'A doubly nested specification, used to probe the digest SOURCE marker.',
            '',
        ].join('\n'),
        'utf-8',
    );
}

function skillEntries(vault: Vault): Array<{ id: string; [key: string]: unknown }> {
    const path = join(vault.root, vault.dex, 'skills.jsonl');
    expect(existsSync(path)).toBe(true);
    return readFileSync(path, 'utf-8')
        .split('\n')
        .filter((line) => line.trim().length > 0)
        .map((line) => JSON.parse(line));
}

function digestMarkers(vault: Vault): string[] {
    const path = join(vault.root, vault.dex, 'sys.digest.txt');
    expect(existsSync(path)).toBe(true);
    return [...readFileSync(path, 'utf-8').matchAll(/<<<< SOURCE: (.+?) >>>>/g)]
        .map((match) => match[1] ?? '')
        .filter((marker) => marker.length > 0);
}

for (const vault of VAULTS) {
    describe(`🐵 0650 tbc portability (${vault.label})`, () => {
        beforeAll(() => {
            seedNestedSpec(vault);
            const { success } = runTbcCommand(vault.root, ['dex', 'rebuild', '--root', vault.root]);
            expect(success).toBe(true);
        });

        test('00 the generated skill ids in dex/skills.jsonl are POSIX-separated', () => {
            const entries = skillEntries(vault);
            expect(entries.length).toBeGreaterThan(0);
            for (const entry of entries) {
                expect(typeof entry.id).toBe('string');
                expect(entry.id).not.toContain('\\');
                // A `/`-separated path has no empty segment.
                expect(entry.id.split('/').every((segment) => segment.length > 0)).toBe(true);
            }
        });

        test('01 the generated skill ids are relative paths that resolve on disk', () => {
            const entries = skillEntries(vault);
            for (const entry of entries) {
                const onDisk = join(vault.root, vault.skills, ...entry.id.split('/'));
                expect(existsSync(onDisk)).toBe(true);
            }
        });

        test('02 the core skills are indexed under their POSIX id', () => {
            const ids = skillEntries(vault).map((entry) => entry.id);
            for (const skillName of [
                'tbc-act-ops',
                'tbc-dex-ops',
                'tbc-env-probe',
                'tbc-int-ops',
                'tbc-mem-ops',
                'tbc-sys-ops',
            ]) {
                expect(ids).toContain(`core/${skillName}/SKILL.md`);
            }
        });

        test('03 the digest SOURCE markers are POSIX-separated', () => {
            const markers = digestMarkers(vault);
            expect(markers.length).toBeGreaterThan(0);
            for (const marker of markers) {
                expect(marker).not.toContain('\\');
            }
        });

        test('04 the digest SOURCE markers address the specs they were built from', () => {
            const markers = digestMarkers(vault);
            expect(markers).toContain(`${vault.sys}/root.md`);
            expect(markers).toContain(`${vault.sys}/core/20251228150423.md`);
            // The nested spec: the case that carried the backslash.
            expect(markers).toContain(`${vault.sys}/ext/nested/deep.md`);
        });

        test('05 the collection record ids are POSIX-separated', () => {
            const ids = queryCollection(vault.root, vault.skills, { recursive: true });
            expect(ids.length).toBeGreaterThan(0);
            for (const id of ids) {
                expect(id).not.toContain('\\');
                expect(id.split('/').every((segment) => segment.length > 0)).toBe(true);
            }
            expect(ids).toContain('core/tbc-act-ops/SKILL');
        });
    });
}
