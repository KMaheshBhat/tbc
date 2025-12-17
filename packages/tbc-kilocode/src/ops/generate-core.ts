import { HAMINode } from "@hami-frameworx/core";

import { TBCKilocodeStorage } from "../types.js";

type GenerateCoreInput = {
    companionName: string;
};

type GenerateCoreOutput = Record<string, any>[];

export class GenerateCoreNode extends HAMINode<TBCKilocodeStorage> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-kilocode:generate-core";
    }

    async prep(shared: TBCKilocodeStorage): Promise<GenerateCoreInput> {
        if (!shared.companionName) {
            throw new Error("companionName is required in shared state");
        }
        return {
            companionName: shared.companionName,
        };
    }

    async exec(params: GenerateCoreInput): Promise<GenerateCoreOutput> {
        const companionName = params.companionName;

        // Generate the Kilo Code modes configuration
        const kilocodeModes = {
            customModes: [
                {
                    slug: companionName.toLowerCase(),
                    name: companionName,
                    roleDefinition: `At the start of an iteration, ALWAYS read @tbc/root.md file at the root of the repository, and follow all specifications from it recursively until you have read and understood. ALWAYS read top level @dex/core.md and @dex/extensions.md when available or execute the script to generate it. For the interaction, you will act as ${companionName}`,
                    groups: ['read', 'edit', 'browser', 'command', 'mcp'],
                    source: 'project',
                },
            ],
        };

        // Return as records array for store-records
        const records = [
            {
                id: "kilocode-modes",
                filename: ".kilocodemodes",
                contentType: "yaml",
                content: kilocodeModes,
            },
        ];

        return records;
    }

    async post(shared: TBCKilocodeStorage, _prepRes: GenerateCoreInput, execRes: GenerateCoreOutput): Promise<string | undefined> {
        shared.records = execRes;
        return "default";
    }
}