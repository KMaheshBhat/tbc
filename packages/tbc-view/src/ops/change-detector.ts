import { HAMINode } from "@hami-frameworx/core";

import type { TBCViewStorage } from "../types.js";

type ChangeDetectorInput = {
    discoveredFiles: Array<{
        id: string;
        collection: string;
        filePath: string;
        hash: string;
        mtime: number;
    }>;
    viewStore: any; // ViewStore
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

export class ChangeDetectorNode extends HAMINode<TBCViewStorage> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-view:change-detector";
    }

    async prep(shared: TBCViewStorage): Promise<ChangeDetectorInput> {
        if (!shared.discoveredFiles) {
            throw new Error("discoveredFiles is required in shared state");
        }
        if (!shared.viewStore) {
            throw new Error("viewStore is required in shared state");
        }
        return {
            discoveredFiles: shared.discoveredFiles,
            viewStore: shared.viewStore,
        };
    }

    async exec(params: ChangeDetectorInput): Promise<ChangeDetectorOutput> {
        const changedFiles: ChangeDetectorOutput['changedFiles'] = [];

        for (const file of params.discoveredFiles) {
            const existing = params.viewStore.getNode(file.id);

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

    async post(shared: TBCViewStorage, _prepRes: ChangeDetectorInput, execRes: ChangeDetectorOutput): Promise<string | undefined> {
        shared.changedFiles = execRes.changedFiles;
        return "default";
    }
}