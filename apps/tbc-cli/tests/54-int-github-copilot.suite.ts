import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync, lstatSync } from "node:fs";
import { join } from "node:path";
import {
    TBC_ROOT,
    CLI_TARGET,
    runMonorepoCommand,
} from "./test-helper";

describe("🐵 LETS-GO: tbc int generate (GitHub Copilot)", () => {

    test("should generate Copilot specific configuration in nested directory with slugified name", () => {
        const { output, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            "int", "github-copilot",
            "--root", TBC_ROOT
        ]);

        expect(success).toBe(true);
        expect(output).toContain("Agent Type: github-copilot");
        expect(output).toContain("STABLE");

        // 1. Verify Directory Structure (mkdir -p check)
        const agentsDir = join(TBC_ROOT, ".github", "agents");
        expect(existsSync(agentsDir)).toBe(true);
        expect(lstatSync(agentsDir).isDirectory()).toBe(true);

        // 2. Verify Slugified Filename
        // We expect 'mojo' (lowercase) regardless of how 'Mojo' appears in memory
        const copilotPath = join(agentsDir, "mojo.agent.md");
        expect(existsSync(copilotPath)).toBe(true);

        const content = readFileSync(copilotPath, "utf-8");
        
        // 3. Verify Frontmatter & Content Synthesis
        expect(content.startsWith("---")).toBe(true);
        expect(content).toContain("description: This custom agent personifies Mojo"); 
        expect(content).toContain("tools:");
        expect(content).toContain("- execute");
        
        // 4. Verify Identity hydration
        expect(content).toContain("For the interaction, you will act as Mojo.");
        expect(content).toContain("ALWAYS read @tbc/root.md");
    });

    test("should be idempotent (running twice changes nothing)", () => {
        const copilotPath = join(TBC_ROOT, ".github", "agents", "mojo.agent.md");

        // Capture first state
        runMonorepoCommand(TBC_ROOT, CLI_TARGET, ["int", "github-copilot", "--root", TBC_ROOT]);
        const firstRunContent = readFileSync(copilotPath, "utf-8");

        // Run again
        const { success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            "int", "github-copilot",
            "--root", TBC_ROOT
        ]);

        expect(success).toBe(true);
        const secondRunContent = readFileSync(copilotPath, "utf-8");
        
        expect(secondRunContent).toBe(firstRunContent);
    });
});
