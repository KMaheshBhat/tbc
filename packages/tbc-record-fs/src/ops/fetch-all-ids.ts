import { HAMINode } from "@hami-frameworx/core";

import { readdirSync } from "fs";
import { join } from "path";

import { TBCRecordFSStorage } from "../types.js";

type FetchAllIdsInput = {
    rootDirectory: string;
    collection: string;
};

type FetchAllIdsOutput = string[]; // array of IDs

export class FetchAllIdsNode extends HAMINode<TBCRecordFSStorage> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-record-fs:fetch-all-ids";
    }

    async prep(shared: TBCRecordFSStorage): Promise<FetchAllIdsInput> {
        if (!shared.rootDirectory || !shared.collection) {
            throw new Error("rootDirectory and collection are required in shared state");
        }
        return {
            rootDirectory: shared.rootDirectory,
            collection: shared.collection,
        };
    }

    async exec(params: FetchAllIdsInput): Promise<FetchAllIdsOutput> {
        const collectionPath = join(params.rootDirectory, params.collection);
        try {
            const files = readdirSync(collectionPath);
            const ids = files
                .filter(file => file.endsWith('.md'))
                .map(file => file.replace(/\.md$/, ''));
            return ids;
        } catch (error: any) {
            if (error.code !== 'ENOENT') {
                console.error(`Error reading directory ${collectionPath}:`, error);
            }
            return [];
        }
    }

    async post(shared: TBCRecordFSStorage, _prepRes: FetchAllIdsInput, execRes: FetchAllIdsOutput): Promise<string | undefined> {
        shared.IDs = execRes;
        return "default";
    }
}