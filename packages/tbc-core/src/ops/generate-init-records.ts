import { HAMINode } from "@hami-frameworx/core";

import { TBCCoreStorage } from "../types.js";

type GenerateInitRecordsNodeOutput = any[];

export class GenerateInitRecordsNode extends HAMINode<TBCCoreStorage> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-core:generate-init-records";
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
    ): Promise<GenerateInitRecordsNodeOutput> {
        const { companion, prime, uuids } = params;
        const records: any[] = [];

        // Helper function to convert to lower-snake-case
        const toLowerSnakeCase = (str: string) => str.toLowerCase().replace(/\s+/g, '_');

        // 1. Create Companion Party record
        const companionId = uuids[0];
        const companionTag = `c/agent/${toLowerSnakeCase(companion)}`;
        const companionRecord = {
            id: companionId,
            record_type: "party",
            record_tags: [companionTag],
            party_type: "agent",
            title: companion,
            content: `${companion} is the AI Assistant in the Third Brain Companion System, instantiated to assist Prime User ${prime}. As an agent, ${companion} engages in interactions, evolves motivations to align with the Prime User's, and operates within the vault system for memory persistence.`
        };
        records.push(companionRecord);

        // 2. Create Prime User Party record
        const primeId = uuids[1];
        const primeRecord = {
            id: primeId,
            record_type: "party",
            record_tags: [companionTag],
            party_type: "person",
            title: prime,
            content: `${prime} is the Prime User of the Third Brain Companion System, the primary human actor initiating and guiding ${companion}. As the owner of the system, they directs motivations, confirms identities, and delegates memory persistence when needed.`
        };
        records.push(primeRecord);

        // 3. Create Root Memory Structure record
        const memoryId = uuids[2];
        const memoryRecord = {
            id: memoryId,
            record_type: "structure",
            record_tags: [companionTag],
            title: "Map of Memories",
            content: "The Companion Agent to list the other records here - any type, with any number of sections."
        };
        records.push(memoryRecord);

        return records;
    }

    async post(
        shared: TBCCoreStorage,
        _prepRes: any,
        execRes: GenerateInitRecordsNodeOutput,
    ): Promise<string | undefined> {
        // Set records and collection for store-records operation
        shared.records = execRes;
        shared.collection = "vault";

        // Store the UUIDs for later use in root generation
        shared.recordIds = {
            companion: shared.generatedIds![0],
            prime: shared.generatedIds![1],
            memory: shared.generatedIds![2],
        };
        return "default";
    }
}