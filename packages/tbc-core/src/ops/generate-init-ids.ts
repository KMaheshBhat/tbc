import { HAMINode } from "@hami-frameworx/core";

import { TBCCoreStorage } from "../types.js";

type GenerateInitIdsNodeOutput = any[];

export class GenerateInitIdsNode extends HAMINode<TBCCoreStorage> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-core:generate-init-ids";
    }

    async prep(
        shared: TBCCoreStorage,
    ): Promise<{ recordIds: { companion: string; prime: string; memory: string } }> {
        // Ensure required data is available
        if (!shared.recordIds) {
            throw new Error("recordIds is required for generate-init-ids operation");
        }

        return {
            recordIds: shared.recordIds,
        };
    }

    async exec(
        params: { recordIds: { companion: string; prime: string; memory: string } },
    ): Promise<GenerateInitIdsNodeOutput> {
        const { recordIds } = params;

        // Create ID records for companion and prime
        const idRecords = [
            {
                id: 'companion.id',
                filename: 'companion.id',
                contentType: 'raw',
                content: recordIds.companion
            },
            {
                id: 'prime.id',
                filename: 'prime.id',
                contentType: 'raw',
                content: recordIds.prime
            }
        ];

        return idRecords;
    }

    async post(
        shared: TBCCoreStorage,
        _prepRes: any,
        execRes: GenerateInitIdsNodeOutput,
    ): Promise<string | undefined> {
        shared.records = execRes;
        shared.collection = "tbc";
        shared.generateInitIdsResults = [
            `Generated companion.id record with UUID: ${execRes[0].content}`,
            `Generated prime.id record with UUID: ${execRes[1].content}`
        ];
        return "default";
    }
}