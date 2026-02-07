import { unlink } from 'fs/promises';
import { readdirSync } from 'fs';
import { join } from 'path';

import { HAMINode } from "@hami-frameworx/core";

import { Shared } from "../types.js";

export class RemoveActivityRecordsNode extends HAMINode<Shared> {
    kind(): string {
        return "tbc-activity:remove-activity-records";
    }

    async prep(shared: Shared): Promise<{ rootDir: string; activityId: string }> {
        const rootDir = shared.rootDirectory || process.cwd();
        const activityId = shared.activityId!;
        if (!activityId) {
            throw new Error("Activity ID is required for record removal");
        }
        return { rootDir, activityId };
    }

    async exec(prepRes: { rootDir: string; activityId: string }): Promise<void> {
        const { rootDir, activityId } = prepRes;
        const activityDir = join(rootDir, 'act', 'current', activityId);

        try {
            const files = readdirSync(activityDir);
            // UUID v7 regex pattern: matches standard UUID format
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.md$/i;

            for (const file of files) {
                if (uuidRegex.test(file)) {
                    const filePath = join(activityDir, file);
                    await unlink(filePath);
                }
            }
        } catch (error: any) {
            if (error.code !== 'ENOENT') {
                throw new Error(`Failed to remove activity records: ${error.message}`);
            }
            // Directory doesn't exist, nothing to remove
        }
    }

    async post(_shared: Shared, _prepRes: { rootDir: string; activityId: string }, _execRes: void): Promise<string | undefined> {
        return "default";
    }
}