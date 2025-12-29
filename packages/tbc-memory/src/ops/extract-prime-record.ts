import { HAMINode } from "@hami-frameworx/core";

import { TBCMemoryStorage } from "../types.js";

type ExtractPrimeRecordInput = Record<string, any>; // fetchResults expected
type ExtractPrimeRecordOutput = Record<string, any>; // primeRecord

export class ExtractPrimeRecordNode extends HAMINode<TBCMemoryStorage> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-memory:extract-prime-record";
    }

    async prep(shared: TBCMemoryStorage): Promise<ExtractPrimeRecordInput> {
        if (!shared.fetchResults?.['mem']?.[shared.primeId!]) {
            throw new Error('prime record not fetched');
        }
        return shared.fetchResults['mem'][shared.primeId!];
    }

    async exec(params: ExtractPrimeRecordInput): Promise<ExtractPrimeRecordOutput> {
        return params;
    }

    async post(shared: TBCMemoryStorage, _prepRes: ExtractPrimeRecordInput, execRes: ExtractPrimeRecordOutput): Promise<string | undefined> {
        shared.primeRecord = execRes;
        return 'default';
    }
}