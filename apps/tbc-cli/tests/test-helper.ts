import { expect } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Database } from 'bun:sqlite';

import { TSID_REGEX, UUID_REGEX } from '../../../scripts/common';

// Path Constants
export const PROJECT_ROOT = join(import.meta.dir, '../../..');
export const CLI_ENTRY = join(PROJECT_ROOT, 'apps/tbc-cli/src/index.ts');
export const TEST_BINARY = process.env.TBC_TEST_BINARY;
export const CLI_TARGET = TEST_BINARY ? join(PROJECT_ROOT, TEST_BINARY) : CLI_ENTRY;

// Mojo Baseline (Standard FS-only 0.3/0.4 fallback)
// - companion: mojo
// - prime: jojo
export const SANDBOX = join(PROJECT_ROOT, '_test');
export const TBC_ROOT = join(SANDBOX, 'mojo');
export const TBC_DB = join(TBC_ROOT, 'records.db');

// Kong "Next" (Dual FS + SQLite 0.4 standard)
// - companion: kong
// - prime: zilla
export const SANDBOX_NEXT = join(PROJECT_ROOT, '_test');
export const TBC_ROOT_NEXT = join(SANDBOX_NEXT, 'kong');
export const TBC_DB_NEXT = join(TBC_ROOT_NEXT, 'records.db');

// Regex Utilities
export const UUID_SEARCH_REGEX = new RegExp(UUID_REGEX.source.replace('^', '').replace('$', ''), 'gi');
export const TSID_SEARCH_REGEX = new RegExp(TSID_REGEX.source.replace('^', '').replace('$', ''), 'g');

/**
 * Validates the SQLite state in SANDBOX_NEXT.
 * Returns results of a raw SQL query for deep assertion.
 */
export function querySqliteNext(sql: string, params: any[] = []) {
    if (!existsSync(TBC_DB_NEXT)) {
        throw new Error(`SQLite database not found at: ${TBC_DB_NEXT}`);
    }
    const db = new Database(TBC_DB_NEXT);
    try {
        return db.query(sql).all(...params);
    } finally {
        db.close();
    }
}

/**
 * Validates the SQLite state in SANDBOX (Mojo baseline).
 * Returns results of a raw SQL query for deep assertion.
 */
export function querySqlite(sql: string, params: any[] = []) {
    if (!existsSync(TBC_DB)) {
        throw new Error(`SQLite database not found at: ${TBC_DB}`);
    }
    const db = new Database(TBC_DB);
    try {
        return db.query(sql).all(...params);
    } finally {
        db.close();
    }
}

/**
 * Asserts a record exists in the SQLite data table.
 */
export function expectSQLiteRecord(id: string) {
    const results = querySqliteNext('SELECT record_id FROM record WHERE record_id = ?', [id]);
    expect(results.length).toBeGreaterThan(0);
}

/**
 * Asserts a record exists in Mojo baseline SQLite.
 */
export function expectSQLiteRecordMojo(id: string) {
    const results = querySqlite('SELECT record_id FROM record WHERE record_id = ?', [id]);
    expect(results.length).toBeGreaterThan(0);
}

/**
 * Utility to check the 'data' JSON column for a specific key/value pair.
 * Supports direct values or a predicate function for complex checks (like tags).
 */
export function expectSQLiteData(id: string | undefined, key: string, expectedValue: any) {
    expect(id).toBeDefined();
    const results = querySqliteNext('SELECT * FROM record WHERE record_id = ?', [id]) as any[];
    if (results.length === 0) throw new Error(`Record ${id} not found`);
    
    const row = results[0];
    const data = JSON.parse(row.data);
    
    // Check top-level columns first, then fall back to the JSON data
    const actualValue = row[key] !== undefined ? row[key] : data[key];

    if (typeof expectedValue === 'function') {
        // If it's a function, run the predicate and expect a truthy return
        const result = expectedValue(actualValue);
        if (!result) {
            throw new Error(`Predicate failed for key "${key}". Received: ${JSON.stringify(actualValue)}`);
        }
    } else {
        // Otherwise, standard equality
        expect(actualValue).toEqual(expectedValue);
    }
}

/**
 * Utility to check the 'data' JSON column for a specific key/value pair in Mojo.
 */
export function expectSQLiteDataMojo(id: string | undefined, key: string, expectedValue: any) {
    expect(id).toBeDefined();
    const results = querySqlite('SELECT * FROM record WHERE record_id = ?', [id]) as any[];
    if (results.length === 0) throw new Error(`Record ${id} not found`);
    
    const row = results[0];
    const data = JSON.parse(row.data);
    
    const actualValue = row[key] !== undefined ? row[key] : data[key];

    if (typeof expectedValue === 'function') {
        const result = expectedValue(actualValue);
        if (!result) {
            throw new Error(`Predicate failed for key "${key}". Received: ${JSON.stringify(actualValue)}`);
        }
    } else {
        expect(actualValue).toEqual(expectedValue);
    }
}

export function expectUUID(content: string) {
    expect(content).toMatch(UUID_REGEX);
}

export function expectTSID(content: string) {
    expect(content).toMatch(TSID_REGEX);
}

/**
 * Reads a TBC record from disk and parses its frontmatter and content.
 * Used to verify the FS "Authority" source.
 */
export function getRecordFromDisk(absolutePath: string) {
    if (!existsSync(absolutePath)) {
        throw new Error(`Record not found at: ${absolutePath}`);
    }

    const raw = readFileSync(absolutePath, 'utf-8');
    const lines = raw.split('\n');

    const frontmatter: Record<string, any> = {};
    let contentLines: string[] = [];
    let isFrontmatter = false;
    let yamlProcessed = false;

    for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed === '---') {
            if (!yamlProcessed) {
                isFrontmatter = !isFrontmatter;
                if (!isFrontmatter) yamlProcessed = true;
                continue;
            }
        }

        if (isFrontmatter) {
            const colonIndex = line.indexOf(':');
            if (colonIndex > 0) {
                const key = line.slice(0, colonIndex).trim();
                const value = line.slice(colonIndex + 1).trim();

                if (key) {
                    frontmatter[key] = value
                        .replace(/^['"]|['"]$/g, '') 
                        .replace(/^- /, '');         
                }
            }
        } else {
            contentLines.push(line);
        }
    }

    return {
        frontmatter,
        content: contentLines.join('\n').trim(),
        raw,
    };
}

export { generateFileTree, runMonorepoCommand } from '../../../scripts/common';