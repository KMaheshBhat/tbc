import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { HAMINode } from "@hami-frameworx/core";

import { Shared } from "../types.js";

type NodeOutput = string[];

export class InitNode extends HAMINode<Shared> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-system:init";
    }

    async prep(
        shared: Shared,
    ): Promise<Shared> {
        // Ensure rootDirectory is set
        if (!shared.rootDirectory) {
            throw new Error("rootDirectory is required for init operation");
        }
        return shared;
    }

    async exec(
        input: Shared,
    ): Promise<NodeOutput> {
        const rootDir = input.rootDirectory!;
        const results: string[] = [];

        // Create TBC directory structure
        const dirs = ["sys", "mem", "dex"];

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
        shared: Shared,
        _prepRes: void,
        execRes: NodeOutput,
    ): Promise<string | undefined> {
        shared.initResults = execRes;
        return "default";
    }
}