import { cp, rm, readdir } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { HAMINode } from "@hami-frameworx/core";

import { TBCCoreStorage } from "../types.js";

type RestoreExtensionsNodeOutput = {
    restored: boolean;
    message?: string;
};

export class RestoreExtensionsNode extends HAMINode<TBCCoreStorage> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-core:restore-extensions";
    }

    async prep(
        shared: TBCCoreStorage,
    ): Promise<{ rootDirectory: string; backupDirs: string[] }> {
        // Ensure rootDirectory is set
        if (!shared.rootDirectory) {
            throw new Error("rootDirectory is required for restore-extensions operation");
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
    ): Promise<RestoreExtensionsNodeOutput> {
        const { rootDirectory, backupDirs } = prepRes;

        if (backupDirs.length === 0) {
            return { restored: false, message: 'No backup directory found' };
        }

        const backupDir = backupDirs[0];
        const backupPath = join(rootDirectory, backupDir);
        const extensionsBackupPath = join(backupPath, 'extensions');
        const extensionsTargetPath = join(rootDirectory, 'tbc', 'extensions');

        if (existsSync(extensionsBackupPath)) {
            await cp(extensionsBackupPath, extensionsTargetPath, { recursive: true });
            // Clean up backup
            await rm(backupPath, { recursive: true, force: true });
            return { restored: true };
        } else {
            // Clean up backup even if no extensions
            await rm(backupPath, { recursive: true, force: true });
            return { restored: false, message: 'No extensions to restore' };
        }
    }

    async post(
        shared: TBCCoreStorage,
        _prepRes: { rootDirectory: string; backupDirs: string[] },
        execRes: RestoreExtensionsNodeOutput,
    ): Promise<string | undefined> {
        shared.restoreExtensionsResults = execRes;
        return "default";
    }
}