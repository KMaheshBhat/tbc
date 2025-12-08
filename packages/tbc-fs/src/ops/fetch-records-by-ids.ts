import { HAMINode } from "@hami-frameworx/core";

import { readFileSync, existsSync, readdirSync } from "fs";
import { join, extname } from "path";
import matter from "gray-matter";

import { TBCFSStorage } from "../types.js";

type FetchRecordsByIdsInput = {
    rootDirectory: string;
    collection: string;
    IDs: string[];
};

type FetchRecordsByIdsOutput = Record<string, Record<string, any>>; // id -> record

export class FetchRecordsByIdsNode extends HAMINode<TBCFSStorage> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-fs:fetch-records-by-ids";
    }

    async prep(shared: TBCFSStorage): Promise<FetchRecordsByIdsInput> {
        if (!shared.rootDirectory || !shared.collection || !shared.IDs) {
            throw new Error("rootDirectory, collection, and IDs are required in shared state");
        }
        return {
            rootDirectory: shared.rootDirectory,
            collection: shared.collection,
            IDs: shared.IDs,
        };
    }

    async exec(params: FetchRecordsByIdsInput): Promise<FetchRecordsByIdsOutput> {
        const results: FetchRecordsByIdsOutput = {};
        const collectionPath = join(params.rootDirectory, params.collection);
        for (const id of params.IDs) {
            const record = this.findAndParseRecord(collectionPath, id);
            if (record) {
                results[id] = record;
            }
        }
        return results;
    }

    private findAndParseRecord(collectionPath: string, id: string): Record<string, any> | null {
        // Priority order: .json, .md, no ext, then any ext
        const candidates = [
            join(collectionPath, `${id}.json`),
            join(collectionPath, `${id}.md`),
            join(collectionPath, id), // no extension
        ];

        // Add files matching {id}.*
        candidates.push(...this.getFilesWithPattern(collectionPath, id));

        for (const filePath of candidates) {
            if (existsSync(filePath)) {
                try {
                    const content = readFileSync(filePath, 'utf-8');
                    const ext = extname(filePath);
                    let record: Record<string, any>;
                    if (ext === '.json') {
                        record = JSON.parse(content);
                    } else if (ext === '.md') {
                        const parsed = matter(content);
                        record = { ...parsed.data, content: parsed.content };
                    } else {
                        record = { content };
                    }
                    record.id = id;
                    return record;
                } catch (error) {
                    console.error(`Error parsing file ${filePath}:`, error);
                    // Continue to next candidate
                }
            }
        }
        return null;
    }

    private getFilesWithPattern(collectionPath: string, id: string): string[] {
        try {
            const files = readdirSync(collectionPath);
            return files
                .filter(file => file.startsWith(`${id}.`))
                .map(file => join(collectionPath, file));
        } catch {
            return [];
        }
    }

    async post(shared: TBCFSStorage, _prepRes: FetchRecordsByIdsInput, execRes: FetchRecordsByIdsOutput): Promise<string | undefined> {
        shared.fetchResults = { [shared.collection!]: execRes };
        return "default";
    }
}