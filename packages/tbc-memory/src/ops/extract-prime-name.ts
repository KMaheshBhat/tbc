import { HAMINode } from "@hami-frameworx/core";

import { TBCMemoryStorage } from "../types.js";

type ExtractPrimeNameInput = Record<string, any>; // fetchResults expected
type ExtractPrimeNameOutput = string; // primeName

export class ExtractPrimeNameNode extends HAMINode<TBCMemoryStorage> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-memory:extract-prime-name";
    }

    async prep(shared: TBCMemoryStorage): Promise<ExtractPrimeNameInput> {
        if (!shared.fetchResults?.['mem']?.[shared.primeId!]) {
            throw new Error('prime record not fetched');
        }
        return shared.fetchResults['mem'][shared.primeId!];
    }

    async exec(params: ExtractPrimeNameInput): Promise<ExtractPrimeNameOutput> {
        if (!params.name && !params.title && !params.record_title) {
            throw new Error('Prime record missing name/title/record_title');
        }
        return params.name || params.title || params.record_title;
    }

    async post(shared: TBCMemoryStorage, _prepRes: ExtractPrimeNameInput, execRes: ExtractPrimeNameOutput): Promise<string | undefined> {
        shared.primeName = execRes;
        return 'default';
    }
}