import { file } from "bun";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

import { generateFileTree, runMonorepoCommand, UUID_REGEX, TSID_REGEX } from "../../../scripts/common";
import packageJson from '../package.json' with { type: 'json' };

const PROJECT_ROOT = join(import.meta.dir, "../../..");
const CLI_ENTRY = join(PROJECT_ROOT, "apps/tbc-cli/src/index.ts");
const SANDBOX = join(PROJECT_ROOT, "_test");
const TBC_ROOT = join(SANDBOX, "mojo");
const TEST_BINARY = process.env.TBC_TEST_BINARY;
const CLI_TARGET = TEST_BINARY ? join(PROJECT_ROOT, TEST_BINARY) : CLI_ENTRY;

// Create "Search" versions by stripping the ^ and $ anchors
const UUID_SEARCH_REGEX = new RegExp(UUID_REGEX.source.replace('^', '').replace('$', ''), 'gi');
const TSID_SEARCH_REGEX = new RegExp(TSID_REGEX.source.replace('^', '').replace('$', ''), 'g');

function expectUUID(content: string) {
    // We use the original strict regex for the final check on the extracted string
    expect(content).toMatch(UUID_REGEX);
}

function expectTSID(content: string) {
    expect(content).toMatch(TSID_REGEX);
}

describe("TBC-CLI Integration", () => {

    beforeAll(() => {
        if (!existsSync(SANDBOX)) mkdirSync(SANDBOX, { recursive: true });

        if (existsSync(TBC_ROOT)) {
            rmSync(TBC_ROOT, { recursive: true, force: true });
        }
        mkdirSync(TBC_ROOT, { recursive: true });

        console.log("🐵 Suite Setup Complete: TBC_ROOT is ready");
    });

    describe("🐵 GENERATOR: tbc gen", () => {

        test("should generate a single UUID v7 by default", () => {
            const { output, success } = runMonorepoCommand(SANDBOX, CLI_TARGET, ["gen", "uuid"]);
            expect(success).toBe(true);
            expect(output).toContain("┌┤ Minted IDs ├");
            expect(output).toContain("├┤ Batch ├");
            // Extract the ID from the log line
            const matches = output.match(UUID_SEARCH_REGEX);
            expect(matches).not.toBeNull();
            if (matches) expectUUID(matches[0]);
        });

        test("should generate multiple UUIDs using --count", () => {
            const count = 5;
            const { output, success } = runMonorepoCommand(SANDBOX, CLI_TARGET, ["gen", "uuid", "--count", count.toString()]);
            expect(success).toBe(true);
            const matches = output.match(new RegExp(UUID_SEARCH_REGEX, 'g'));
            expect(matches?.length).toBe(count);
        });

        test("should generate a single TSID (timestamp ID)", () => {
            const { output, success } = runMonorepoCommand(SANDBOX, CLI_TARGET, ["gen", "tsid"]);
            expect(success).toBe(true);
            expect(output).toContain("┌┤ Minted IDs ├");
            // Look for the 14-digit timestamp in the output
            const matches = output.match(TSID_SEARCH_REGEX);
            expect(matches).not.toBeNull();
            if (matches) expectTSID(matches[0]);
        });

        test("should generate multiple TSIDs using -c shorthand", () => {
            const count = 2;
            const { output, success } = runMonorepoCommand(SANDBOX, CLI_TARGET, ["gen", "tsid", "-c", count.toString()]);
            expect(success).toBe(true);
            const matches = output.match(new RegExp(TSID_SEARCH_REGEX.source, 'g'));
            expect(matches?.length).toBe(count);
        });

        test("should show error for invalid count", () => {
            const { success, exitCode } = runMonorepoCommand(SANDBOX, CLI_TARGET, ["gen", "uuid", "--count", "zero"]);
            // Commander usually handles type validation or your schema does
            expect(success).toBe(false);
            expect(exitCode).toBe(1);
        });
    });

    describe("🐵 PRE-FLIGHT: tbc ", () => {
        test("running with no args gives help and error exit code (still provides Usage)", () => {
            const { output, exitCode, success } = runMonorepoCommand(SANDBOX, CLI_TARGET, []);
            expect(success).toBe(false);
            expect(exitCode).toBe(1);
            expect(output).toContain("Third Brain Companion CLI");
            expect(output).toContain("Usage:");
        });

        test("running with --help gives help and success exit code", () => {
            const { output, exitCode, success } = runMonorepoCommand(SANDBOX, CLI_TARGET, ["--help"]);
            expect(success).toBe(true);
            expect(exitCode).toBe(0);
            expect(output).toContain("Third Brain Companion CLI");
            expect(output).toContain("Usage:");
        });
    });

    describe("🐵 PRE-FLIGHT: tbc sys init", () => {
        test("running sys init with missing flags is fails with helpful message", () => {
            {
                const { output, exitCode, success } = runMonorepoCommand(SANDBOX, CLI_TARGET, ["sys", "init"]);
                expect(success).toBe(false);
                expect(exitCode).toBe(1);
                expect(output).toContain("Both --companion and --prime flags are required");
            }
            {
                const { output, exitCode, success } = runMonorepoCommand(SANDBOX, CLI_TARGET, ["sys", "init", "--root", TBC_ROOT]);
                expect(success).toBe(false);
                expect(exitCode).toBe(1);
                expect(output).toContain("Both --companion and --prime flags are required");
            }
            {
                const { output, exitCode, success } = runMonorepoCommand(SANDBOX, CLI_TARGET, ["sys", "init", "--root", TBC_ROOT, "--companion", "Mojo"]);
                expect(success).toBe(false);
                expect(exitCode).toBe(1);
                expect(output).toContain("Both --companion and --prime flags are required");
            }
            {
                const { output, exitCode, success } = runMonorepoCommand(SANDBOX, CLI_TARGET, ["sys", "init", "--root", TBC_ROOT, "--prime", "Jojo"]);
                expect(success).toBe(false);
                expect(exitCode).toBe(1);
                expect(output).toContain("Both --companion and --prime flags are required");
            }
        });
    });

    describe("🐵 PRE-FLIGHT: tbc sys upgrade", () => {

        test("running sys upgrade on non-TBC-Root should fail with helpful message", async () => {
            const { output, exitCode, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
                "sys",
                "upgrade",
                "--root",
                TBC_ROOT,
            ]);
            expect(exitCode).toBe(0);
            expect(output).toContain('[✗] ┬─ error | upgrade-flow | has no existing companion (not a valid TBC Root)');
            expect(output).toContain('    └─ Suggestion: Use "tbc sys init" instead');
        });
    });

    describe("🐵 LETS-GO: tbc sys", () => {

        test("running sys init with companion and prime flags is successful", async () => {
            const { output, exitCode, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
                "sys",
                "init",
                "--root",
                TBC_ROOT,
                "--companion",
                "Mojo",
                "--prime",
                "Jojo",
            ]);
            if (!success) {
                console.log(output);
                console.log("Tree on failure:");
                console.log(generateFileTree(TBC_ROOT));
            }
            expect(success).toBe(true);
            expect(exitCode).toBe(0);
            const companionIdPath = join(TBC_ROOT, "sys", "companion.id");
            const companionId = (await file(companionIdPath).text()).trim();
            expectUUID(companionId);
            const primeIdPath = join(TBC_ROOT, "sys", "prime.id");
            const primeId = (await file(primeIdPath).text()).trim();
            expectUUID(primeId);
            expect(output).toContain("┌┤ Minted IDs ├");
            expect(output).toContain("├┤ Keyed ├");
            expect(output).toContain("[i] ── info  | init-flow | companionID: ");
            expect(output).toContain("[i] ── info  | init-flow | primeID: ");
            expect(output).toContain("[i] ── info  | init-flow | memoryMapID: ");
            expect(output).toContain('[✓] STABLE   | 0 error(s) detected.');
            expect(output).toContain('[i] ── info  | init-flow | Companion: Mojo');
            expect(output).toContain('[i] ── info  | init-flow | Prime: Jojo');
            expect(output).toContain('[i] ── info  | init-flow | Map of Memories');
            expect(output).toContain(`[✓] Third Brain Companion ${packageJson.version} initialized.`);
        });

        test("running sys init on existing TBC-Root should fail with helpful message", async () => {
            const { output, exitCode, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
                "sys",
                "init",
                "--root",
                TBC_ROOT,
                "--companion",
                "Mojo",
                "--prime",
                "Jojo",
            ]);
            if (!success) {
                console.log(output);
                console.log("Tree on failure:");
                console.log(generateFileTree(TBC_ROOT));
            }
            expect(exitCode).toBe(0);
            expect(output).toContain('[✓] STABLE   | 0 error(s) detected.');
            expect(output).toContain('[✗] ┬─ error | init-flow | has existing companion');
            expect(output).toContain('    └─ Suggestion: Use "tbc sys upgrade" instead.');
        });

        test("running sys upgrade on TBC-Root is successful", async () => {
            const { output, exitCode, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
                "sys",
                "upgrade",
                "--root",
                TBC_ROOT,
            ]);
            expect(success).toBe(true);
            expect(exitCode).toBe(0);
            expect(output).toContain(`[✓] Third Brain Companion upgraded to ${packageJson.version}.`);
        });

        test("running sys validate on a healthy root", () => {
            const { output, exitCode, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
                "sys",
                "validate",
                "--root",
                TBC_ROOT,
            ]);
            expect(success).toBe(true);
            expect(exitCode).toBe(0);
            // Verify the Audit Box exists
            expect(output).toContain("┌┤ Validation Audit ├");
            expect(output).toContain("Verified presence of \"root.md\"");
            expect(output).toContain("Referenced Root Memory Map");
            // Verify the Status Line
            expect(output).toContain("[✓] STABLE");
            expect(output).toContain("0 error(s) detected.");
            // Ensure debug noise is NOT present
            expect(output).not.toContain("[»] ── debug");
        });

        test("running sys validate with --verbose shows deep trace", () => {
            const { output, exitCode, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
                "sys",
                "validate",
                "--root",
                TBC_ROOT,
                "--verbose"
            ]);
            expect(success).toBe(true);
            expect(exitCode).toBe(0);
            // Verify AX/DX Debug lines are present
            expect(output).toContain("[»] ── debug | validate-flow | Identifying companionID");
            expect(output).toContain("[»] ── debug | validate-flow | Query");
            // Verify the core audit is still there
            expect(output).toContain("┌┤ Validation Audit ├");
            expect(output).toContain("[✓] STABLE");
        });
    });

    describe("🐵 LETS-GO: tbc dex", () => {

        test("running dex rebuild on non-TBC-Root should fail with helpful message", async () => {
            const { output, exitCode, success } = runMonorepoCommand(SANDBOX, CLI_TARGET, [
                "dex",
                "rebuild",
                "--root",
                join(SANDBOX, "non-existent"),
            ]);
            expect(exitCode).toBe(0);
            expect(output).toContain('[✗] ┬─ error | dex-rebuild-flow | has no existing companion (not a valid TBC Root)');
            expect(output).toContain('    └─ Suggestion: Can only be run on a valid TBC Root. (Use "tbc sys init" for new Companion).');
        });

        test("running dex rebuild on TBC-Root is successful", async () => {
            const { output, exitCode, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
                "dex",
                "rebuild",
                "--root",
                TBC_ROOT,
            ]);
            expect(success).toBe(true);
            expect(exitCode).toBe(0);
            expect(output).toContain('[✓] System Index (Dex) Rebuilt');
            expect(output).toContain('Stored ');
            expect(output).toContain(' dex record(s)');
            const dexDir = join(TBC_ROOT, "dex");
            const digestContent = readFileSync(join(dexDir, "sys.digest.txt"), 'utf-8');
            expect(digestContent).toContain('<<< SOURCE: sys/root.md >>>');
            expect(digestContent).toContain('<<< SOURCE: sys/core/20251228150423.md >>>');
            expect(digestContent).toContain('# Mojo Root');
            const expectedFiles = ["sys.digest.txt", "skills.jsonl", "party.memory.jsonl", "structure.memory.jsonl"];
            for (const file of expectedFiles) {
                expect(existsSync(join(dexDir, file))).toBe(true);
            }
            const partyContent = readFileSync(join(dexDir, "party.memory.jsonl"), 'utf-8');
            const lines = partyContent.trim().split('\n');
            expect(lines.length).toBeGreaterThan(0);
            const firstLine = JSON.parse(lines[0]!);
            expect(firstLine).toHaveProperty('record_type', 'party');
            expect(firstLine).toHaveProperty('collection', 'mem');
        });

    });

    describe("🐵 LETS-GO: tbc mem", () => {

        test("should remember a simple note with a generated UUID", async () => {
            const thought = "Buy more bananas for Mojo";
            const { output, success, exitCode } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
                "mem", "remember", thought,
                "--root", TBC_ROOT
            ]);

            expect(success).toBe(true);
            expect(exitCode).toBe(0);

            // 1. Verify CLI Feedback
            expect(output).toContain("[✓] Memory persisted");
            
            // 2. Find the UUID minted in the output to locate the file
            const matches = output.match(UUID_SEARCH_REGEX);
            expect(matches).not.toBeNull();
            const mintedId = matches![0];

            // 3. Verify File Existence
            const memFilePath = join(TBC_ROOT, "mem", `${mintedId}.md`);
            expect(existsSync(memFilePath)).toBe(true);

            // 4. Verify Content & Metadata
            const content = readFileSync(memFilePath, 'utf-8');
            expect(content).toContain("record_type: note");
            expect(content).toContain(thought);
            expect(content).toContain(`id: ${mintedId}`);
        });

        test("should create a stub for a specific record type", async () => {
            const { output, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
                "mem", "remember", 
                "--type", "goal",
                "--root", TBC_ROOT
            ]);

            expect(success).toBe(true);
            const matches = output.match(UUID_SEARCH_REGEX);
            const mintedId = matches![0];
            
            const content = readFileSync(join(TBC_ROOT, "mem", `${mintedId}.md`), 'utf-8');
            expect(content).toContain("record_type: goal");
            // Should contain a title placeholder if no content provided
            expect(content).toContain("record_title: New goal"); 
        });

        test("should accept tags and title via flags", async () => {
            const { output, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
                "mem", "remember", "Detail about the plan",
                "--type", "note",
                "--title", "Master Plan",
                "--tags", "plan,secret,mojo",
                "--root", TBC_ROOT
            ]);

            const mintedId = output.match(UUID_SEARCH_REGEX)![0];
            const content = readFileSync(join(TBC_ROOT, "mem", `${mintedId}.md`), 'utf-8');
            
            expect(content).toContain("record_title: Master Plan");
            expect(content).toContain("- t/plan");
            expect(content).toContain("- t/secret");
            expect(content).toContain("- t/mojo");
        });
    });

    afterAll(() => {
        console.log("🐵 Mojo Jojo!")
        console.log(generateFileTree(TBC_ROOT));
        console.log("🐵 Suite Complete");
    });

});
