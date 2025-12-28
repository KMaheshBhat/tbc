import { cp } from "node:fs/promises";
import { join } from "node:path";
import { HAMINode } from "@hami-frameworx/core";

import { TBCCoreStorage } from "../types.js";

type CopyAssetsNodeOutput = string[];

export class CopyAssetsNode extends HAMINode<TBCCoreStorage> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-core:copy-assets";
    }

    async prep(
        shared: TBCCoreStorage,
    ): Promise<TBCCoreStorage> {
        // Ensure required paths are set
        if (!shared.rootDirectory) {
            throw new Error("rootDirectory is required for copy-assets operation");
        }
        if (!shared.assetsPath) {
            throw new Error("assetsPath is required for copy-assets operation");
        }
        return shared;
    }

    async exec(
        shared: TBCCoreStorage,
    ): Promise<CopyAssetsNodeOutput> {
        const rootDir = shared.rootDirectory!;
        const assetsPath = shared.assetsPath!;
        const results: string[] = [];

        // Copy specs from assets/core/ to sys/core/
        const specsSource = join(assetsPath, "core");
        const specsTarget = join(rootDir, "sys", "core");
        try {
            await cp(specsSource, specsTarget, { recursive: true });
            results.push(`Copied specs from ${specsSource} to ${specsTarget}`);
        } catch (error) {
            throw new Error(`Failed to copy specs: ${(error as Error).message}`);
        }

        // Copy tools from assets/ext/ to sys/ext/
        const toolsSource = join(assetsPath, "ext");
        const toolsTarget = join(rootDir, "sys", "ext");
        try {
            await cp(toolsSource, toolsTarget, { recursive: true });
            results.push(`Copied tools from ${toolsSource} to ${toolsTarget}`);
        } catch (error) {
            throw new Error(`Failed to copy tools: ${(error as Error).message}`);
        }

        return results;
    }

    async post(
        shared: TBCCoreStorage,
        _prepRes: void,
        execRes: CopyAssetsNodeOutput,
    ): Promise<string | undefined> {
        shared.copyAssetsResults = execRes;
        return "default";
    }
}