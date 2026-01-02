import { HAMINode } from "@hami-frameworx/core";

import type { TBCViewStorage } from "../types.js";

type SchemaViolationCheckInput = {
    viewStore: any; // ViewStore
};

type SchemaViolationCheckOutput = {
    schemaViolations: Array<{
        id: string;
        collection: string;
        record_type: string;
        violation_details?: string;
    }>;
};

export class SchemaViolationCheckNode extends HAMINode<TBCViewStorage> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-view:schema-violation-check";
    }

    async prep(shared: TBCViewStorage): Promise<SchemaViolationCheckInput> {
        if (!shared.viewStore) {
            throw new Error("viewStore is required in shared state");
        }
        return {
            viewStore: shared.viewStore,
        };
    }

    async exec(params: SchemaViolationCheckInput): Promise<SchemaViolationCheckOutput> {
        const schemaViolations = params.viewStore.getSchemaViolations();
        return { schemaViolations };
    }

    async post(shared: TBCViewStorage, _prepRes: SchemaViolationCheckInput, execRes: SchemaViolationCheckOutput): Promise<string | undefined> {
        shared.schemaViolations = execRes.schemaViolations;
        return "default";
    }
}