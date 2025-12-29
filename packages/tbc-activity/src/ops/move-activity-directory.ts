import { mkdir, rename } from 'fs/promises';
import { join } from 'path';

import { HAMINode } from "@hami-frameworx/core";

import { TBCActivityStorage } from "../types.js";

export class MoveActivityDirectoryNode extends HAMINode<TBCActivityStorage> {
    kind(): string {
        return "tbc-activity:move-activity-directory";
    }

    async prep(shared: TBCActivityStorage): Promise<{ rootDir: string; activityId: string; sourceState?: string; targetState: string }> {
        const rootDir = shared.rootDirectory || process.cwd();
        const activityId = shared.activityId!;
        const sourceState = shared.activityState; // if set, move from there
        const targetState = shared.opts?.targetState || 'current'; // default to current, but should be set
        if (!activityId) {
            throw new Error("Activity ID is required for directory move");
        }
        return { rootDir, activityId, sourceState, targetState };
    }

    async exec(prepRes: { rootDir: string; activityId: string; sourceState?: string; targetState: string }): Promise<void> {
        const { rootDir, activityId, sourceState, targetState } = prepRes;
        const targetPath = join(rootDir, 'act', targetState, activityId);

        if (sourceState) {
            // Move from source to target
            const sourcePath = join(rootDir, 'act', sourceState, activityId);
            // Ensure target parent directory exists
            const targetParent = join(rootDir, 'act', targetState);
            await mkdir(targetParent, { recursive: true });
            await rename(sourcePath, targetPath);
        } else {
            // Create new directory
            await mkdir(targetPath, { recursive: true });
        }
    }

    async post(shared: TBCActivityStorage, _prepRes: { rootDir: string; activityId: string; sourceState?: string; targetState: string }, _execRes: void): Promise<string | undefined> {
        // Update state to target
        shared.activityState = _prepRes.targetState as any;
        return "default";
    }
}