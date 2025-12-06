import { HAMINode } from "@hami-frameworx/core";

import { TBCFSStorage } from "../types.js";

type ResolveNodeInput = {
    root?: string;
};

type ResolveNodeOutput = string; // rootDirectory

export class ResolveNode extends HAMINode<TBCFSStorage> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-fs:resolve";
    }

    async prep(
        shared: TBCFSStorage,
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
        shared: TBCFSStorage,
        _prepRes: ResolveNodeInput,
        execRes: ResolveNodeOutput,
    ): Promise<string | undefined> {
        shared.rootDirectory = execRes;
        return "default";
    }
}