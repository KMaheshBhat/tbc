import assert from 'node:assert';

import { HAMINode } from '@hami-frameworx/core';
import { Database } from 'bun:sqlite';

import type { TBCRecordSQLiteShared as Shared } from '../types.js';
import { ensureTables } from '../store.js';

type NodeInput = {
    storePath: string;
};

type NodeOutput = Array<{
    source_id: string;
    target_id: string;
    edge_type: string;
    attributes?: Record<string, any>;
}>;

export class FetchRelationsNode extends HAMINode<Shared> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return 'tbc-record-sqlite:fetch-relations';
    }

    async prep(shared: Shared): Promise<NodeInput> {
        assert(shared.record, 'shared.record is required');
        assert(shared.storePath, 'shared.storePath is required');
        return {
            storePath: shared.storePath,
        };
    }

    async exec(params: NodeInput): Promise<NodeOutput> {
        const db = new Database(params.storePath);
        try {
            // Ensure tables exist
            ensureTables(db);

            const query = db.query(`
                SELECT e.source_id, e.target_id, e.edge_type, e.created_at,
                       GROUP_CONCAT(ea.key || ':' || ea.value) as attrs
                FROM edges e
                LEFT JOIN edge_attributes ea ON e.source_id = ea.source_id
                    AND e.target_id = ea.target_id
                    AND e.edge_type = ea.edge_type
                GROUP BY e.source_id, e.target_id, e.edge_type
                ORDER BY e.created_at
            `);

            const rows = query.all() as Array<{
                source_id: string;
                target_id: string;
                edge_type: string;
                attrs: string | null;
            }>;

            return rows.map((row) => {
                const relation = {
                    source_id: row.source_id,
                    target_id: row.target_id,
                    edge_type: row.edge_type,
                };

                if (row.attrs) {
                    const attributes: Record<string, any> = {};
                    const attrPairs = row.attrs.split(',');
                    for (const pair of attrPairs) {
                        const [key, value] = pair.split(':', 2);
                        if (key && value !== undefined) {
                            attributes[key] = value;
                        }
                    }
                    (relation as any).attributes = attributes;
                }

                return relation;
            });
        } catch (error: any) {
            console.error(`Error fetching relations from ${params.storePath}:`, error);
            return [];
        } finally {
            db.close();
        }
    }

    async post(shared: Shared, _prepRes: NodeInput, execRes: NodeOutput): Promise<string | undefined> {
        assert(shared.record, 'shared.record is required');
        if (!shared.record.result) shared.record.result = {};
        (shared.record.result as any).relations = execRes;
        return 'default';
    }
}