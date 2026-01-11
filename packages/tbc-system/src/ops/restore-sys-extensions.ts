import { cp, rm, readdir } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { HAMINode } from "@hami-frameworx/core";

import { Shared } from "../types.js";

type NodeOutput = {
    restored: boolean;
    message?: string;
};

export class RestoreSysExtensionsNode extends HAMINode<Shared> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-system:restore-sys-extensions";
    }

    async prep(
        shared: Shared,
    ): Promise<{ rootDirectory: string; backupDirs: string[] }> {
        // Ensure rootDirectory is set
        if (!shared.rootDirectory) {
            throw new Error("rootDirectory is required for restore-sys-extensions operation");
        }

        const rootDirectory = shared.rootDirectory;
        // Find the most recent sys backup directory
        const backupPattern = /^sys-\d{14}$/;
        const items = await readdir(rootDirectory);
        const backupDirs = items
            .filter(item => backupPattern.test(item))
            .sort()
            .reverse(); // Most recent first

        return { rootDirectory, backupDirs };
    }

    async exec(
        prepRes: { rootDirectory: string; backupDirs: string[] },
    ): Promise<NodeOutput> {
        const { rootDirectory, backupDirs } = prepRes;

        if (backupDirs.length === 0) {
            return { restored: false, message: 'No backup directory found' };
        }

        const backupDir = backupDirs[0];
        const backupPath = join(rootDirectory, backupDir);
        const extensionsBackupPath = join(backupPath, 'ext');
        const extensionsTargetPath = join(rootDirectory, 'sys', 'ext');

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
        shared: Shared,
        _prepRes: { rootDirectory: string; backupDirs: string[] },
        execRes: NodeOutput,
    ): Promise<string | undefined> {
        shared.restoreSysExtensionsResults = execRes;
        return "default";
    }
}