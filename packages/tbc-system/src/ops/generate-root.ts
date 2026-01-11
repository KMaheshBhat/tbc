import { HAMINode } from "@hami-frameworx/core";

import { Shared } from "../types.js";

type NodeOutput = any[];

export class GenerateRootNode extends HAMINode<Shared> {
    private companion?: string;
    private prime?: string;

    constructor(config?: { companion?: string; prime?: string }, maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
        this.companion = config?.companion;
        this.prime = config?.prime;
    }

    kind(): string {
        return "tbc-system:generate-root";
    }

    async prep(
        shared: Shared,
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
        input: { rootDirectory: string; companion?: string; prime?: string; recordIds?: { companion: string; prime: string; memory: string } },
    ): Promise<NodeOutput> {
        const { companion, prime, recordIds } = input;

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
                companion: `/mem/${recordIds.companion}.md`,
                prime: `/mem/${recordIds.prime}.md`,
                system_path: "/sys/core/",
                extension_path: "/sys/ext/",
                skills_path: "skills/core",
                skills_extension_path: "skills/ext",
                memory_path: "/mem/",
                view_path: "/dex/",
                activity_path: "/act",
                memory_map: `/mem/${recordIds.memory}.md`,
                content: `# ${companion} Root

## Definitions

- Agent: [${companion}](/mem/${recordIds.companion}.md)
- Primer User: [${prime}](/mem/${recordIds.prime}.md)
- Specifications:
  - [core](/dex/core.md) - use 'Index Management Skill' if not present; provides full definitions.
  - [extensions](/dex/extensions.md) - use 'Index Management Skill' Method if not present; only provides summary; read specific extensions from /sys/ext/ as needed.
  - [skills](/dex/skills.md) - use 'Index Management Skill' if not present; only provides summary; read specific extensions from /skills/{core|ext}/{id}/SKILL.md as needed.

## Agent Identity

${companion} is the AI Assistant as per the Third Brain Companion System Definitions.

## Motivation

1. Assist the Prime User in their activities, engage in their interactions.
2. Evolve motivations with clarity to align with motivations of the Prime User.

## Memories

- [root map of memories](/mem/${recordIds.memory}.md)
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
- Specifications:
  - [core](/dex/core.md) - use 'Index Management Skill' if not present; provides full definitions.
  - [extensions](/dex/extensions.md) - use 'Index Management Skill' Method if not present; only provides summary; read specific extensions from /sys/ext/ as needed.
  - [skills](/dex/skills.md) - use 'Index Management Skill' if not present; only provides summary; read specific extensions from /skills/{core|ext}/{id}/SKILL.md as needed.

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
        shared: Shared,
        _prepRes: void,
        execRes: NodeOutput,
    ): Promise<string | undefined> {
        // Set records and collection for store-records operation
        shared.records = execRes;
        shared.collection = "sys";
        return "default";
    }
}