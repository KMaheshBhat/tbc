import { cp } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { HAMINode } from "@hami-frameworx/core";

import { TBCCoreStorage } from "../types.js";

type BackupTbcNodeOutput = {
    backedUp: boolean;
    backupPath?: string;
};

export class BackupTbcNode extends HAMINode<TBCCoreStorage> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-core:backup-tbc";
    }

    async prep(
        shared: TBCCoreStorage,
    ): Promise<TBCCoreStorage> {
        // Ensure rootDirectory is set
        if (!shared.rootDirectory) {
            throw new Error("rootDirectory is required for backup-tbc operation");
        }
        return shared;
    }

    async exec(
        shared: TBCCoreStorage,
    ): Promise<BackupTbcNodeOutput> {
        const rootDir = shared.rootDirectory!;
        const tbcPath = join(rootDir, 'tbc');

        // Create timestamped backup directory
        const timestamp = new Date().toISOString().replace(/[:.]/g, '').replace('T', '').slice(0, 14);
        const backupPath = join(rootDir, `tbc-${timestamp}`);

        if (existsSync(tbcPath)) {
            await cp(tbcPath, backupPath, { recursive: true });
            return { backedUp: true, backupPath };
        }
        return { backedUp: false };
    }

    async post(
        shared: TBCCoreStorage,
        _prepRes: void,
        execRes: BackupTbcNodeOutput,
    ): Promise<string | undefined> {
        shared.backupTbcResults = execRes;
        return "default";
    }
}