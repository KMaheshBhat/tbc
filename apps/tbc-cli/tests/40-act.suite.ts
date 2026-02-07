import { describe, expect, test } from "bun:test";
import {
    TBC_ROOT,
    CLI_TARGET,
    runMonorepoCommand,
    getRecordFromDisk,
    UUID_SEARCH_REGEX
} from "./test-helper";
import * as fs from 'node:fs';
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

describe("🐵 LETS-GO: tbc act", () => {
    let activity1ID: string = "";
    let activity2ID: string = "";

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

        activity1ID = match ? match[0] : "";
        expect(activity1ID).not.toBe("");

        // Verify directory existence
        const currentPath = path.join(TBC_ROOT, "act", "current", activity1ID);
        expect(existsSync(currentPath)).toBe(true);

        // Verify the initial context record exists
        const contextFile = path.join(currentPath, `${activity1ID}.md`);
        expect(existsSync(contextFile)).toBe(true);
    });

    test("should start a new activity using an externally minted UUID", () => {
        // 1. Generate a UUID externally
        const genResult = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            "gen", "uuid", "--root", TBC_ROOT
        ]);
        expect(genResult.success).toBe(true);

        // 2. Extract specifically from the gen output (usually the last line or containing info)
        const uuidMatch = genResult.output.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
        const externalUuid = uuidMatch ? uuidMatch[0] : "";
        expect(externalUuid).not.toBe("");
        activity2ID = externalUuid;

        // 3. Pass that UUID to act start
        const { output, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            "act", "start", externalUuid, "--root", TBC_ROOT
        ]);

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

    test("should show active activities in the 'show' command", () => {
        const { output, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            "act", "show", "--root", TBC_ROOT
        ]);

        expect(success).toBe(true);

        // 1. Verify the Section Header is present
        expect(output).toContain("Active [current]");

        // 2. Verify the IDs are present in the 'Suggestion'/Found lines
        // We expect them to appear in the path: act/current:ID/ID.md
        expect(output).toContain(activity1ID);
        expect(output).toContain(activity2ID);

        // 3. Match the title pattern (either timestamped or custom)
        // Since we know they currently look like "Activity Log 2026...", 
        // we match the prefix.
        expect(output).toMatch(/Activity Log \d{4}-\d{2}-\d{2}/);

        // 4. Verify the Suggestion formatting is working
        expect(output).toContain("Suggestion: Found at act/current");
    });

    test("should show active activities without clutter from artifacts", () => {
        // --- SETUP: Add Artifact Clutter ---
        const activity1Dir = path.join(TBC_ROOT, "act/current", activity1ID);

        // Create a "log" artifact and a "json" artifact
        fs.writeFileSync(path.join(activity1Dir, "research-notes.md"), "# Research\nSome notes.");
        fs.writeFileSync(path.join(activity1Dir, "data-dump.json"), '{"key": "value"}');

        // --- EXECUTION ---
        const { output, success } = runMonorepoCommand(TBC_ROOT, CLI_TARGET, [
            "act", "show", "--root", TBC_ROOT
        ]);

        console.log(output);

        expect(success).toBe(true);

        // --- ASSERTIONS ---

        // This should still pass
        expect(output).toContain("Active [current]");

        // We count occurrences of the UUIDs. 
        // We expect EXACTLY 2 per activity because we only want to see the root record.
        const activity1Matches = (output.match(new RegExp(activity1ID, "g")) || []).length;
        const activity2Matches = (output.match(new RegExp(activity2ID, "g")) || []).length;

        expect(activity1Matches).toBe(2);
        expect(activity2Matches).toBe(2);

        // Ensure artifact titles ARE NOT in the output
        expect(output).not.toContain("research-notes");
        expect(output).not.toContain("data-dump");
    });

    /*

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
