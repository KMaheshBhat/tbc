import { HAMINode } from "@hami-frameworx/core";

import { TBCGooseStorage } from "../types.js";

type GenerateCoreInput = {
    companionName: string;
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
        return {
            companionName: shared.companionName,
        };
    }

    async exec(params: GenerateCoreInput): Promise<GenerateCoreOutput> {
        const companionName = params.companionName;

        // Generate the Goose hints configuration
        const roleDefinition = `At the start of an iteration, ALWAYS read @tbc/root.md file at the root of the repository, and follow all specifications from it recursively until you have read and understood. ALWAYS read top level @dex/core.md and @dex/extensions.md when available or execute the script to generate it. For the interaction, you will act as ${companionName}`;

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