import { HAMINode } from "@hami-frameworx/core";

import { TBCGeminiStorage } from "../types.js";

type GenerateCoreInput = {
    companionName: string;
    roleDefinition: string;
};

type GenerateCoreOutput = Record<string, any>[];

export class GenerateCoreNode extends HAMINode<TBCGeminiStorage> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-gemini:generate-core";
    }

    async prep(shared: TBCGeminiStorage): Promise<GenerateCoreInput> {
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
                id: "gemini-config",
                filename: ".gemini/GEMINI.md",
                contentType: "text",
                content: roleDefinition,
            },
        ];

        return records;
    }

    async post(shared: TBCGeminiStorage, _prepRes: GenerateCoreInput, execRes: GenerateCoreOutput): Promise<string | undefined> {
        shared.records = execRes;
        return "default";
    }
}