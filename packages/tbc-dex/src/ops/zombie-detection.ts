import { HAMINode } from "@hami-frameworx/core";

import type { Shared } from "../types.js";

type ZombieDetectionInput = {
    dexStore: any; // DexStore
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

export class ZombieDetectionNode extends HAMINode<Shared> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-dex:zombie-detection";
    }

    async prep(shared: Shared): Promise<ZombieDetectionInput> {
        if (!shared.dexStore) {
            throw new Error("dexStore is required in shared state");
        }
        return {
            dexStore: shared.dexStore,
        };
    }

    async exec(params: ZombieDetectionInput): Promise<ZombieDetectionOutput> {
        const zombieLinks = params.dexStore.getZombieLinks();
        return { zombieLinks };
    }

    async post(shared: Shared, _prepRes: ZombieDetectionInput, execRes: ZombieDetectionOutput): Promise<string | undefined> {
        shared.zombieLinks = execRes.zombieLinks;
        return "default";
    }
}