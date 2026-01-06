import assert from "assert";
import { readFileSync, existsSync, readdirSync } from "fs";
import { join, extname, basename } from "path";
import matter from "gray-matter";

import { HAMINode } from "@hami-frameworx/core";

import { TBCRecordFSStorage } from "../types.js";
import { TBCStore } from "@tbc-frameworx/tbc-record";

export class FetchRecordsNode extends HAMINode<TBCRecordFSStorage> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-record-fs:fetch-records";
    }

    async prep(shared: TBCRecordFSStorage): Promise<[string, string, string[]]> {
        assert(shared.record, 'shared.record is required');
        assert(shared.record?.rootDirectory, 'shared.record.rootDirectory is required');
        assert(shared.record?.collection, 'shared.record.collection is required');
        assert(shared.record?.IDs, 'shared.record.IDs is required');
        return [
            shared.record?.rootDirectory!,
            shared.record?.collection!,
            shared.record?.IDs!,
        ];
    }

    async exec(params: [string, string, string[]]): Promise<TBCStore> {
        const [rootDirectory, collection, IDs] = params;
        const results: TBCStore = {};
        const collectionPath = join(rootDirectory, collection);
        for (const id of IDs) {
            const record = this.findAndParseRecord(collectionPath, collection, id);
            if (record) {
                results[id] = record;
            }
        }
        return {[collection]: results};
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
                        if (!record.record_title && parsed.content) {
                            const titleMatch = parsed.content.match(/^#\s+(.+)/m);
                            if (titleMatch) {
                                record.record_title = titleMatch[1].trim();
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

    async post(
        shared: TBCRecordFSStorage,
        _prepRes: [string, string, string[]],
        execRes: TBCStore,
    ): Promise<string | undefined> {
        assert(shared.record, 'shared.record is required');
        if (!shared.record.result) shared.record.result = {};
        shared.record.result.records = execRes;
        shared.record.result.totalCount = Object.values(execRes).reduce((sum, collection) => sum + Object.keys(collection).length, 0);
        return "default";
    }
}