import { HAMINode } from "@hami-frameworx/core";

import { TBCGooseStorage } from "../types.js";

type GenerateCoreInput = {
    companionName: string;
    roleDefinition: string;
};

type GenerateCoreOutput = Record<string, any>[];

export class GenerateCoreNode extends HAMINode<TBCGooseStorage> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-goose:generate-core";
    }

    async prep(shared: TBCGooseStorage): Promise<GenerateCoreInput> {
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

    async exec(params: GenerateCoreInput): Promise<GenerateCoreOutput> {
        const companionName = params.companionName;
        const roleDefinition = params.roleDefinition;

        // Return as records array for store-records
        const records = [
            {
                id: "goose-hints",
                filename: ".goosehints",
                contentType: "text",
                content: roleDefinition,
            },
        ];

        return records;
    }

    async post(shared: TBCGooseStorage, _prepRes: GenerateCoreInput, execRes: GenerateCoreOutput): Promise<string | undefined> {
        shared.records = execRes;
        return "default";
    }
}