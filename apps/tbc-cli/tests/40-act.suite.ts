import { describe, expect, test } from "bun:test";
import {
    TBC_ROOT,
    CLI_TARGET,
    runMonorepoCommand,
    getRecordFromDisk,
    UUID_SEARCH_REGEX
} from "./test-helper";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

describe("🐵 LETS-GO: tbc act", () => {
    let activeUuid: string = "";

    test("should start a new activity in 'current' directory", () => {
        const { output, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            "act", "start",
            "--root", TBC_ROOT
        ]);

        expect(success).toBe(true);
        expect(output).toContain("Activity started");

        const lines = output.split('\n');
        const successLine = lines.find(l => l.includes("Activity started"));
        const match = successLine?.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);

        activeUuid = match ? match[0] : "";
        expect(activeUuid).not.toBe("");

        // Verify directory existence
        const currentPath = path.join(TBC_ROOT, "act", "current", activeUuid);
        expect(existsSync(currentPath)).toBe(true);

        // Verify the initial context record exists
        const contextFile = path.join(currentPath, `${activeUuid}.md`);
        expect(existsSync(contextFile)).toBe(true);
    });

    test("should start a new activity using an externally minted UUID", () => {
        // 1. Generate a UUID externally
        const genResult = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            "gen", "uuid", "--root", TBC_ROOT
        ]);
        expect(genResult.success).toBe(true);
        console.log(genResult.output);

        // 2. Extract specifically from the gen output (usually the last line or containing info)
        const uuidMatch = genResult.output.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
        const externalUuid = uuidMatch ? uuidMatch[0] : "";
        expect(externalUuid).not.toBe("");

        // 3. Pass that UUID to act start
        const { output, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            "act", "start", externalUuid, "--root", TBC_ROOT
        ]);
        console.log(output);

        expect(success).toBe(true);
        expect(output).not.toContain("No activityID provided");
        expect(output).toContain("Activity started");
        expect(output).toContain(externalUuid);

        // 4. Persistence Verification
        const contextFile = path.join(TBC_ROOT, "act", "current", externalUuid, `${externalUuid}.md`);
        expect(existsSync(contextFile)).toBe(true);
        const content = readFileSync(contextFile, 'utf-8');
        expect(content).toContain("Activity Log");
        expect(content).toContain(externalUuid);
    });

    /*

    test("should show active activities in the 'show' command", () => {
        const { output, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            "act", "show", "--root", TBC_ROOT
        ]);

        expect(success).toBe(true);
        expect(output).toContain("Refactor Activity Layer");
        expect(output).toContain(activeUuid);
        expect(output).toContain("[current]");
    });

    test("should pause an activity (move from current to backlog)", () => {
        const { output, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            "act", "pause", activeUuid, "--root", TBC_ROOT
        ]);

        expect(success).toBe(true);
        
        const currentPath = path.join(TBC_ROOT, "act", "current", activeUuid);
        const backlogPath = path.join(TBC_ROOT, "act", "backlog", activeUuid);
        
        expect(existsSync(currentPath)).toBe(false);
        expect(existsSync(backlogPath)).toBe(true);
    });

    test("should resume an activity (move from backlog to current)", () => {
        // 'start' with an existing UUID acts as resume
        const { success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            "act", "start", activeUuid, "--root", TBC_ROOT
        ]);

        expect(success).toBe(true);
        
        const currentPath = path.join(TBC_ROOT, "act", "current", activeUuid);
        expect(existsSync(currentPath)).toBe(true);
    });

    test("should close and assimilate activity (move to archive and promote to mem/)", () => {
        const { output, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            "act", "close", activeUuid, "--root", TBC_ROOT
        ]);

        expect(success).toBe(true);
        
        // 1. Check folder moved to archive
        const archivePath = path.join(TBC_ROOT, "act", "archive", activeUuid);
        expect(existsSync(archivePath)).toBe(true);
        
        // 2. The 'Assimilator' check: Verify the record now exists in permanent memory
        // This confirms the use of tbc-write:write-flow during closure
        const memRecordPath = path.join(TBC_ROOT, "mem", `${activeUuid}.md`);
        expect(existsSync(memRecordPath)).toBe(true);
    });
    */
});
