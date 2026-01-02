import { HAMINode } from "@hami-frameworx/core";

import type { TBCViewStorage } from "../types.js";

type HealthSummaryQueryInput = {
    viewStore: any; // ViewStore
};

type HealthSummaryQueryOutput = {
    healthSummary: {
        total_records: number;
        healthy_records: number;
        health_percentage: number;
    };
};

export class HealthSummaryQueryNode extends HAMINode<TBCViewStorage> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-view:health-summary-query";
    }

    async prep(shared: TBCViewStorage): Promise<HealthSummaryQueryInput> {
        if (!shared.viewStore) {
            throw new Error("viewStore is required in shared state");
        }
        return {
            viewStore: shared.viewStore,
        };
    }

    async exec(params: HealthSummaryQueryInput): Promise<HealthSummaryQueryOutput> {
        const healthSummary = params.viewStore.getSystemHealthSummary();
        return { healthSummary };
    }

    async post(shared: TBCViewStorage, _prepRes: HealthSummaryQueryInput, execRes: HealthSummaryQueryOutput): Promise<string | undefined> {
        shared.healthSummary = execRes.healthSummary;
        return "default";
    }
}