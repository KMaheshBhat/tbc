import { HAMINode } from "@hami-frameworx/core";

import { TBCMessage, Shared } from "../types.js";

type NodeInput = {
    verbose?: boolean;
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
            verbose: shared.stage.verbose,
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
        input: NodeInput,
        output: NodeOutput,
    ): Promise<string | undefined> {
        shared.stage = shared.stage || {};
        shared.stage.messages = shared.stage.messages || [];
        shared.stage.messages.push({
            level: input.verbose ? 'info' : 'debug',
            source: this.kind(),
            message: output,
        });
        shared.stage.rootDirectory = output;
        shared.system.rootDirectory = output;
        return "default";
    }
}