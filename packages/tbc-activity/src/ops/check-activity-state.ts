import { access } from 'fs/promises';
import { join } from 'path';

import { HAMINode } from "@hami-frameworx/core";

import { TBCActivityStorage } from "../types.js";

export class CheckActivityStateNode extends HAMINode<TBCActivityStorage> {
    kind(): string {
        return "tbc-activity:check-activity-state";
    }

    async prep(shared: TBCActivityStorage): Promise<{ rootDir: string; activityId: string }> {
        const rootDir = shared.rootDirectory || process.cwd();
        const activityId = shared.activityId!;
        if (!activityId) {
            throw new Error("Activity ID is required for state check");
        }
        return { rootDir, activityId };
    }

    async exec(prepRes: { rootDir: string; activityId: string }): Promise<'backlog' | 'current' | 'archive' | 'none'> {
        const { rootDir, activityId } = prepRes;
        const states: ('backlog' | 'current' | 'archive')[] = ['backlog', 'current', 'archive'];

        for (const state of states) {
            const path = join(rootDir, 'act', state, activityId);
            try {
                await access(path);
                return state;
            } catch {
                // Continue
            }
        }
        return 'none';
    }

    async post(shared: TBCActivityStorage, _prepRes: { rootDir: string; activityId: string }, execRes: 'backlog' | 'current' | 'archive' | 'none'): Promise<string | undefined> {
        shared.activityState = execRes === 'none' ? undefined : execRes;
        return "default";
    }
}