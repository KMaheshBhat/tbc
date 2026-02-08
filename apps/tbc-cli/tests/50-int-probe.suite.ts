import { describe, expect, test } from "bun:test";
import {
    TBC_ROOT,
    SANDBOX,
    CLI_TARGET,
    runMonorepoCommand,
} from "./test-helper";

describe("🐵 LETS-GO: tbc int probe", () => {

    test("should probe successfully when provided a valid TBC_ROOT", () => {
        const { output, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            "int", "probe",
            "--root", TBC_ROOT
        ]);

        expect(success).toBe(true);
        expect(output).toMatch(/TBC Root:.*\(valid\)/);


        // Check for section headers
        expect(output).toContain("Application Info");
        expect(output).toContain("TBC Info");
        expect(output).toContain("System Info");
        expect(output).toContain("OS and Shell Info");

        // Check for specific expected data points
        expect(output).toContain("TBC CLI:");
        expect(output).toContain("Node.js Version:");
        expect(output).toContain("Platform:");

        // Note: Currently reporting (invalid) - we should investigate why, 
        // but for now we assert the directory is at least identified.
        expect(output).toContain(TBC_ROOT);
    });

    test("should probe sanely when run in a non-TBC directory (SANDBOX)", () => {
        const { output, success } = runMonorepoCommand(SANDBOX, CLI_TARGET, [
            "int", "probe",
            "--root", SANDBOX
        ]);

        // The CLI should still return success because the probe finished its diagnostic
        expect(success).toBe(true);

        // Should show the system degradation in the validation audit
        expect(output).toContain("DEGRADED");
        expect(output).toContain("Essential record \"root.md\" is missing");
        expect(output).toMatch(/TBC Root:.*\(invalid\)/);

        // BUT it should still give us the host-level info
        expect(output).toContain("System Info");
        expect(output).toContain("User:");
        expect(output).toContain("OS and Shell Info");

        // Verify it correctly identified the sandbox as invalid
        expect(output).toContain("(invalid)");
    });

});