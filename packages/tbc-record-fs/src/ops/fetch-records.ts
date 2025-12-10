import { HAMINode } from "@hami-frameworx/core";

import { readFileSync, existsSync, readdirSync } from "fs";
import { join, extname, basename } from "path";
import matter from "gray-matter";

import { TBCRecordFSStorage } from "../types.js";

type FetchRecordsInput = {
    rootDirectory: string;
    collection: string;
    IDs: string[];
};

type FetchRecordsOutput = Record<string, Record<string, any>>; // id -> record

export class FetchRecordsNode extends HAMINode<TBCRecordFSStorage> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-record-fs:fetch-records";
    }

    async prep(shared: TBCRecordFSStorage): Promise<FetchRecordsInput> {
        if (!shared.rootDirectory || !shared.collection || !shared.IDs) {
            throw new Error("rootDirectory, collection, and IDs are required in shared state");
        }
        return {
            rootDirectory: shared.rootDirectory,
            collection: shared.collection,
            IDs: shared.IDs,
        };
    }

    async exec(params: FetchRecordsInput): Promise<FetchRecordsOutput> {
        const results: FetchRecordsOutput = {};
        const collectionPath = join(params.rootDirectory, params.collection);
        for (const id of params.IDs) {
            const record = this.findAndParseRecord(collectionPath, params.collection, id);
            if (record) {
                results[id] = record;
            }
        }
        return results;
    }

    private findAndParseRecord(collectionPath: string, collection: string, id: string): Record<string, any> | null {
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
                        record = { ...parsed.data, content: parsed.content, fullContent: content };
                        // Extract title from markdown content (first H1 heading) if not present in frontmatter
                        if (!record.title && parsed.content) {
                            const titleMatch = parsed.content.match(/^#\s+(.+)/m);
                            if (titleMatch) {
                                record.title = titleMatch[1].trim();
                            }
                        }
                    } else {
                        record = { content, fullContent: content };
                    }
                    record.id = id;
                    // Add filename relative to rootDirectory
                    record.filename = join(collection, basename(filePath));
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

    async post(shared: TBCRecordFSStorage, _prepRes: FetchRecordsInput, execRes: FetchRecordsOutput): Promise<string | undefined> {
        shared.fetchResults = { ...shared.fetchResults, [shared.collection!]: execRes };
        return "default";
    }
}