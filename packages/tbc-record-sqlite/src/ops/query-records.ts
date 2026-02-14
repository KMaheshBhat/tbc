import assert from 'node:assert';

import { HAMINode } from '@hami-frameworx/core';
import { Database } from 'bun:sqlite';

import { TBCQueryParams, TBCResult } from '@tbc-frameworx/tbc-record';

import type { TBCRecordSQLiteShared as Shared } from '../types.js';
import { ensureTables } from '../store.js';

type NodeInput = {
    storePath: string;
    collection: string;
    query: TBCQueryParams;
};

type NodeOutput = TBCResult;

export class QueryRecordsNode extends HAMINode<Shared> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return 'tbc-record-sqlite:query-records';
    }

    async prep(shared: Shared): Promise<NodeInput> {
        assert(shared.record, 'shared.record is required');
        assert(shared.storePath, 'shared.storePath is required');
        assert(shared.record.collection, 'shared.record.collection is required');
        assert(shared.record.query, 'shared.record.query is required');
        return {
            storePath: shared.storePath!,
            collection: shared.record.collection!,
            query: shared.record.query!,
        };
    }

    async exec(params: NodeInput): Promise<NodeOutput> {
        const { storePath, collection, query } = params;

        switch (query.type) {
            case 'list-all-ids':
                return this.handleListAllIds(storePath, query, collection);
            case 'filter-by-tags':
                return this.handleFilterByTags(storePath, query, collection);
            case 'search-by-content':
                return this.handleSearchByContent(storePath, query, collection);
            default:
                throw new Error(`Unsupported query type: ${query.type}`);
        }
    }

    private handleListAllIds(storePath: string, query: TBCQueryParams, collection: string): TBCResult {
        const db = new Database(storePath);
        try {
            // Ensure tables exist
            ensureTables(db);

            const querySql = db.query('SELECT id FROM nodes WHERE collection = ? ORDER BY id');
            const rows = querySql.all(collection) as { id: string }[];
            const IDs = rows.map((row) => row.id);

            // Apply sorting if specified
            if (query.sortBy) {
                IDs.sort((a, b) => {
                    let comparison = 0;
                    switch (query.sortBy) {
                        case 'id':
                            comparison = a.localeCompare(b);
                            break;
                        case 'created':
                        case 'modified':
                            // For now, sort by ID as we don't have timestamps
                            comparison = a.localeCompare(b);
                            break;
                    }
                    return query.sortOrder === 'desc' ? -comparison : comparison;
                });
            }

            return {
                IDs: IDs,
                totalCount: IDs.length,
            };
        } catch (error: any) {
            console.error(`Error fetching IDs from ${storePath}:`, error);
            return { IDs: [], totalCount: 0 };
        } finally {
            db.close();
        }
    }

    private handleFilterByTags(storePath: string, query: TBCQueryParams, collection: string): TBCResult {
        // TODO: Implement tag filtering
        // This would require reading node_attributes for record_tags
        throw new Error('filter-by-tags not yet implemented');
    }

    private handleSearchByContent(storePath: string, query: TBCQueryParams, collection: string): TBCResult {
        // TODO: Implement content search
        // This would require reading node_attributes for content
        throw new Error('search-by-content not yet implemented');
    }

    async post(shared: Shared, _prepRes: NodeInput, execRes: NodeOutput): Promise<string | undefined> {
        if (!shared.record!.result) shared.record!.result = {};
        Object.assign(shared.record!.result, execRes);
        return 'default';
    }
}