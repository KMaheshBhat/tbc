import { HAMINode } from "@hami-frameworx/core";

import { TBCMemoryStorage } from "../types.js";

type ExtractPrimeIdInput = Record<string, any>; // fetchResults expected
type ExtractPrimeIdOutput = string; // primeId

export class ExtractPrimeIdNode extends HAMINode<TBCMemoryStorage> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-memory:extract-prime-id";
    }

    async prep(shared: TBCMemoryStorage): Promise<ExtractPrimeIdInput> {
        if (!shared.record?.result?.records?.['sys']?.['prime.id']) {
            throw new Error('prime.id not fetched');
        }
        return shared.record?.result?.records?.['sys']?.['prime.id'];
    }

    async exec(params: ExtractPrimeIdInput): Promise<ExtractPrimeIdOutput> {
        if (!params.content) {
            throw new Error('prime.id file not found or empty');
        }
        return params.content.trim();
    }

    async post(shared: TBCMemoryStorage, _prepRes: ExtractPrimeIdInput, execRes: ExtractPrimeIdOutput): Promise<string | undefined> {
        shared.primeId = execRes;
        // Set for next fetch
        shared.collection = 'mem';
        shared.IDs = [execRes];
        return 'default';
    }
}