import assert from "assert";
import { HAMINode } from "@hami-frameworx/core";

import { readdirSync } from "fs";
import { join } from "path";

import { TBCRecordFSStorage } from "../types.js";
import { TBCQueryParams, TBCQueryResult } from "@tbc-frameworx/tbc-record";

type QueryInput = {
    rootDirectory: string;
    collection: string;
    query: TBCQueryParams;
};

type QueryOutput = TBCQueryResult;

export class QueryNode extends HAMINode<TBCRecordFSStorage> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-record-fs:query";
    }

    async prep(shared: TBCRecordFSStorage): Promise<QueryInput> {
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

    async exec(params: QueryInput): Promise<QueryOutput> {
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

    private handleListAllIds(rootDirectory: string, query: TBCQueryParams, collection: string): TBCQueryResult {
        const collectionPath = join(rootDirectory, collection);
        try {
            const files = readdirSync(collectionPath);
            let ids = files
                .filter(file => file.endsWith('.md'))
                .map(file => file.replace(/\.md$/, ''));

            // Apply sorting if specified
            if (query.sortBy) {
                ids = this.sortIds(ids, query.sortBy, query.sortOrder || 'asc');
            }
            // TODO: Implement pagination when limit/offset parameters are added
            // if (query.limit !== undefined) {
            //     const offset = query.offset || 0;
            //     ids = ids.slice(offset, offset + query.limit);
            // }

            return {
                ids,
                totalCount: ids.length,
                hasMore: false, // TODO: Implement pagination
            };
        } catch (error: any) {
            if (error.code !== 'ENOENT') {
                console.error(`Error reading directory ${collectionPath}:`, error);
            }
            return { ids: [], totalCount: 0, hasMore: false };
        }
    }

    private handleFilterByTags(rootDirectory: string, query: TBCQueryParams, collection: string): TBCQueryResult {
        // TODO: Implement tag filtering
        // This would require reading frontmatter from files and checking record_tags
        throw new Error("filter-by-tags not yet implemented");
    }

    private handleSearchByContent(rootDirectory: string, query: TBCQueryParams, collection: string): TBCQueryResult {
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

    async post(shared: TBCRecordFSStorage, _prepRes: QueryInput, execRes: QueryOutput): Promise<string | undefined> {
        shared.record!.queryResult = execRes;
        return "default";
    }
}