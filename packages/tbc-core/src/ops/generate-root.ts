import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { HAMINode } from "@hami-frameworx/core";

import { TBCCoreStorage } from "../types.js";

type GenerateRootNodeOutput = string[];

export class GenerateRootNode extends HAMINode<TBCCoreStorage> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-core:generate-root";
    }

    async prep(
        shared: TBCCoreStorage,
    ): Promise<TBCCoreStorage> {
        // Ensure rootDirectory is set
        if (!shared.rootDirectory) {
            throw new Error("rootDirectory is required for generate-root operation");
        }
        return shared;
    }

    async exec(
        shared: TBCCoreStorage,
    ): Promise<GenerateRootNodeOutput> {
        const rootDir = shared.rootDirectory!;
        const rootFilePath = join(rootDir, "tbc", "root.md");

        const rootContent = `---
id: root
record_type: note
record_tags:
  - c/agent/your-agent-name
  - c/personal/your-name
record_create_date: ${new Date().toISOString()}
title: Your Agent Root
---
# Your Agent Root

## Definitions

- Agent: Your Agent Name
- Prime User: Your Name
- Definitions: [core](/dex/core.md)
  - use [\`refresh-core\`](/tbc/tools/refresh-core.sh) if not present

## Agent Identity

[Describe your agent's identity]

## Motivation

[Describe motivations]

## Memories

[List of memory records]
`;

        try {
            await writeFile(rootFilePath, rootContent, 'utf-8');
            return [`Generated initial root.md at ${rootFilePath}`];
        } catch (error) {
            throw new Error(`Failed to generate root.md: ${(error as Error).message}`);
        }
    }

    async post(
        shared: TBCCoreStorage,
        _prepRes: void,
        execRes: GenerateRootNodeOutput,
    ): Promise<string | undefined> {
        shared.generateRootResults = execRes;
        return "default";
    }
}