import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { HAMINode } from "@hami-frameworx/core";

import { TBCCoreStorage } from "../types.js";

type WriteIdsNodeOutput = string[];

export class WriteIdsNode extends HAMINode<TBCCoreStorage> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-core:write-ids";
    }

    async prep(
        shared: TBCCoreStorage,
    ): Promise<{ recordIds: { companion: string; prime: string; memory: string }; rootDirectory: string }> {
        // Ensure required data is available
        if (!shared.rootDirectory) {
            throw new Error("rootDirectory is required for write-ids operation");
        }
        if (!shared.recordIds) {
            throw new Error("recordIds is required for write-ids operation");
        }

        return {
            recordIds: shared.recordIds,
            rootDirectory: shared.rootDirectory,
        };
    }

    async exec(
        params: { recordIds: { companion: string; prime: string; memory: string }; rootDirectory: string },
    ): Promise<WriteIdsNodeOutput> {
        const { recordIds, rootDirectory } = params;
        const results: string[] = [];

        const tbcDir = join(rootDirectory, "tbc");

        // Write companion.id
        const companionIdPath = join(tbcDir, "companion.id");
        await writeFile(companionIdPath, recordIds.companion, 'utf-8');
        results.push(`Wrote companion.id at ${companionIdPath}`);

        // Write prime.id
        const primeIdPath = join(tbcDir, "prime.id");
        await writeFile(primeIdPath, recordIds.prime, 'utf-8');
        results.push(`Wrote prime.id at ${primeIdPath}`);

        return results;
    }

    async post(
        shared: TBCCoreStorage,
        _prepRes: any,
        execRes: WriteIdsNodeOutput,
    ): Promise<string | undefined> {
        shared.writeIdsResults = execRes;
        return "default";
    }
}