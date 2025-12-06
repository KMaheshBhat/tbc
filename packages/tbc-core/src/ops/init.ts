import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { HAMINode } from "@hami-frameworx/core";

import { TBCCoreStorage } from "../types.js";

type InitNodeOutput = string[];

export class InitNode extends HAMINode<TBCCoreStorage> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-core:init";
    }

    async prep(
        shared: TBCCoreStorage,
    ): Promise<TBCCoreStorage> {
        // Ensure rootDirectory is set
        if (!shared.rootDirectory) {
            throw new Error("rootDirectory is required for init operation");
        }
        return shared;
    }

    async exec(
        shared: TBCCoreStorage,
    ): Promise<InitNodeOutput> {
        const rootDir = shared.rootDirectory!;
        const results: string[] = [];

        // Create TBC directory structure
        const dirs = ["tbc", "vault", "dex"];

        for (const dir of dirs) {
            const dirPath = join(rootDir, dir);
            try {
                await mkdir(dirPath, { recursive: true });
                results.push(`Created directory: ${dirPath}`);
            } catch (error) {
                if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
                    throw error;
                }
                results.push(`Directory already exists: ${dirPath}`);
            }
        }

        return results;
    }

    async post(
        shared: TBCCoreStorage,
        _prepRes: void,
        execRes: InitNodeOutput,
    ): Promise<string | undefined> {
        shared.initResults = execRes;
        return "default";
    }
}