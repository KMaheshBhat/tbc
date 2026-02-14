import { HAMINode } from '@hami-frameworx/core';

import type { Shared } from '../types.js';

type OrphanDetectionInput = {
    dexStore: any; // DexStore
};

type OrphanDetectionOutput = {
    orphanRecords: Array<{
        id: string;
        collection: string;
        record_type: string;
        title?: string;
    }>;
};

export class OrphanDetectionNode extends HAMINode<Shared> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return 'tbc-dex:orphan-detection';
    }

    async prep(shared: Shared): Promise<OrphanDetectionInput> {
        if (!shared.dexStore) {
            throw new Error('dexStore is required in shared state');
        }
        return {
            dexStore: shared.dexStore,
        };
    }

    async exec(params: OrphanDetectionInput): Promise<OrphanDetectionOutput> {
        const orphanRecords = params.dexStore.getOrphanRecords();
        return { orphanRecords };
    }

    async post(shared: Shared, _prepRes: OrphanDetectionInput, execRes: OrphanDetectionOutput): Promise<string | undefined> {
        shared.orphanRecords = execRes.orphanRecords;
        return 'default';
    }
}