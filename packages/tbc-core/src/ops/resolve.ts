import { HAMINode } from "@hami-frameworx/core";

import { TBCCoreStorage } from "../types.js";

type ResolveNodeInput = {
    root?: string;
};

type ResolveNodeOutput = string; // rootDirectory

export class ResolveNode extends HAMINode<TBCCoreStorage> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-core:resolve";
    }

    async prep(
        shared: TBCCoreStorage,
    ): Promise<ResolveNodeInput> {
        return {
            root: shared.root,
        };
    }

    async exec(
        params: ResolveNodeInput,
    ): Promise<ResolveNodeOutput> {
        // Use explicit root if provided, otherwise default to CWD
        const workingDir = params.root || process.cwd();
        return workingDir;
    }

    async post(
        shared: TBCCoreStorage,
        _prepRes: ResolveNodeInput,
        execRes: ResolveNodeOutput,
    ): Promise<string | undefined> {
        shared.rootDirectory = execRes;
        return "default";
    }
}