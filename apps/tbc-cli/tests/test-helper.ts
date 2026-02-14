import { expect } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { TSID_REGEX, UUID_REGEX } from '../../../scripts/common';

export const PROJECT_ROOT = join(import.meta.dir, '../../..');
export const CLI_ENTRY = join(PROJECT_ROOT, 'apps/tbc-cli/src/index.ts');
export const SANDBOX = join(PROJECT_ROOT, '_test');
export const TBC_ROOT = join(SANDBOX, 'mojo');
export const TEST_BINARY = process.env.TBC_TEST_BINARY;
export const CLI_TARGET = TEST_BINARY ? join(PROJECT_ROOT, TEST_BINARY) : CLI_ENTRY;
export const UUID_SEARCH_REGEX = new RegExp(UUID_REGEX.source.replace('^', '').replace('$', ''), 'gi');
export const TSID_SEARCH_REGEX = new RegExp(TSID_REGEX.source.replace('^', '').replace('$', ''), 'g');

export function expectUUID(content: string) {
    expect(content).toMatch(UUID_REGEX);
}

export function expectTSID(content: string) {
    expect(content).toMatch(TSID_REGEX);
}

/**
 * Reads a TBC record from disk and parses its frontmatter and content.
 * Uses a hardened regex-based parser to avoid external dependencies.
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
                    // Clean up quotes and YAML list dashes
                    frontmatter[key] = value
                        .replace(/^['"]|['"]$/g, '') // Remove surrounding quotes
                        .replace(/^- /, '');         // Remove list dashes if present
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
