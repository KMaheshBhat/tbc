import { HAMINode } from "@hami-frameworx/core";

import { Shared } from "../types.js";

type NodeInput = {
    rootDirectory?: string;
};

type NodeOutput = string;

export class ResolveRootDirectoryNode extends HAMINode<Shared> {
    kind(): string {
        return "tbc-system:resolve-root-directory";
    }

    async prep(
        shared: Shared,
    ): Promise<NodeInput> {
        return {
            rootDirectory: shared.stage.rootDirectory,
        };
    }

    async exec(
        input: NodeInput,
    ): Promise<NodeOutput> {
        return input.rootDirectory || process.cwd();
    }

    async post(
        shared: Shared,
        _input: NodeInput,
        output: NodeOutput,
    ): Promise<string | undefined> {
        shared.stage = shared.stage || {};
        shared.stage.rootDirectory = output;
        shared.system.rootDirectory = output;
        return "default";
    }
}