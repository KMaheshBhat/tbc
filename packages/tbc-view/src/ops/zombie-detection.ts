import { HAMINode } from "@hami-frameworx/core";

import type { TBCViewStorage } from "../types.js";

type ZombieDetectionInput = {
    viewStore: any; // ViewStore
};

type ZombieDetectionOutput = {
    zombieLinks: Array<{
        source_id: string;
        target_id: string;
        source_collection: string;
        source_type: string;
        edge_type: string;
    }>;
};

export class ZombieDetectionNode extends HAMINode<TBCViewStorage> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-view:zombie-detection";
    }

    async prep(shared: TBCViewStorage): Promise<ZombieDetectionInput> {
        if (!shared.viewStore) {
            throw new Error("viewStore is required in shared state");
        }
        return {
            viewStore: shared.viewStore,
        };
    }

    async exec(params: ZombieDetectionInput): Promise<ZombieDetectionOutput> {
        const zombieLinks = params.viewStore.getZombieLinks();
        return { zombieLinks };
    }

    async post(shared: TBCViewStorage, _prepRes: ZombieDetectionInput, execRes: ZombieDetectionOutput): Promise<string | undefined> {
        shared.zombieLinks = execRes.zombieLinks;
        return "default";
    }
}