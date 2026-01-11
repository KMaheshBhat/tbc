import assert from "assert";
import { HAMINode } from "@hami-frameworx/core";
import { Database } from "bun:sqlite";

import type { TBCRecordSQLiteShared as Shared } from "../types.js";
import { ensureTables } from "../store.js";

type Relation = {
    source_id: string;
    target_id: string;
    edge_type: string;
    attributes?: Record<string, any>;
};

type NodeInput = {
    storePath: string;
    relations: Relation[];
};

type NodeOutput = number; // number of stored relations

export class StoreRelationsNode extends HAMINode<Shared> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-record-sqlite:store-relations";
    }

    async prep(shared: Shared): Promise<NodeInput> {
        assert(shared.record, 'shared.record is required');
        assert(shared.storePath, 'shared.storePath is required');
        const relations = (shared.record as any).relations || [];
        return {
            storePath: shared.storePath,
            relations,
        };
    }

    async exec(params: NodeInput): Promise<NodeOutput> {
        const db = new Database(params.storePath);
        try {
            // Ensure tables exist
            ensureTables(db);

            let storedCount = 0;

            for (const relation of params.relations) {
                try {
                    await this.storeRelation(db, relation);
                    storedCount++;
                } catch (error) {
                    console.error(`Error storing relation ${relation.source_id}->${relation.target_id}:`, error);
                    // Continue with other relations
                }
            }

            return storedCount;
        } catch (error: any) {
            console.error(`Error storing relations to ${params.storePath}:`, error);
            return 0;
        } finally {
            db.close();
        }
    }

    private async storeRelation(db: Database, relation: Relation): Promise<void> {
        const now = Date.now();

        // Insert edge
        const edgeQuery = db.query(`
            INSERT OR REPLACE INTO edges (source_id, target_id, edge_type, created_at)
            VALUES (?, ?, ?, ?)
        `);
        edgeQuery.run(
            relation.source_id,
            relation.target_id,
            relation.edge_type,
            now
        );

        // Store edge attributes if any
        if (relation.attributes) {
            const attrQuery = db.query(`
                INSERT OR REPLACE INTO edge_attributes (source_id, target_id, edge_type, key, value)
                VALUES (?, ?, ?, ?, ?)
            `);

            for (const [key, value] of Object.entries(relation.attributes)) {
                const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
                attrQuery.run(
                    relation.source_id,
                    relation.target_id,
                    relation.edge_type,
                    key,
                    valueStr
                );
            }
        }
    }


    async post(shared: Shared, _prepRes: NodeInput, execRes: NodeOutput): Promise<string | undefined> {
        assert(shared.record, 'shared.record is required');
        if (!shared.record.result) shared.record.result = {};
        (shared.record.result as any).storedRelationsCount = execRes;
        return "default";
    }
}