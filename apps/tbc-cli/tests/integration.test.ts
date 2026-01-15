import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { file, spawnSync } from "bun";
import { join } from "node:path";
import { existsSync, mkdirSync, rmSync, readdirSync, statSync } from "node:fs";
import packageJson from '../package.json' with { type: 'json' };

const PROJECT_ROOT = join(import.meta.dir, "../../..");
const CLI_ENTRY = join(PROJECT_ROOT, "apps/tbc-cli/src/index.ts");
const SANDBOX = join(PROJECT_ROOT, "_test");
const TBC_ROOT = join(SANDBOX, "mojo");
const TEST_BINARY = process.env.TBC_TEST_BINARY;
const CLI_TARGET = TEST_BINARY ? join(PROJECT_ROOT, TEST_BINARY) : CLI_ENTRY;

function runCMD(wd: string, target: string, args: string[]) {
    // If target is the binary, we don't need process.execPath (Bun/Node)
    const isBinary = target.endsWith('tbc') || !target.endsWith('.ts');
    const command = isBinary ? [target, ...args] : [process.execPath, target, ...args];

    const result = spawnSync(command, {
        cwd: wd,
        stdout: "pipe",
        stderr: 1,
        env: { ...process.env, NO_COLOR: "1" },
    });

    return {
        output: result.stdout.toString(),
        exitCode: result.exitCode,
        success: result.success,
    };
}

function getFileTree(dir: string, prefix = ""): string {
    const files = readdirSync(dir);
    let tree = "";

    files.forEach((file, index) => {
        const path = join(dir, file);
        const isLast = index === files.length - 1;
        const connector = isLast ? " └── " : " ├── ";

        tree += `${prefix}${connector}${file}\n`;

        if (statSync(path).isDirectory()) {
            const newPrefix = prefix + (isLast ? "     " : " │   ");
            tree += getFileTree(path, newPrefix);
        }
    });

    return tree;
}

function expectUUID(content: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(content).toMatch(uuidRegex);
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
        const { output, exitCode, success } = runCMD(SANDBOX, CLI_ENTRY, []);
        expect(success).toBe(false);
        expect(exitCode).toBe(1);
        expect(output).toContain("Third Brain Companion CLI");
        expect(output).toContain("Usage:");
    });

    test("🐵 PRE-FLIGHT: running with --help gives help and success exit code", () => {
        const { output, exitCode, success } = runCMD(SANDBOX, CLI_ENTRY, ["--help"]);
        expect(success).toBe(true);
        expect(exitCode).toBe(0);
        expect(output).toContain("Third Brain Companion CLI");
        expect(output).toContain("Usage:");
    });

    test("🐵 PRE-FLIGHT: running sys init with missing flags is fails with helpful message", () => {
        {
            const { output, exitCode, success } = runCMD(SANDBOX, CLI_ENTRY, ["sys", "init"]);
            expect(success).toBe(false);
            expect(exitCode).toBe(1);
            expect(output).toContain("Both --companion and --prime flags are required");
        }
        {
            const { output, exitCode, success } = runCMD(SANDBOX, CLI_ENTRY, ["sys", "init", "--root", TBC_ROOT]);
            expect(success).toBe(false);
            expect(exitCode).toBe(1);
            expect(output).toContain("Both --companion and --prime flags are required");
        }
        {
            const { output, exitCode, success } = runCMD(SANDBOX, CLI_ENTRY, ["sys", "init", "--root", TBC_ROOT, "--companion", "Mojo"]);
            expect(success).toBe(false);
            expect(exitCode).toBe(1);
            expect(output).toContain("Both --companion and --prime flags are required");
        }
        {
            const { output, exitCode, success } = runCMD(SANDBOX, CLI_ENTRY, ["sys", "init", "--root", TBC_ROOT, "--prime", "Jojo"]);
            expect(success).toBe(false);
            expect(exitCode).toBe(1);
            expect(output).toContain("Both --companion and --prime flags are required");
        }
    });

    test("🐵 LETS-GO: running sys upgrade on non-TBC-Root should fail with helpful message", async () => {
        const { output, exitCode, success } = runCMD(TBC_ROOT, CLI_ENTRY, [
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
        const { output, exitCode, success } = runCMD(TBC_ROOT, CLI_ENTRY, [
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
            console.log(getFileTree(TBC_ROOT));
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
        const { output, exitCode, success } = runCMD(TBC_ROOT, CLI_ENTRY, [
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
            console.log(getFileTree(TBC_ROOT));
        }
        expect(exitCode).toBe(0);
        expect(output).toContain('[✓] STABLE   | 0 error(s) detected.');
        expect(output).toContain('[✗] ┬─ error | init-flow | has existing companion');
        expect(output).toContain('    └─ Suggestion: Use "tbc sys upgrade" instead.');
    });

    test("🐵 LETS-GO: running sys upgrade on TBC-Root is successful", async () => {
        const { output, exitCode, success } = runCMD(TBC_ROOT, CLI_ENTRY, [
            "sys",
            "upgrade",
            "--root",
            TBC_ROOT,
        ]);
        console.log(output);
        expect(success).toBe(true);
        expect(exitCode).toBe(0);
        expect(output).toContain(`[✓] Third Brain Companion upgraded to ${packageJson.version}.`);
    });

    afterAll(() => {
        console.log("🐵 Mojo Jojo!")
        console.log(getFileTree(TBC_ROOT));
        console.log("🐵 Suite Complete");
    });

});
