import { HAMINode } from "@hami-frameworx/core";

import { TBCMemoryStorage } from "../types.js";

type ExtractCompanionNameInput = Record<string, any>; // fetchResults expected
type ExtractCompanionNameOutput = string; // companionName

export class ExtractCompanionNameNode extends HAMINode<TBCMemoryStorage> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-memory:extract-companion-name";
    }

    async prep(shared: TBCMemoryStorage): Promise<ExtractCompanionNameInput> {
        if (!shared.record?.result?.records?.['mem']?.[shared.companionId!]) {
            throw new Error('companion record not fetched');
        }
        return shared.record?.result?.records?.['mem']?.[shared.companionId!];
    }

    async exec(params: ExtractCompanionNameInput): Promise<ExtractCompanionNameOutput> {
        if (!params.name && !params.title && !params.record_title) {
            throw new Error('Companion record missing name/title/record_title');
        }
        return params.name || params.title || params.record_title;
    }

    async post(shared: TBCMemoryStorage, _prepRes: ExtractCompanionNameInput, execRes: ExtractCompanionNameOutput): Promise<string | undefined> {
        shared.companionName = execRes;
        return 'default';
    }
}