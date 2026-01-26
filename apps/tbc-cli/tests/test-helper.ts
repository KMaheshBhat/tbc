import { expect } from "bun:test";
import { join } from "node:path";

import { TSID_REGEX, UUID_REGEX } from "../../../scripts/common";

export const PROJECT_ROOT = join(import.meta.dir, "../../..");
export const CLI_ENTRY = join(PROJECT_ROOT, "apps/tbc-cli/src/index.ts");
export const SANDBOX = join(PROJECT_ROOT, "_test");
export const TBC_ROOT = join(SANDBOX, "mojo");
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

export { generateFileTree, runMonorepoCommand } from "../../../scripts/common";
