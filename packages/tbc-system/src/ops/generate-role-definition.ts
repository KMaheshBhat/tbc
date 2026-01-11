import { HAMINode } from "@hami-frameworx/core";

import { Shared } from "../types.js";

type NodeInput = {
    companionName: string;
};

type NodeOutput = string;

export class GenerateRoleDefinitionNode extends HAMINode<Shared> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-system:generate-role-definition";
    }

    async prep(shared: Shared): Promise<NodeInput> {
        if (!shared.companionName) {
            throw new Error("companionName is required in shared state");
        }
        return {
            companionName: shared.companionName,
        };
    }

    async exec(params: NodeInput): Promise<NodeOutput> {
        const companionName = params.companionName;

        // Generate the standard TBC role definition
        const roleDefinition = `At the start of an iteraction, ALWAYS read @tbc/root.md file at the root of the repository, and follow all specifications from it recursively until you have read and understood. ALWAYS READ FULLY: @dex/core.md @dex/extensions.md @dex/skills.md when available or execute the script to generate it. For the interaction, you will act as ${companionName}`;

        return roleDefinition;
    }

    async post(shared: Shared, _prepRes: NodeInput, execRes: NodeOutput): Promise<string | undefined> {
        shared.roleDefinition = execRes;
        return "default";
    }
}