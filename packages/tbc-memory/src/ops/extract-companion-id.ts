import { HAMINode } from "@hami-frameworx/core";

import { TBCMemoryStorage } from "../types.js";

type ExtractCompanionIdInput = Record<string, any>; // fetchResults expected
type ExtractCompanionIdOutput = string; // companionId

export class ExtractCompanionIdNode extends HAMINode<TBCMemoryStorage> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-memory:extract-companion-id";
    }

    async prep(shared: TBCMemoryStorage): Promise<ExtractCompanionIdInput> {
        if (!shared.record?.result?.records?.['sys']?.['companion.id']) {
            throw new Error('companion.id not fetched');
        }
        return shared.record?.result?.records?.['sys']?.['companion.id'];
    }

    async exec(params: ExtractCompanionIdInput): Promise<ExtractCompanionIdOutput> {
        if (!params.content) {
            throw new Error('companion.id file not found or empty');
        }
        return params.content.trim();
    }

    async post(shared: TBCMemoryStorage, _prepRes: ExtractCompanionIdInput, execRes: ExtractCompanionIdOutput): Promise<string | undefined> {
        shared.companionId = execRes;
        // Set for next fetch
        shared.collection = 'mem';
        shared.IDs = [execRes];
        return 'default';
    }
}