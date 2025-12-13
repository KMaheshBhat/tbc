import { HAMINode } from "@hami-frameworx/core";

import { writeFile } from "fs/promises";
import { join, dirname } from "path";
import matter from "gray-matter";

import { TBCRecordFSStorage } from "../types.js";

type StoreRecordsInput = {
    rootDirectory: string;
    collection: string;
    records: Record<string, any>[];
};

type StoreRecordsOutput = string[]; // array of stored IDs

export class StoreRecordsNode extends HAMINode<TBCRecordFSStorage> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-record-fs:store-records";
    }

    async prep(shared: TBCRecordFSStorage): Promise<StoreRecordsInput> {
        if (!shared.rootDirectory || !shared.collection || !shared.records) {
            throw new Error("rootDirectory, collection, and records are required in shared state");
        }
        return {
            rootDirectory: shared.rootDirectory,
            collection: shared.collection,
            records: shared.records,
        };
    }

    async exec(params: StoreRecordsInput): Promise<StoreRecordsOutput> {
        const storedIds: string[] = [];
        const collectionPath = join(params.rootDirectory, params.collection);

        for (const record of params.records) {
            if (!record.id) {
                console.error(`Record missing id:`, record);
                continue;
            }

            try {
                const filePath = join(collectionPath, `${record.id}.md`);
                const { content, ...frontmatterData } = record;

                // Use gray-matter to stringify with frontmatter
                const fileContent = matter.stringify(content || '', frontmatterData);

                // Ensure directory exists
                await writeFile(filePath, fileContent, 'utf-8');
                storedIds.push(record.id);
            } catch (error) {
                console.error(`Error storing record ${record.id}:`, error);
                // Continue with other records
            }
        }

        return storedIds;
    }

    async post(shared: TBCRecordFSStorage, _prepRes: StoreRecordsInput, execRes: StoreRecordsOutput): Promise<string | undefined> {
        shared.storeResults = { ...shared.storeResults, [shared.collection!]: execRes };
        return "default";
    }
}