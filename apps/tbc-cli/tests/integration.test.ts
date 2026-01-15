import { file } from "bun";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

import { generateFileTree, runMonorepoCommand, UUID_REGEX } from "../../../scripts/common";
import packageJson from '../package.json' with { type: 'json' };

const PROJECT_ROOT = join(import.meta.dir, "../../..");
const CLI_ENTRY = join(PROJECT_ROOT, "apps/tbc-cli/src/index.ts");
const SANDBOX = join(PROJECT_ROOT, "_test");
const TBC_ROOT = join(SANDBOX, "mojo");
const TEST_BINARY = process.env.TBC_TEST_BINARY;
const CLI_TARGET = TEST_BINARY ? join(PROJECT_ROOT, TEST_BINARY) : CLI_ENTRY;

function expectUUID(content: string) {
    expect(content).toMatch(UUID_REGEX);
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

    test("🐵 PRE-FLIGHT: running with no args gives help and error exit code (still provides Usage)", () => {
        const { output, exitCode, success } = runMonorepoCommand(SANDBOX, CLI_TARGET, []);
        expect(success).toBe(false);
        expect(exitCode).toBe(1);
        expect(output).toContain("Third Brain Companion CLI");
        expect(output).toContain("Usage:");
    });

    test("🐵 PRE-FLIGHT: running with --help gives help and success exit code", () => {
        const { output, exitCode, success } = runMonorepoCommand(SANDBOX, CLI_TARGET, ["--help"]);
        expect(success).toBe(true);
        expect(exitCode).toBe(0);
        expect(output).toContain("Third Brain Companion CLI");
        expect(output).toContain("Usage:");
    });

    test("🐵 PRE-FLIGHT: running sys init with missing flags is fails with helpful message", () => {
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

    test("🐵 LETS-GO: running sys upgrade on non-TBC-Root should fail with helpful message", async () => {
        const { output, exitCode, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            "sys",
            "upgrade",
            "--root",
            TBC_ROOT,
        ]);
        expect(exitCode).toBe(0);
        expect(output).toContain('[✗] ┬─ error | init-flow | has no existing companion (not a valid TBC Root)');
        expect(output).toContain('    └─ Suggestion: Use "tbc sys init" instead');
    });

    test("🐵 LETS-GO: running sys init with companion and prime flags is successful", async () => {
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
        expect(output).toContain('[✓] STABLE   | 0 error(s) detected.');
        expect(output).toContain('[i] ── info  | init-flow | Companion: Mojo');
        expect(output).toContain('[i] ── info  | init-flow | Prime: Jojo');
        expect(output).toContain('[i] ── info  | init-flow | Map of Memories');
        expect(output).toContain(`[✓] Third Brain Companion ${packageJson.version} initialized.`);
    });

    test("🐵 LETS-GO: running sys init on existing TBC-Root should fail with helpful message", async () => {
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

    test("🐵 LETS-GO: running sys upgrade on TBC-Root is successful", async () => {
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

    test("🐵 LETS-GO: running sys validate on a healthy root", () => {
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

    test("🐵 LETS-GO: running sys validate with --verbose shows deep trace", () => {
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

    afterAll(() => {
        console.log("🐵 Mojo Jojo!")
        console.log(generateFileTree(TBC_ROOT));
        console.log("🐵 Suite Complete");
    });

});
