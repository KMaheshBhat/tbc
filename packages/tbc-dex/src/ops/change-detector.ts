import { HAMINode } from "@hami-frameworx/core";

import type { TBCDexStorage } from "../types.js";

type ChangeDetectorInput = {
    discoveredFiles: Array<{
        id: string;
        collection: string;
        filePath: string;
        hash: string;
        mtime: number;
    }>;
    dexStore: any; // DexStore
};

type ChangeDetectorOutput = {
    changedFiles: Array<{
        id: string;
        collection: string;
        filePath: string;
        hash: string;
        mtime: number;
        isNew: boolean;
    }>;
};

export class ChangeDetectorNode extends HAMINode<TBCDexStorage> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-dex:change-detector";
    }

    async prep(shared: TBCDexStorage): Promise<ChangeDetectorInput> {
        if (!shared.discoveredFiles) {
            throw new Error("discoveredFiles is required in shared state");
        }
        if (!shared.dexStore) {
            throw new Error("dexStore is required in shared state");
        }
        return {
            discoveredFiles: shared.discoveredFiles,
            dexStore: shared.dexStore,
        };
    }

    async exec(params: ChangeDetectorInput): Promise<ChangeDetectorOutput> {
        const changedFiles: ChangeDetectorOutput['changedFiles'] = [];

        for (const file of params.discoveredFiles) {
            const existing = params.dexStore.getNode(file.id);

            if (!existing) {
                // New file
                changedFiles.push({
                    ...file,
                    isNew: true,
                });
            } else if (existing.hash !== file.hash) {
                // Changed file
                changedFiles.push({
                    ...file,
                    isNew: false,
                });
            }
            // If hash matches, file hasn't changed, skip
        }

        return { changedFiles };
    }

    async post(shared: TBCDexStorage, _prepRes: ChangeDetectorInput, execRes: ChangeDetectorOutput): Promise<string | undefined> {
        shared.changedFiles = execRes.changedFiles;
        return "default";
    }
}