import { HAMINode } from "@hami-frameworx/core";
import { Database } from "bun:sqlite";

import type { TBCRecordSQLiteStorage } from "../types.js";

type Relation = {
    source_id: string;
    target_id: string;
    edge_type: string;
    attributes?: Record<string, any>;
};

type StoreRelationsInput = {
    storePath: string;
    relations: Relation[];
    database: 'records' | 'meta';
};

type StoreRelationsOutput = number; // number of stored relations

export class StoreRelationsNode extends HAMINode<TBCRecordSQLiteStorage> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-record-sqlite:store-relations";
    }

    async prep(shared: TBCRecordSQLiteStorage): Promise<StoreRelationsInput> {
        if (!shared.storePath) {
            throw new Error("storePath is required in shared state");
        }
        const relations = (shared as any).relations || [];
        const database = shared.database || 'records';
        return {
            storePath: shared.storePath,
            relations,
            database,
        };
    }

    async exec(params: StoreRelationsInput): Promise<StoreRelationsOutput> {
        const db = new Database(params.storePath);
        try {
            // Ensure tables exist
            this.ensureTables(db);

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

    private ensureTables(db: Database): void {
        db.run(`
            CREATE TABLE IF NOT EXISTS nodes (
                id TEXT PRIMARY KEY,
                collection TEXT NOT NULL,
                record_type TEXT NOT NULL,
                hash TEXT NOT NULL,
                last_seen_at INTEGER NOT NULL,
                created_at INTEGER,
                file_path TEXT
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS node_attributes (
                node_id TEXT NOT NULL,
                key TEXT NOT NULL,
                value TEXT,
                value_type TEXT NOT NULL,
                updated_at INTEGER NOT NULL,
                PRIMARY KEY (node_id, key),
                FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS edges (
                source_id TEXT NOT NULL,
                target_id TEXT NOT NULL,
                edge_type TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                PRIMARY KEY (source_id, target_id, edge_type),
                FOREIGN KEY (source_id) REFERENCES nodes(id) ON DELETE CASCADE
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS edge_attributes (
                source_id TEXT NOT NULL,
                target_id TEXT NOT NULL,
                edge_type TEXT NOT NULL,
                key TEXT NOT NULL,
                value TEXT,
                PRIMARY KEY (source_id, target_id, edge_type, key),
                FOREIGN KEY (source_id, target_id, edge_type) REFERENCES edges(source_id, target_id, edge_type) ON DELETE CASCADE
            )
        `);
    }

    async post(shared: TBCRecordSQLiteStorage, _prepRes: StoreRelationsInput, execRes: StoreRelationsOutput): Promise<string | undefined> {
        // Store result in shared state if needed
        (shared as any).storedRelationsCount = execRes;
        return "default";
    }
}