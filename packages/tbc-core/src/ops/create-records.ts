import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { HAMINode } from "@hami-frameworx/core";

import { TBCCoreStorage } from "../types.js";

type CreateRecordsNodeOutput = string[];

export class CreateRecordsNode extends HAMINode<TBCCoreStorage> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-core:create-records";
    }

    async prep(
        shared: TBCCoreStorage,
    ): Promise<{ companion: string; prime: string; uuids: string[]; rootDirectory: string }> {
        // Ensure required data is available
        if (!shared.rootDirectory) {
            throw new Error("rootDirectory is required for create-records operation");
        }
        if (!shared.generatedIds || shared.generatedIds.length < 3) {
            throw new Error("generatedIds with 3 UUIDs is required for create-records operation");
        }
        if (!shared.companion || !shared.prime) {
            throw new Error("companion and prime names are required for create-records operation");
        }

        return {
            companion: shared.companion,
            prime: shared.prime,
            uuids: shared.generatedIds,
            rootDirectory: shared.rootDirectory,
        };
    }

    async exec(
        params: { companion: string; prime: string; uuids: string[]; rootDirectory: string },
    ): Promise<CreateRecordsNodeOutput> {
        const { companion, prime, uuids, rootDirectory } = params;
        const results: string[] = [];

        // Helper function to convert to lower-snake-case
        const toLowerSnakeCase = (str: string) => str.toLowerCase().replace(/\s+/g, '_');

        // Create vault directory if it doesn't exist
        const vaultDir = join(rootDirectory, "vault");
        await mkdir(vaultDir, { recursive: true });

        // 1. Create Companion Party record
        const companionId = uuids[0];
        const companionTag = `c/agent/${toLowerSnakeCase(companion)}`;
        const companionRecordPath = join(vaultDir, `${companionId}.md`);
        const companionContent = `---
id: ${companionId}
record_type: party
record_tags:
  - ${companionTag}
party_type: agent
---
# ${companion}

${companion} is the AI Assistant in the Third Brain Companion System, instantiated to assist Prime User ${prime}. As an agent, ${companion} engages in interactions, evolves motivations to align with the Prime User's, and operates within the vault system for memory persistence.
`;

        await writeFile(companionRecordPath, companionContent, 'utf-8');
        results.push(`Created companion party record at ${companionRecordPath}`);

        // 2. Create Prime User Party record
        const primeId = uuids[1];
        const primeRecordPath = join(vaultDir, `${primeId}.md`);
        const primeContent = `---
id: ${primeId}
record_type: party
record_tags:
  - ${companionTag}
party_type: person
---
# ${prime}

${prime} is the Prime User of the Third Brain Companion System, the primary human actor initiating and guiding ${companion}. As the owner of the system, they directs motivations, confirms identities, and delegates memory persistence when needed.
`;

        await writeFile(primeRecordPath, primeContent, 'utf-8');
        results.push(`Created prime user party record at ${primeRecordPath}`);

        // 3. Create Root Memory Structure record
        const memoryId = uuids[2];
        const memoryRecordPath = join(vaultDir, `${memoryId}.md`);
        const memoryContent = `---
id: ${memoryId}
record_type: structure
record_tags:
  - ${companionTag}
---
# Map of Memories

The Companion Agent to list the other records here - any type, with any number of sections.
`;

        await writeFile(memoryRecordPath, memoryContent, 'utf-8');
        results.push(`Created memory structure record at ${memoryRecordPath}`);

        return results;
    }

    async post(
        shared: TBCCoreStorage,
        _prepRes: any,
        execRes: CreateRecordsNodeOutput,
    ): Promise<string | undefined> {
        shared.createRecordsResults = execRes;
        // Store the UUIDs for later use in root generation
        shared.recordIds = {
            companion: shared.generatedIds![0],
            prime: shared.generatedIds![1],
            memory: shared.generatedIds![2],
        };
        return "default";
    }
}