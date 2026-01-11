import { cp } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { HAMINode } from "@hami-frameworx/core";

import { Shared } from "../types.js";

type BackupSysNodeOutput = {
    backedUp: boolean;
    backupPath?: string;
};

export class BackupSysNode extends HAMINode<Shared> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-system:backup-sys";
    }

    async prep(
        shared: Shared,
    ): Promise<Shared> {
        // Ensure rootDirectory is set
        if (!shared.rootDirectory) {
            throw new Error("rootDirectory is required for backup-sys operation");
        }
        return shared;
    }

    async exec(
        shared: Shared,
    ): Promise<BackupSysNodeOutput> {
        const rootDir = shared.rootDirectory!;
        const sysPath = join(rootDir, 'sys');

        // Create timestamped backup directory
        const timestamp = getStableTimestamp();
        const backupPath = join(rootDir, `${timestamp}-sys`);

        if (existsSync(sysPath)) {
            await cp(sysPath, backupPath, { recursive: true });
            return { backedUp: true, backupPath };
        }
        return { backedUp: false };
    }

    async post(
        shared: Shared,
        _prepRes: void,
        execRes: BackupSysNodeOutput,
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