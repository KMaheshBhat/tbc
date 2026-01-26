import { describe, expect, test } from "bun:test";

import { runMonorepoCommand } from "../../../scripts/common";

import { CLI_TARGET, TBC_ROOT, UUID_SEARCH_REGEX } from "./test-helper";

describe("🐵 LETS-GO: tbc mem recall", () => {

    test("should recall companion identity (who am i)", () => {
        const { output, success, exitCode } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            "mem", "recall", "companion", "--root", TBC_ROOT
        ]);

        expect(success).toBe(true);
        expect(exitCode).toBe(0);
        expect(output).toContain("Companion Identity");
        expect(output).toContain("Mojo");
        // Verify it displays the ID from the .id file
        const matches = output.match(UUID_SEARCH_REGEX);
        expect(matches).not.toBeNull();
    });

    test("should recall prime identity (who is my prime)", () => {
        const { output, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            "mem", "recall", "prime", "--root", TBC_ROOT
        ]);

        expect(success).toBe(true);
        expect(output).toContain("Prime Identity");
        expect(output).toContain("Jojo");
        const matches = output.match(UUID_SEARCH_REGEX);
        expect(matches).not.toBeNull();
    });

    test("should recall a list of recent memories by default", () => {
        const { output, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            "mem", "recall", "--root", TBC_ROOT
        ]);

        expect(success).toBe(true);
        // Should show the record types we created in Step 15
        expect(output).toContain("note");
        expect(output).toContain("goal");
        expect(output).toContain("Buy more bananas for Mojo");
    });

    test("should filter recall results by type (e.g., goals)", () => {
        const { output, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            "mem", "recall", "--type", "goal", "--root", TBC_ROOT
        ]);

        expect(success).toBe(true);
        expect(output).toContain("goal");
        expect(output).toContain("New goal");
        // Negative check: notes should be filtered out
        expect(output).not.toContain("Buy more bananas");
    });

    test("should support search queries across titles", () => {
        const { output, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            "mem", "recall", "bananas", "--root", TBC_ROOT
        ]);

        expect(success).toBe(true);
        expect(output).toContain("Buy more bananas for Mojo");
    });

});
