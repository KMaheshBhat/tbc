import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
    TBC_ROOT,
    CLI_TARGET,
    runMonorepoCommand,
} from "./test-helper";

describe("🐵 LETS-GO: tbc int generate (Generic)", () => {

    test("should generate AGENTS.md with correct role definition", () => {
        const { output, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            "int", "generic",
            "--root", TBC_ROOT
        ]);
        console.log(output);
        expect(success).toBe(true);

        const agentsPath = join(TBC_ROOT, "AGENTS.md");
        expect(existsSync(agentsPath)).toBe(true);

        const content = readFileSync(agentsPath, "utf-8");
        // Verify the Synthesis worked: check for name and core requirements
        expect(content).toContain("Mojo"); // Assuming Mojo is the companion name
        expect(content).toContain("ALWAYS read @tbc/root.md");
        expect(content).toContain("@dex/core.md");
    });
});