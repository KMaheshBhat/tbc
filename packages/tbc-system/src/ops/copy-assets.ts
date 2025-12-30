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
        return "tbc-system:copy-assets";
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

        // Copy specs from assets/sys/core/ to sys/core/
        const specsCoreSource = join(assetsPath, "sys", "core");
        const specsCoreTarget = join(rootDir, "sys", "core");
        try {
            await cp(specsCoreSource, specsCoreTarget, { recursive: true });
            results.push(`Copied specs from ${specsCoreSource} to ${specsCoreTarget}`);
        } catch (error) {
            throw new Error(`Failed to copy specs: ${(error as Error).message}`);
        }

        // Copy tools from assets/sys/ext/ to sys/ext/
        const specsExtSource = join(assetsPath, "sys", "ext");
        const specsExtTarget = join(rootDir, "sys", "ext");
        try {
            await cp(specsExtSource, specsExtTarget, { recursive: true });
            results.push(`Copied tools from ${specsExtSource} to ${specsExtTarget}`);
        } catch (error) {
            throw new Error(`Failed to copy tools: ${(error as Error).message}`);
        }

        // Copy skills from assets/skills/core/ to skills/core/
        const skillsCoreSource = join(assetsPath, "skills", "core");
        const skillsCoreTarget = join(rootDir, "skills", "core");
        try {
            await cp(skillsCoreSource, skillsCoreTarget, { recursive: true });
            results.push(`Copied specs from ${skillsCoreSource} to ${skillsCoreTarget}`);
        } catch (error) {
            throw new Error(`Failed to copy specs: ${(error as Error).message}`);
        }

        // Copy tools from assets/skills/ext/ to skills/ext/
        const skillsExtSource = join(assetsPath, "sys", "ext");
        const skillsExtTarget = join(rootDir, "sys", "ext");
        try {
            await cp(skillsExtSource, skillsExtTarget, { recursive: true });
            results.push(`Copied tools from ${skillsExtSource} to ${skillsExtTarget}`);
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