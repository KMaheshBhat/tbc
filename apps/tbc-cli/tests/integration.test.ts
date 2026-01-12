import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { file, spawnSync } from "bun";
import { join } from "node:path";
import { existsSync, mkdirSync, rmSync, readdirSync, statSync } from "node:fs";

const PROJECT_ROOT = join(import.meta.dir, "../../..");
const CLI_ENTRY = join(PROJECT_ROOT, "apps/tbc-cli/src/index.ts");
const SANDBOX = join(PROJECT_ROOT, "_test");
const TBC_ROOT = join(SANDBOX, "mojo");

function runCMD(wd: string, cmd: string, args: string[]) {
    const command = (cmd.endsWith('.ts') || cmd.endsWith('.js'))
        ? [process.execPath, cmd, ...args]
        : [cmd, ...args];

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

async function expectUUID(content: string) {
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

    test("🐵 LETS-GO: running sys init with companion and prime flags is successful", async () => {
        const { output, exitCode, success } = runCMD(TBC_ROOT, CLI_ENTRY, ["sys", "init", "--root", TBC_ROOT, "--companion", "Mojo", "--prime", "Jojo"]);
        if (!success) console.log("Tree on failure:\n", getFileTree(TBC_ROOT));
        console.log(output);
        expect(success).toBe(true);
        expect(exitCode).toBe(0);
        const companionIdPath = join(TBC_ROOT, "sys", "companion.id");
        const companionId = (await file(companionIdPath).text()).trim();
        expectUUID(companionId);
        const primeIdPath = join(TBC_ROOT, "sys", "prime.id");
        const primeId = (await file(primeIdPath).text()).trim();
        expectUUID(primeId);
        expect(output).toContain('[✓] STABLE   | 0 error(s) detected.')
    });

    afterAll(() => {
        console.log("🐵 Mojo Jojo!")
        console.log(getFileTree(TBC_ROOT));
        console.log("🐵 Suite Complete");
    });

});
