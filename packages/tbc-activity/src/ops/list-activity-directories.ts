import { readdir } from 'fs/promises';
import { join } from 'path';

import { HAMINode } from "@hami-frameworx/core";

import { Shared } from "../types.js";

export class ListActivityDirectoriesNode extends HAMINode<Shared> {
    kind(): string {
        return "tbc-activity:list-activity-directories";
    }

    async prep(shared: Shared): Promise<{ rootDir: string }> {
        const rootDir = shared.rootDirectory || process.cwd();
        return { rootDir };
    }

    async exec(prepRes: { rootDir: string }): Promise<{ current: string[]; backlog: string[] }> {
        const { rootDir } = prepRes;
        const result = { current: [] as string[], backlog: [] as string[] };

        // List current activities
        try {
            const currentPath = join(rootDir, 'act', 'current');
            const currentDirs = await readdir(currentPath, { withFileTypes: true });
            result.current = currentDirs
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);
        } catch {
            // Directory doesn't exist or can't be read, leave empty
        }

        // List backlog activities
        try {
            const backlogPath = join(rootDir, 'act', 'backlog');
            const backlogDirs = await readdir(backlogPath, { withFileTypes: true });
            result.backlog = backlogDirs
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);
        } catch {
            // Directory doesn't exist or can't be read, leave empty
        }

        return result;
    }

    async post(shared: Shared, _prepRes: { rootDir: string }, execRes: { current: string[]; backlog: string[] }): Promise<string | undefined> {
        shared.currentActivities = execRes.current;
        shared.backlogActivities = execRes.backlog;
        return "default";
    }
}