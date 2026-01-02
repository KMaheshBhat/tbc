import { HAMINode } from "@hami-frameworx/core";

import type { TBCViewStorage } from "../types.js";

type OrphanDetectionInput = {
    viewStore: any; // ViewStore
};

type OrphanDetectionOutput = {
    orphanRecords: Array<{
        id: string;
        collection: string;
        record_type: string;
        title?: string;
    }>;
};

export class OrphanDetectionNode extends HAMINode<TBCViewStorage> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-view:orphan-detection";
    }

    async prep(shared: TBCViewStorage): Promise<OrphanDetectionInput> {
        if (!shared.viewStore) {
            throw new Error("viewStore is required in shared state");
        }
        return {
            viewStore: shared.viewStore,
        };
    }

    async exec(params: OrphanDetectionInput): Promise<OrphanDetectionOutput> {
        const orphanRecords = params.viewStore.getOrphanRecords();
        return { orphanRecords };
    }

    async post(shared: TBCViewStorage, _prepRes: OrphanDetectionInput, execRes: OrphanDetectionOutput): Promise<string | undefined> {
        shared.orphanRecords = execRes.orphanRecords;
        return "default";
    }
}