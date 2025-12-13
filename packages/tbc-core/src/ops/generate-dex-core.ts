import { HAMINode } from "@hami-frameworx/core";

import { TBCCoreStorage } from "../types.js";

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

export class GenerateDexCoreNode extends HAMINode<TBCCoreStorage> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-core:generate-dex-core";
    }

    async prep(shared: TBCCoreStorage): Promise<GenerateDexCoreInput> {
        if (!shared.rootDirectory) {
            throw new Error("rootDirectory is required in shared state");
        }
        return {
            rootDirectory: shared.rootDirectory,
            fetchResults: shared.fetchResults,
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
        const rootRecord = fetchResults?.["tbc"]?.["root"];
        if (rootRecord?.fullContent) {
            lines.push(rootRecord.fullContent);
        }
        lines.push("");

        // TBC System Definitions
        lines.push("=== TBC System Definitions ===");

        // Specs
        const specsRecords = fetchResults?.["tbc/specs"];
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

        // Extensions
        const extensionsRecords = fetchResults?.["tbc/extensions"];
        if (extensionsRecords) {
            for (const id in extensionsRecords) {
                const record = extensionsRecords[id];
                if (record.filename && record.fullContent) {
                    lines.push(`=== ${record.filename} ===`);
                    lines.push(record.fullContent);
                    lines.push("");
                }
            }
        }

        return lines.join("\n");
    }

    async post(shared: TBCCoreStorage, _prepRes: GenerateDexCoreInput, execRes: GenerateDexCoreOutput): Promise<string | undefined> {
        // Store the generated record for use by store-records node
        shared.generatedDexCore = execRes;
        
        // Set up records array for store operation
        shared.records = [execRes];
        shared.collection = 'dex';
        
        return "default";
    }
}