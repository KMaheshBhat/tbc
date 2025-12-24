import { HAMINode } from "@hami-frameworx/core";

import { TBCCoreStorage } from "../types.js";

type GenerateRoleDefinitionInput = {
    companionName: string;
};

type GenerateRoleDefinitionOutput = string;

export class GenerateRoleDefinitionNode extends HAMINode<TBCCoreStorage> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-core:generate-role-definition";
    }

    async prep(shared: TBCCoreStorage): Promise<GenerateRoleDefinitionInput> {
        if (!shared.companionName) {
            throw new Error("companionName is required in shared state");
        }
        return {
            companionName: shared.companionName,
        };
    }

    async exec(params: GenerateRoleDefinitionInput): Promise<GenerateRoleDefinitionOutput> {
        const companionName = params.companionName;

        // Generate the standard TBC role definition
        const roleDefinition = `At the start of an iteraction, ALWAYS read @tbc/root.md file at the root of the repository, and follow all specifications from it recursively until you have read and understood. ALWAYS read top level @dex/core.md and @dex/extensions.md when available or execute the script to generate it. For the interaction, you will act as ${companionName}`;

        return roleDefinition;
    }

    async post(shared: TBCCoreStorage, _prepRes: GenerateRoleDefinitionInput, execRes: GenerateRoleDefinitionOutput): Promise<string | undefined> {
        shared.roleDefinition = execRes;
        return "default";
    }
}