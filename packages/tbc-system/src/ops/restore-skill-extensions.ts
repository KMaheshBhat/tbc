import { cp, rm, readdir } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { HAMINode } from "@hami-frameworx/core";

import { TBCCoreStorage } from "../types.js";

type RestoreSkillExtensionsNodeOutput = {
    restored: boolean;
    message?: string;
};

export class RestoreSkillExtensionsNode extends HAMINode<TBCCoreStorage> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-system:restore-skill-extensions";
    }

    async prep(
        shared: TBCCoreStorage,
    ): Promise<{ rootDirectory: string; backupDirs: string[] }> {
        // Ensure rootDirectory is set
        if (!shared.rootDirectory) {
            throw new Error("rootDirectory is required for restore-skill-extensions operation");
        }

        const rootDirectory = shared.rootDirectory;
        // Find the most recent skills backup directory
        const backupPattern = /^skills-\d{14}$/;
        const items = await readdir(rootDirectory);
        const backupDirs = items
            .filter(item => backupPattern.test(item))
            .sort()
            .reverse(); // Most recent first

        return { rootDirectory, backupDirs };
    }

    async exec(
        prepRes: { rootDirectory: string; backupDirs: string[] },
    ): Promise<RestoreSkillExtensionsNodeOutput> {
        const { rootDirectory, backupDirs } = prepRes;

        if (backupDirs.length === 0) {
            return { restored: false, message: 'No backup directory found' };
        }

        const backupDir = backupDirs[0];
        const backupPath = join(rootDirectory, backupDir);
        const extensionsBackupPath = join(backupPath, 'ext');
        const extensionsTargetPath = join(rootDirectory, 'skills', 'ext');

        if (existsSync(extensionsBackupPath)) {
            await cp(extensionsBackupPath, extensionsTargetPath, { recursive: true });
            // Clean up backup
            await rm(backupPath, { recursive: true, force: true });
            return { restored: true };
        } else {
            // Clean up backup even if no extensions
            await rm(backupPath, { recursive: true, force: true });
            return { restored: false, message: 'No skill extensions to restore' };
        }
    }

    async post(
        shared: TBCCoreStorage,
        _prepRes: { rootDirectory: string; backupDirs: string[] },
        execRes: RestoreSkillExtensionsNodeOutput,
    ): Promise<string | undefined> {
        shared.restoreSkillExtensionsResults = execRes;
        return "default";
    }
}