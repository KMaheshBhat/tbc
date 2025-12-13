import { cp, rm, readdir } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { HAMINode } from "@hami-frameworx/core";

import { TBCCoreStorage } from "../types.js";

type RestoreRootNodeOutput = {
    restored: boolean;
    message?: string;
};

export class RestoreRootNode extends HAMINode<TBCCoreStorage> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-core:restore-root";
    }

    async prep(
        shared: TBCCoreStorage,
    ): Promise<{ rootDirectory: string; backupDirs: string[] }> {
        // Ensure rootDirectory is set
        if (!shared.rootDirectory) {
            throw new Error("rootDirectory is required for restore-root operation");
        }

        const rootDirectory = shared.rootDirectory;
        // Find the most recent tbc backup directory
        const backupPattern = /^tbc-\d{14}$/;
        const items = await readdir(rootDirectory);
        const backupDirs = items
            .filter(item => backupPattern.test(item))
            .sort()
            .reverse(); // Most recent first

        return { rootDirectory, backupDirs };
    }

    async exec(
        prepRes: { rootDirectory: string; backupDirs: string[] },
    ): Promise<RestoreRootNodeOutput> {
        const { rootDirectory, backupDirs } = prepRes;

        if (backupDirs.length === 0) {
            return { restored: false, message: 'No backup directory found' };
        }

        const backupDir = backupDirs[0];
        const backupPath = join(rootDirectory, backupDir);
        const rootBackupPath = join(backupPath, 'root.md');
        const rootTargetPath = join(rootDirectory, 'tbc', 'root.md');

        if (existsSync(rootBackupPath)) {
            await cp(rootBackupPath, rootTargetPath);
            // Clean up backup
            await rm(backupPath, { recursive: true, force: true });
            return { restored: true };
        } else {
            // Clean up backup even if no root
            await rm(backupPath, { recursive: true, force: true });
            return { restored: false, message: 'No root.md to restore' };
        }
    }

    async post(
        shared: TBCCoreStorage,
        _prepRes: { rootDirectory: string; backupDirs: string[] },
        execRes: RestoreRootNodeOutput,
    ): Promise<string | undefined> {
        shared.restoreRootResults = execRes;
        return "default";
    }
}