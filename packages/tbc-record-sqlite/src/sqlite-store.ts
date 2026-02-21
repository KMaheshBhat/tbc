import { Database } from 'bun:sqlite';
import { RDBMSStore } from '@tbc-frameworx/tbc-record';

class SQLiteStore implements RDBMSStore {
    private db: Database | null = null;
    private dbPath: string;

    constructor(dbPath: string = ':memory:') {
        this.dbPath = dbPath;
    }

    async initialize(): Promise<void> {
        if (this.db) return;

        this.db = new Database(this.dbPath);
        this.db.run('PRAGMA foreign_keys = ON');
        this.db.run('PRAGMA journal_mode = WAL');
        this.db.run('PRAGMA synchronous = NORMAL');

        this.db.run(`
            CREATE TABLE IF NOT EXISTS record (
                record_id TEXT PRIMARY KEY,
                record_kind TEXT NOT NULL,
                collection TEXT NOT NULL,
                content_hash TEXT,
                data TEXT NOT NULL DEFAULT '{}',
                created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
                updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
            ) STRICT
        `);

        this.db.run(`
            CREATE TABLE IF NOT EXISTS record_relation (
                relation_id TEXT PRIMARY KEY,
                relation_kind TEXT NOT NULL,
                from_record_id TEXT NOT NULL REFERENCES record(record_id) ON DELETE CASCADE,
                to_record_id TEXT NOT NULL REFERENCES record(record_id) ON DELETE CASCADE,
                data TEXT NOT NULL DEFAULT '{}',
                valid_from TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
                valid_to TEXT,
                created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
                updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
            ) STRICT
        `);

        this.db.run('CREATE INDEX IF NOT EXISTS idx_record_lookup ON record(collection, record_kind)');
        this.db.run('CREATE INDEX IF NOT EXISTS idx_relation_out ON record_relation(from_record_id, relation_kind)');
        this.db.run('CREATE INDEX IF NOT EXISTS idx_relation_in ON record_relation(to_record_id, relation_kind)');
    }

    async teardown(): Promise<void> {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }

    async upsertNode(id: string, kind: string, collection: string, data: Record<string, any>, contentHash?: string): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');
        const dataJson = JSON.stringify(data);
        const now = new Date().toISOString();

        const stmt = this.db.prepare(`
            INSERT INTO record (record_id, record_kind, collection, content_hash, data, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(record_id) DO UPDATE SET
                record_kind = excluded.record_kind,
                collection = excluded.collection,
                content_hash = excluded.content_hash,
                data = excluded.data,
                updated_at = excluded.updated_at
        `);
        stmt.run(id, kind, collection, contentHash ?? null, dataJson, now, now);
    }

    async getNode(id: string): Promise<Record<string, any> | null> {
        if (!this.db) throw new Error('Database not initialized');
        const row = this.db.query('SELECT data FROM record WHERE record_id = ?').get(id) as { data: string } | null;
        return row ? JSON.parse(row.data) : null;
    }

    async deleteNode(id: string): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');
        this.db.run('DELETE FROM record WHERE record_id = ?', [id]);
    }

    async upsertEdge(id: string, kind: string, fromId: string, toId: string, data: Record<string, any>): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');
        const dataJson = JSON.stringify(data);
        const now = new Date().toISOString();

        const stmt = this.db.prepare(`
            INSERT INTO record_relation (relation_id, relation_kind, from_record_id, to_record_id, data, valid_from, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(relation_id) DO UPDATE SET
                relation_kind = excluded.relation_kind,
                from_record_id = excluded.from_record_id,
                to_record_id = excluded.to_record_id,
                data = excluded.data,
                updated_at = excluded.updated_at
        `);
        stmt.run(id, kind, fromId, toId, dataJson, now, now, now);
    }

    async deleteEdges(fromId: string, kind?: string): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');
        if (kind) {
            this.db.run('DELETE FROM record_relation WHERE from_record_id = ? AND relation_kind = ?', [fromId, kind]);
        } else {
            this.db.run('DELETE FROM record_relation WHERE from_record_id = ?', [fromId]);
        }
    }

    // packages/tbc-record-sqlite/src/sqlite-store.ts

    async getRelatedIds(id: string, direction: 'in' | 'out' | 'both', kind?: string, atDate?: string): Promise<string[]> {
        if (!this.db) throw new Error('Database not initialized');

        const referenceDate = atDate ?? new Date().toISOString();
        const ids: string[] = [];

        const buildQuery = (col: string, target: string) => {
            // Logic: Valid if (started before/on now) AND (not yet ended OR ends after now)
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

    /**
     * Enhanced List with Sorting and Pagination
     */
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

        if (options.limit !== undefined) { query += ' LIMIT ?'; params.push(options.limit); }
        if (options.offset !== undefined) { query += ' OFFSET ?'; params.push(options.offset); }

        const rows = this.db.query(query).all(...params) as { record_id: string }[];
        return rows.map(r => r.record_id);
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

    async searchNodes(text: string, collection?: string): Promise<string[]> {
        if (!this.db) throw new Error('Database not initialized');
        let query = 'SELECT record_id FROM record WHERE data LIKE ?';
        const params: any[] = [`%${text}%`];
        if (collection) { query += ' AND collection = ?'; params.push(collection); }
        const rows = this.db.query(query).all(...params) as { record_id: string }[];
        return rows.map(r => r.record_id);
    }
}

export { SQLiteStore };
