import { HAMINode } from "@hami-frameworx/core";

import { TBCRecordFSStorage } from "../types.js";

type ResolveNodeInput = {
    root?: string;
};

type ResolveNodeOutput = string; // rootDirectory

export class ResolveNode extends HAMINode<TBCRecordFSStorage> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-record-fs:resolve";
    }

    async prep(
        shared: TBCRecordFSStorage,
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
        shared: TBCRecordFSStorage,
        _prepRes: ResolveNodeInput,
        execRes: ResolveNodeOutput,
    ): Promise<string | undefined> {
        shared.rootDirectory = execRes;
        return "default";
    }
}