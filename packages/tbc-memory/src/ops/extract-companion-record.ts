import { HAMINode } from "@hami-frameworx/core";

import { TBCMemoryStorage } from "../types.js";

type ExtractCompanionRecordInput = Record<string, any>; // fetchResults expected
type ExtractCompanionRecordOutput = Record<string, any>; // companionRecord

export class ExtractCompanionRecordNode extends HAMINode<TBCMemoryStorage> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-memory:extract-companion-record";
    }

    async prep(shared: TBCMemoryStorage): Promise<ExtractCompanionRecordInput> {
        if (!shared.fetchResults?.['mem']?.[shared.companionId!]) {
            throw new Error('companion record not fetched');
        }
        return shared.fetchResults['mem'][shared.companionId!];
    }

    async exec(params: ExtractCompanionRecordInput): Promise<ExtractCompanionRecordOutput> {
        return params;
    }

    async post(shared: TBCMemoryStorage, _prepRes: ExtractCompanionRecordInput, execRes: ExtractCompanionRecordOutput): Promise<string | undefined> {
        shared.companionRecord = execRes;
        return 'default';
    }
}