import { HAMINode } from "@hami-frameworx/core";

import type { Shared } from "../types.js";

type GenerateDexCoreInput = {
    rootDirectory: string;
    fetchResults?: Record<string, Record<string, any>>;
};

type GenerateDexCoreOutput = {
    id: string;
    filename: string;
    contentType: string;
    title: string;
    content: string;
    record_type: string;
};

export class GenerateDexCoreNode extends HAMINode<Shared> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-dex:generate-dex-core";
    }

    async prep(shared: Shared): Promise<GenerateDexCoreInput> {
        if (!shared.rootDirectory) {
            throw new Error("rootDirectory is required in shared state");
        }
        return {
            rootDirectory: shared.rootDirectory,
            fetchResults: shared.record?.result?.records || {},
        };
    }

    async exec(params: GenerateDexCoreInput): Promise<GenerateDexCoreOutput> {
        const content = this.collateContent(params.fetchResults || {});
        return {
            id: 'core',
            filename: 'core.md',
            contentType: 'markdown',
            title: 'Core System Definitions',
            content: content,
            record_type: 'dex'
        };
    }

    private collateContent(fetchResults: Record<string, Record<string, any>>): string {
        const lines: string[] = [];

        // Root Record
        lines.push("=== Root Record ===");
        const rootRecord = fetchResults?.["sys"]?.["root"];
        if (rootRecord?.fullContent) {
            lines.push(rootRecord.fullContent);
        }
        lines.push("");

        // TBC System Definitions
        lines.push("=== TBC System Definitions ===");

        // Specs
        const specsRecords = fetchResults?.["sys/core"];
        if (specsRecords) {
            for (const id in specsRecords) {
                const record = specsRecords[id];
                if (record.filename && record.fullContent) {
                    lines.push(`=== ${record.filename} ===`);
                    lines.push(record.fullContent);
                    lines.push("");
                }
            }
        }


        return lines.join("\n");
    }

    async post(shared: Shared, _prepRes: GenerateDexCoreInput, execRes: GenerateDexCoreOutput): Promise<string | undefined> {
        // Store the generated record for use by store-records node
        shared.generatedDexCore = execRes;
        
        // Set up records array for store operation
        shared.records = [execRes];
        shared.collection = 'dex';
        
        return "default";
    }
}