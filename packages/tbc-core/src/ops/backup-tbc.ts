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
        const timestamp = getStableTimestamp();
        const backupPath = join(rootDir, `${timestamp}-tbc`);

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

function getStableTimestamp(): string {
    const date = new Date();
    
    // We specify UTC to avoid relying on the local system's timezone.
    // This gives predictable, consistent output regardless of where the script runs.
    const formatter = new Intl.DateTimeFormat('en', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
        timeZone: 'UTC' // Critical for consistency
    });

    // Output: 12/14/2025, 12:49:18 AM (Example)
    const parts = formatter.formatToParts(date);
    
    // Extract parts and assemble: YYYYMMDDHHmmSS
    const year = parts.find(p => p.type === 'year')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;
    const hour = parts.find(p => p.type === 'hour')?.value;
    const minute = parts.find(p => p.type === 'minute')?.value;
    const second = parts.find(p => p.type === 'second')?.value;

    return `${year}${month}${day}${hour}${minute}${second}`;
}