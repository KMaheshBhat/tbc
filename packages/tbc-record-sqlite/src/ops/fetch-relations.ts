import { HAMINode } from "@hami-frameworx/core";
import { Database } from "bun:sqlite";

import type { TBCRecordSQLiteStorage } from "../types.js";

type FetchRelationsInput = {
    storePath: string;
    database: 'records' | 'meta';
};

type FetchRelationsOutput = Array<{
    source_id: string;
    target_id: string;
    edge_type: string;
    attributes?: Record<string, any>;
}>;

export class FetchRelationsNode extends HAMINode<TBCRecordSQLiteStorage> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-record-sqlite:fetch-relations";
    }

    async prep(shared: TBCRecordSQLiteStorage): Promise<FetchRelationsInput> {
        if (!shared.storePath) {
            throw new Error("storePath is required in shared state");
        }
        const database = shared.database || 'records';
        return {
            storePath: shared.storePath,
            database,
        };
    }

    async exec(params: FetchRelationsInput): Promise<FetchRelationsOutput> {
        const db = new Database(params.storePath);
        try {
            // Ensure tables exist
            this.ensureTables(db);

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

            return rows.map(row => {
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

    async post(shared: TBCRecordSQLiteStorage, _prepRes: FetchRelationsInput, execRes: FetchRelationsOutput): Promise<string | undefined> {
        // Store relations in shared state if needed
        (shared as any).relations = execRes;
        return "default";
    }
}