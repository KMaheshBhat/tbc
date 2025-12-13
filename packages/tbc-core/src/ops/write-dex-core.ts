import { HAMINode } from "@hami-frameworx/core";

import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

import { TBCCoreStorage } from "../types.js";

type WriteDexCoreInput = {
    rootDirectory: string;
    fetchResults?: Record<string, Record<string, any>>;
};

type WriteDexCoreOutput = string; // path to written file

export class WriteDexCoreNode extends HAMINode<TBCCoreStorage> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-core:write-dex-core";
    }

    async prep(shared: TBCCoreStorage): Promise<WriteDexCoreInput> {
        if (!shared.rootDirectory) {
            throw new Error("rootDirectory is required in shared state");
        }
        return {
            rootDirectory: shared.rootDirectory,
            fetchResults: shared.fetchResults,
        };
    }

    async exec(params: WriteDexCoreInput): Promise<WriteDexCoreOutput> {
        const content = this.collateContent(params.fetchResults || {});
        const dexDir = join(params.rootDirectory, 'dex');
        await mkdir(dexDir, { recursive: true });
        const corePath = join(dexDir, 'core.md');
        await writeFile(corePath, content, 'utf-8');
        return corePath;
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

    async post(shared: TBCCoreStorage, _prepRes: WriteDexCoreInput, execRes: WriteDexCoreOutput): Promise<string | undefined> {
        // Optionally store the result
        shared.refreshCoreResult = execRes;
        return "default";
    }
}