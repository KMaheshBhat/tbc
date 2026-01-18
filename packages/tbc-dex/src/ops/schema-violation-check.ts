import { HAMINode } from "@hami-frameworx/core";

import type { Shared } from "../types.js";

type SchemaViolationCheckInput = {
    dexStore: any; // DexStore
};

type SchemaViolationCheckOutput = {
    schemaViolations: Array<{
        id: string;
        collection: string;
        record_type: string;
        violation_details?: string;
    }>;
};

export class SchemaViolationCheckNode extends HAMINode<Shared> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-dex:schema-violation-check";
    }

    async prep(shared: Shared): Promise<SchemaViolationCheckInput> {
        if (!shared.dexStore) {
            throw new Error("dexStore is required in shared state");
        }
        return {
            dexStore: shared.dexStore,
        };
    }

    async exec(params: SchemaViolationCheckInput): Promise<SchemaViolationCheckOutput> {
        const schemaViolations = params.dexStore.getSchemaViolations();
        return { schemaViolations };
    }

    async post(shared: Shared, _prepRes: SchemaViolationCheckInput, execRes: SchemaViolationCheckOutput): Promise<string | undefined> {
        shared.schemaViolations = execRes.schemaViolations;
        return "default";
    }
}