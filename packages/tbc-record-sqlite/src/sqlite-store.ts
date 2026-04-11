import { Database } from 'bun:sqlite';
import {
    RecordStore,
    TBCRecordStoreCapability,
    TBCRecord,
    TBCStore,
    TBCQueryParams
} from '@tbc-frameworx/tbc-record';
import assert from 'assert';

class SQLiteStore implements RecordStore {
    private db: Database | null = null;
    private dbPath: string;

    constructor(dbPath: string = ':memory:') {
        this.dbPath = dbPath;
    }

    async initialize(config?: Record<string, any>): Promise<TBCRecordStoreCapability[]> {
        if (config?.dbPath) {
            this.dbPath = config.dbPath;
        }

        if (!this.db) {
            this.db = new Database(this.dbPath);
            this.db.run('PRAGMA foreign_keys = ON');
            this.db.run('PRAGMA journal_mode = WAL');
            this.db.run('PRAGMA synchronous = NORMAL');

            this.db.run(`
                CREATE TABLE IF NOT EXISTS record (
                    record_id TEXT NOT NULL,
                    collection TEXT NOT NULL,
                    record_kind TEXT NOT NULL,
                    content_hash TEXT,
                    data TEXT NOT NULL DEFAULT '{}',
                    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
                    updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
                    PRIMARY KEY (collection, record_id)
                ) STRICT
            `);

            this.db.run(`
                CREATE TABLE IF NOT EXISTS record_relation (
                    relation_id TEXT PRIMARY KEY,
                    relation_kind TEXT NOT NULL,
                    collection TEXT NOT NULL,
                    from_record_id TEXT NOT NULL,
                    to_record_id TEXT NOT NULL,
                    data TEXT NOT NULL DEFAULT '{}',
                    valid_from TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
                    valid_to TEXT,
                    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
                    updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
                    FOREIGN KEY (collection, from_record_id) REFERENCES record(collection, record_id) ON DELETE CASCADE,
                    FOREIGN KEY (collection, to_record_id) REFERENCES record(collection, record_id) ON DELETE CASCADE
                ) STRICT
            `);

            this.db.run('CREATE INDEX IF NOT EXISTS idx_record_lookup ON record(collection, record_kind)');
            this.db.run('CREATE INDEX IF NOT EXISTS idx_relation_out ON record_relation(collection, from_record_id, relation_kind)');
            this.db.run('CREATE INDEX IF NOT EXISTS idx_relation_in ON record_relation(collection, to_record_id, relation_kind)');
        }

        return ['store', 'query', 'fetch', 'graph'];
    }

    async teardown(): Promise<void> {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }

    /* ============================================================
       RecordStore Implementation
    ============================================================ */
    async store(
        collection: string,
        records: TBCRecord[],
        relations: any[] = []
    ): Promise<void> {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        const tx = this.db.transaction((recs, rels) => {
            for (const rec of recs) {
                this.upsertNode(rec.id, rec.kind, collection, rec, rec.contentHash);
            }
            for (const rel of rels) {
                this.upsertEdge(
                    rel.id,
                    rel.kind,
                    rel.from || rel.from_record_id,
                    rel.to || rel.to_record_id,
                    collection,
                    rel.data || {}
                );
            }
        });

        // Let it throw naturally
        tx(records, relations);
    }
    async query(collection: string, params: TBCQueryParams): Promise<string[]> {
        if (params.type === 'search-by-content' && params.searchTerm) {
            return this.searchNodes(params.searchTerm, collection, params.recordType);
        }

        return this.listNodeIds({
            collection,
            sortBy: params.sortBy as any,
            sortOrder: params.sortOrder,
            limit: params.limit,
            offset: params.offset,
            kind: params.recordType,
        });
    }

    async fetch(collection: string, ids: string[]): Promise<TBCStore> {
        const store: TBCStore = { [collection]: {} };
        assert(this.db, 'need a db connection');

        const stmt = this.db.prepare('SELECT data FROM record WHERE record_id = ? AND collection = ?');

        for (const id of ids) {
            const row = stmt.get(id, collection) as { data: string } | null;
            if (row) {
                store[collection][id] = JSON.parse(row.data);
            }
        }
        return store;
    }

    async graph(collection: string, id: string, direction: 'in' | 'out' | 'both', kind?: string): Promise<string[]> {
        return this.getRelatedIds(id, direction, kind, undefined, collection);
    }

    /* ============================================================
       RDBMSStore / Internal Methods
    ============================================================ */

    upsertNode(id: string, kind: string, collection: string, data: Record<string, any>, contentHash?: string) {
        if (!this.db) throw new Error('Database not initialized');
        const dataJson = JSON.stringify(data);
        const now = new Date().toISOString();

        const stmt = this.db.prepare(`
            INSERT INTO record (record_id, record_kind, collection, content_hash, data, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(collection, record_id) DO UPDATE SET
                record_kind = excluded.record_kind,
                content_hash = excluded.content_hash,
                data = excluded.data,
                updated_at = excluded.updated_at
        `);
        stmt.run(id, kind, collection, contentHash ?? null, dataJson, now, now);
    }

    async getNode(id: string, collection?: string): Promise<Record<string, any> | null> {
        if (!this.db) throw new Error('Database not initialized');
        let query = 'SELECT data FROM record WHERE record_id = ?';
        const params: any[] = [id];

        if (collection) {
            query += ' AND collection = ?';
            params.push(collection);
        }

        const row = this.db.query(query).get(...params) as { data: string } | null;
        return row ? JSON.parse(row.data) : null;
    }

