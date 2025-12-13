import { HAMINode } from "@hami-frameworx/core";

import { TBCCoreStorage } from "../types.js";

type GenerateRootNodeOutput = any[];

export class GenerateRootNode extends HAMINode<TBCCoreStorage> {
    private companion?: string;
    private prime?: string;

    constructor(config?: { companion?: string; prime?: string }, maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
        this.companion = config?.companion;
        this.prime = config?.prime;
    }

    kind(): string {
        return "tbc-core:generate-root";
    }

    async prep(
        shared: TBCCoreStorage,
    ): Promise<{ rootDirectory: string; companion?: string; prime?: string; recordIds?: { companion: string; prime: string; memory: string } }> {
        // Ensure rootDirectory is set
        if (!shared.rootDirectory) {
            throw new Error("rootDirectory is required for generate-root operation");
        }

        // Use config values or fall back to shared state
        const companion = this.companion || shared.companion;
        const prime = this.prime || shared.prime;

        return {
            rootDirectory: shared.rootDirectory,
            companion,
            prime,
            recordIds: shared.recordIds,
        };
    }

    async exec(
        params: { rootDirectory: string; companion?: string; prime?: string; recordIds?: { companion: string; prime: string; memory: string } },
    ): Promise<GenerateRootNodeOutput> {
        const { companion, prime, recordIds } = params;

        // Helper function to convert to lower-snake-case
        const toLowerSnakeCase = (str: string) => str.toLowerCase().replace(/\s+/g, '_');

        let rootRecord: any;

        if (companion && prime && recordIds) {
            // Enhanced root record with references to generated records
            const companionTag = `c/agent/${toLowerSnakeCase(companion)}`;
            rootRecord = {
                id: "root",
                record_type: "root",
                record_tags: [companionTag],
                title: `${companion} Root`,
                contentType: "markdown",
                content: `# ${companion} Root

## Definitions

- Agent: [${companion}](/vault/${recordIds.companion}.md)
- Primer User: [${prime}](/vault/${recordIds.prime}.md)
- Specifications: [core](/dex/core.md)
  - use 'Refresh Core Index' method if not available

## Agent Identity

${companion} is the AI Assistant as per the Third Brain Companion System Definitions.

## Motivation

1. Assist the Prime User in their activities, engage in their interactions.
2. Evolve motivations with clarity to align with motivations of the Prime User.

## Memories

- [root map of memories](/vault/${recordIds.memory}.md)
`
            };
        } else {
            // Fallback to generic root record (for upgrade mode or old behavior)
            rootRecord = {
                id: "root",
                record_type: "note",
                record_tags: ["c/agent/your-agent-name", "c/personal/your-name"],
                record_create_date: new Date().toISOString(),
                title: "Your Agent Root",
                contentType: "markdown",
                content: `# Your Agent Root

## Definitions

- Agent: Your Agent Name
- Prime User: Your Name
- Specifications: [core](/dex/core.md)
  - use 'Refresh Core Index' Method if not present

## Agent Identity

[Describe your agent's identity]

## Motivation

[Describe motivations]

## Memories

[List of memory records]
`
            };
        }

        return [rootRecord];
    }

    async post(
        shared: TBCCoreStorage,
        _prepRes: void,
        execRes: GenerateRootNodeOutput,
    ): Promise<string | undefined> {
        // Set records and collection for store-records operation
        shared.records = execRes;
        shared.collection = "tbc";
        return "default";
    }
}