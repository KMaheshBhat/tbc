import { HAMINode } from "@hami-frameworx/core";

import { TBCInterfaceStorage } from "../types.js";

type GenerateGenericCoreInput = {
    companionName: string;
    roleDefinition: string;
};

type GenerateGenericCoreOutput = Record<string, any>[];

export class GenerateGenericCoreNode extends HAMINode<TBCInterfaceStorage> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-interface:generate-generic-core";
    }

    async prep(shared: TBCInterfaceStorage): Promise<GenerateGenericCoreInput> {
        if (!shared.companionName) {
            throw new Error("companionName is required in shared state");
        }
        if (!shared.roleDefinition) {
            throw new Error("roleDefinition is required in shared state");
        }
        return {
            companionName: shared.companionName,
            roleDefinition: shared.roleDefinition,
        };
    }

    async exec(params: GenerateGenericCoreInput): Promise<GenerateGenericCoreOutput> {
        const companionName = params.companionName;
        const roleDefinition = params.roleDefinition;

        // Return as records array for store-records
        const records = [
            {
                id: "generic-agents",
                filename: "AGENTS.md",
                contentType: "text",
                content: roleDefinition,
            },
        ];

        return records;
    }

    async post(shared: TBCInterfaceStorage, _prepRes: GenerateGenericCoreInput, execRes: GenerateGenericCoreOutput): Promise<string | undefined> {
        shared.records = execRes;
        return "default";
    }
}