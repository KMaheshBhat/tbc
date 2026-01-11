import assert from "assert";
import { HAMINode } from "@hami-frameworx/core";

import { readdirSync, statSync } from "fs";
import { join, relative } from "path";

import { TBCRecordFSShared as Shared } from "../types.js";
import { TBCQueryParams, TBCResult } from "@tbc-frameworx/tbc-record";

type NodeInput = {
    rootDirectory: string;
    collection: string;
    query: TBCQueryParams;
};

type NodeOutput = TBCResult;

export class QueryRecordsNode extends HAMINode<Shared> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-record-fs:query-records";
    }

    async prep(shared: Shared): Promise<NodeInput> {
        assert(shared.record, 'shared.record is required');
        assert(shared.record.rootDirectory, 'shared.record.rootDirectory is required');
        assert(shared.record.collection, 'shared.record.collection is required');
        assert(shared.record.query, 'shared.record.query is required');
        return {
            rootDirectory: shared.record.rootDirectory!,
            collection: shared.record.collection!,
            query: shared.record.query!,
        };
    }

    async exec(params: NodeInput): Promise<NodeOutput> {
        const { rootDirectory, collection, query } = params;

        switch (query.type) {
            case 'list-all-ids':
                return this.handleListAllIds(rootDirectory, query, collection);
            case 'filter-by-tags':
                return this.handleFilterByTags(rootDirectory, query, collection);
            case 'search-by-content':
                return this.handleSearchByContent(rootDirectory, query, collection);
            default:
                throw new Error(`Unsupported query type: ${query.type}`);
        }
    }

    private handleListAllIds(rootDirectory: string, query: TBCQueryParams, collection: string): TBCResult {
        const collectionPath = join(rootDirectory, collection);
        try {
            let IDs: string[];
            if (query.recursive) {
                IDs = this.getAllRecordFiles(collectionPath, collectionPath);
            } else {
                const items = readdirSync(collectionPath);
                IDs = items.filter(item => {
                    const fullPath = join(collectionPath, item);
                    const stat = statSync(fullPath);
                    return stat.isFile();
                });
            }

            // Apply sorting if specified
            if (query.sortBy) {
                IDs = this.sortIds(IDs, query.sortBy, query.sortOrder || 'asc');
            }
            // TODO: Implement pagination when limit/offset parameters are added
            // if (query.limit !== undefined) {
            //     const offset = query.offset || 0;
            //     ids = ids.slice(offset, offset + query.limit);
            // }

            return {
                IDs: IDs,
                totalCount: IDs.length,
            };
        } catch (error: any) {
            if (error.code !== 'ENOENT') {
                console.error(`Error reading directory ${collectionPath}:`, error);
            }
            return { IDs: [], totalCount: 0 };
        }
    }

    private handleFilterByTags(rootDirectory: string, query: TBCQueryParams, collection: string): TBCResult {
        // TODO: Implement tag filtering
        // This would require reading frontmatter from files and checking record_tags
        throw new Error("filter-by-tags not yet implemented");
    }

    private handleSearchByContent(rootDirectory: string, query: TBCQueryParams, collection: string): TBCResult {
        // TODO: Implement content search
        // This would require reading file contents and searching for the term
        throw new Error("search-by-content not yet implemented");
    }

    private sortIds(ids: string[], sortBy: 'id' | 'created' | 'modified', sortOrder: 'asc' | 'desc'): string[] {
        return ids.sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'id':
                    comparison = a.localeCompare(b);
                    break;
                case 'created':
                case 'modified':
                    // For now, sort by ID as we don't have timestamps
                    comparison = a.localeCompare(b);
                    break;
            }
            return sortOrder === 'desc' ? -comparison : comparison;
        });
    }

    private getAllRecordFiles(dir: string, relativeTo: string): string[] {
        const files: string[] = [];
        try {
            const items = readdirSync(dir);
            for (const item of items) {
                const fullPath = join(dir, item);
                const stat = statSync(fullPath);
                if (stat.isDirectory()) {
                    files.push(...this.getAllRecordFiles(fullPath, relativeTo));
                } else {
                    const relativePath = relative(relativeTo, fullPath);
                    files.push(relativePath);
                }
            }
        } catch (error) {
            // Directory doesn't exist or other error, return empty
        }
        return files;
    }

    async post(
        shared: Shared,
        _prepRes: NodeInput,
        execRes: NodeOutput,
    ): Promise<string> {
        if (!shared.record!.result) shared.record!.result = {};
        Object.assign(shared.record!.result, execRes);
        return "default";
    }
}