    async deleteNode(id: string, collection?: string): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');
        if (collection) {
            this.db.run('DELETE FROM record WHERE record_id = ? AND collection = ?', [id, collection]);
        } else {
            this.db.run('DELETE FROM record WHERE record_id = ?', [id]);
        }
    }

    upsertEdge(
        id: string,
        kind: string,
        fromId: string,
        toId: string,
        collection: string,
        data: Record<string, any>,
    ) {
        if (!this.db) throw new Error('Database not initialized');
        const dataJson = JSON.stringify(data);
        const now = new Date().toISOString();

        const stmt = this.db.prepare(`
            INSERT INTO record_relation (
                relation_id, relation_kind, collection, from_record_id, to_record_id, 
                data, valid_from, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(relation_id) DO UPDATE SET
                relation_kind = excluded.relation_kind,
                collection = excluded.collection,
                from_record_id = excluded.from_record_id,
                to_record_id = excluded.to_record_id,
                data = excluded.data,
                updated_at = excluded.updated_at
        `);
        stmt.run(id, kind, collection, fromId, toId, dataJson, now, now, now);
    }

    async deleteEdges(fromId: string, kind?: string, collection?: string): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        let query = 'DELETE FROM record_relation WHERE from_record_id = ?';
        const params: any[] = [fromId];

        if (kind) {
            query += ' AND relation_kind = ?';
            params.push(kind);
        }

        if (collection) {
            query += ' AND collection = ?';
            params.push(collection);
        }

        this.db.run(query, params);
    }

    async getRelatedIds(id: string, direction: 'in' | 'out' | 'both', kind?: string, atDate?: string, collection?: string): Promise<string[]> {
        if (!this.db) throw new Error('Database not initialized');

        const referenceDate = atDate ?? new Date().toISOString();
        const ids: string[] = [];

        const buildQuery = (col: string, target: string) => {
            let q = `
                SELECT ${col} FROM record_relation 
                WHERE ${target} = ? 
                AND valid_from <= ? 
                AND (valid_to IS NULL OR valid_to > ?)
            `;
            const p: any[] = [id, referenceDate, referenceDate];
            if (kind) {
                q += ' AND relation_kind = ?';
                p.push(kind);
            }
            if (collection) {
                q += ' AND collection = ?';
                p.push(collection);
            }
            return { q, p };
        };

        if (direction === 'out' || direction === 'both') {
            const { q, p } = buildQuery('to_record_id', 'from_record_id');
            const rows = this.db.query(q).all(...p) as { to_record_id: string }[];
            ids.push(...rows.map(r => r.to_record_id));
        }

        if (direction === 'in' || direction === 'both') {
            const { q, p } = buildQuery('from_record_id', 'to_record_id');
            const rows = this.db.query(q).all(...p) as { from_record_id: string }[];
            ids.push(...rows.map(r => r.from_record_id));
        }

        return [...new Set(ids)];
    }

    async countNodes(kind?: string, collection?: string): Promise<number> {
        if (!this.db) throw new Error('Database not initialized');
        let query = 'SELECT COUNT(*) as total FROM record WHERE 1=1';
        const params: any[] = [];
        if (kind) { query += ' AND record_kind = ?'; params.push(kind); }
        if (collection) { query += ' AND collection = ?'; params.push(collection); }
        const result = this.db.query(query).get(...params) as { total: number };
        return result.total;
    }

    async listNodeIds(options: {
        kind?: string;
        collection?: string;
        sortBy?: 'id' | 'created' | 'updated';
        sortOrder?: 'asc' | 'desc';
        limit?: number;
        offset?: number;
    }): Promise<string[]> {
        if (!this.db) throw new Error('Database not initialized');

        let query = 'SELECT record_id FROM record WHERE 1=1';
        const params: any[] = [];

        if (options.kind) { query += ' AND record_kind = ?'; params.push(options.kind); }
        if (options.collection) { query += ' AND collection = ?'; params.push(options.collection); }

        const sortCol = options.sortBy === 'created' ? 'created_at' : options.sortBy === 'updated' ? 'updated_at' : 'record_id';
        const order = options.sortOrder?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
        query += ` ORDER BY ${sortCol} ${order}`;

        if (options.limit !== undefined) {
            query += ' LIMIT ?';
            params.push(options.limit);
        } else if (options.offset !== undefined) {
            query += ' LIMIT -1';
        }

        if (options.offset !== undefined) {
            query += ' OFFSET ?';
            params.push(options.offset);
        }

        const rows = this.db.query(query).all(...params) as { record_id: string }[];
        return rows.map(r => r.record_id);
    }

    async searchNodes(text: string, collection?: string, recordType?: string): Promise<string[]> {
        if (!this.db) throw new Error('Database not initialized');
        let query = 'SELECT record_id FROM record WHERE data LIKE ?';
        const params: any[] = [`%${text}%`];
        if (collection) { query += ' AND collection = ?'; params.push(collection); }
        if (recordType) { query += ' AND record_kind = ?'; params.push(recordType); }
        const rows = this.db.query(query).all(...params) as { record_id: string }[];
        return rows.map(r => r.record_id);
    }
}

export { SQLiteStore };
