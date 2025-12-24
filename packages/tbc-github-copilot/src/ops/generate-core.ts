import { HAMINode } from "@hami-frameworx/core";

import type { TBCGitHubCopilotStorage } from "../types.js";

type GenerateCoreInput = {
    companionName: string;
    roleDefinition: string;
};

type GenerateCoreOutput = Record<string, any>[];

export class GenerateCoreNode extends HAMINode<TBCGitHubCopilotStorage> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-github-copilot:generate-core";
    }

    async prep(shared: TBCGitHubCopilotStorage): Promise<GenerateCoreInput> {
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
        const companionSlug = companionName.toLowerCase();

        // Return as records array for store-records
        const records = [
            {
                id: `github-copilot-agent-${companionSlug}`,
                filename: `.github/agents/${companionSlug}.agent.md`,
                contentType: "markdown",
                content: roleDefinition,
                frontmatter: {
                    description: `This custom agent personifies ${companionName}, the AI Assistant in the Third Brain Companion system. It always begins by reading the root definitions and specifications to align with its identity and motivations.`,
                    tools: ['execute', 'read', 'edit', 'search'],
                },
            },
        ];

        return records;
    }

    async post(shared: TBCGitHubCopilotStorage, _prepRes: GenerateCoreInput, execRes: GenerateCoreOutput): Promise<string | undefined> {
        shared.records = execRes;
        return "default";
    }
}