import { Database } from "bun:sqlite";
import * as fs from "fs";
import * as path from "path";

export interface NodeRecord {
  id: string;
  collection: string;
  record_type: string;
  hash: string;
  last_seen_at: number;
  created_at?: number;
  file_path: string;
}

export interface EdgeRecord {
  source_id: string;
  target_id: string;
  edge_type: string;
  created_at: number;
}

export interface NodeAttribute {
  node_id: string;
  key: string;
  value: string | null;
  value_type: 'string' | 'number' | 'boolean' | 'json' | 'null';
  updated_at: number;
}

export interface NodeWatermark {
  node_id: string;
  watermark_type: 'presence' | 'schema' | 'structure' | 'links' | 'vector';
  status: 0 | 1 | 2 | 3; // 0=fail, 1=pass, 2=pending, 3=error
  message?: string;
  updated_at: number;
  checked_by?: string;
}

export class DexStore {
  private db: Database;

  constructor(dbPath: string) {
    // Ensure the directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.db = new Database(dbPath);
    this.initialize();
  }

  private initialize(): void {
    // Core node identity
    this.db.run(`
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

    // Extensible key-value metadata store
    this.db.run(`
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

    // Explicit directed relationships between nodes
    this.db.run(`
      CREATE TABLE IF NOT EXISTS edges (
        source_id TEXT NOT NULL,
        target_id TEXT NOT NULL,
        edge_type TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        PRIMARY KEY (source_id, target_id, edge_type),
        FOREIGN KEY (source_id) REFERENCES nodes(id) ON DELETE CASCADE
      )
    `);

    // Optional metadata for relationships
    this.db.run(`
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

    // Integrity and processing status tracking (Watermarks)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS node_watermarks (
        node_id TEXT NOT NULL,
        watermark_type TEXT NOT NULL,
        status INTEGER NOT NULL,
        message TEXT,
        updated_at INTEGER NOT NULL,
        checked_by TEXT,
        PRIMARY KEY (node_id, watermark_type),
        FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
      )
    `);

    // Indexes for performance
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_nodes_collection ON nodes(collection)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_nodes_record_type ON nodes(record_type)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_edges_target ON edges(target_id)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_watermarks_status ON node_watermarks(status)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_watermarks_type ON node_watermarks(watermark_type)`);
  }

  // Node operations
  upsertNode(node: Omit<NodeRecord, 'last_seen_at'> & { last_seen_at?: number }): void {
    const now = Math.floor(Date.now() / 1000);
    const lastSeenAt = node.last_seen_at ?? now;

    this.db.run(`
      INSERT OR REPLACE INTO nodes (id, collection, record_type, hash, last_seen_at, created_at, file_path)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [node.id, node.collection, node.record_type, node.hash, lastSeenAt, node.created_at ?? now, node.file_path]);
  }

  getNode(id: string): NodeRecord | null {
    const result = this.db.query(`SELECT * FROM nodes WHERE id = ?`).get(id) as NodeRecord | undefined;
    return result ?? null;
  }

  getNodesByCollection(collection: string): NodeRecord[] {
    return this.db.query(`SELECT * FROM nodes WHERE collection = ?`).all(collection) as NodeRecord[];
  }

  // Attribute operations
  upsertAttribute(attr: NodeAttribute): void {
    this.db.run(`
      INSERT OR REPLACE INTO node_attributes (node_id, key, value, value_type, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `, [attr.node_id, attr.key, attr.value, attr.value_type, attr.updated_at]);
  }

  upsertAttributes(nodeId: string, attributes: Record<string, any>): void {
    const now = Math.floor(Date.now() / 1000);
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO node_attributes (node_id, key, value, value_type, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const [key, value] of Object.entries(attributes)) {
      const valueType = typeof value;
      let valueStr: string | null = null;
      let type: NodeAttribute['value_type'] = 'null';

      if (value !== null && value !== undefined) {
        if (valueType === 'object') {
          valueStr = JSON.stringify(value);
          type = 'json';
        } else {
          valueStr = String(value);
          type = valueType as NodeAttribute['value_type'];
        }
      }

      stmt.run(nodeId, key, valueStr, type, now);
    }
  }

  getAttributes(nodeId: string): Record<string, any> {
    const results = this.db.query(`SELECT key, value, value_type FROM node_attributes WHERE node_id = ?`).all(nodeId) as Array<{key: string, value: string | null, value_type: string}>;
    const attrs: Record<string, any> = {};

    for (const row of results) {
      let parsedValue: any = null;
      if (row.value !== null) {
        switch (row.value_type) {
          case 'number':
            parsedValue = Number(row.value);
            break;
          case 'boolean':
            parsedValue = row.value === 'true';
            break;
          case 'json':
            try {
              parsedValue = JSON.parse(row.value);
            } catch {
              parsedValue = row.value;
            }
            break;
          default:
            parsedValue = row.value;
        }
      }
      attrs[row.key] = parsedValue;
    }

    return attrs;
  }

  // Edge operations
  upsertEdge(edge: EdgeRecord): void {
    this.db.run(`
      INSERT OR REPLACE INTO edges (source_id, target_id, edge_type, created_at)
      VALUES (?, ?, ?, ?)
    `, [edge.source_id, edge.target_id, edge.edge_type, edge.created_at]);
  }

  upsertEdges(nodeId: string, edges: Omit<EdgeRecord, 'source_id'>[]): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO edges (source_id, target_id, edge_type, created_at)
      VALUES (?, ?, ?, ?)
    `);

    for (const edge of edges) {
      stmt.run(nodeId, edge.target_id, edge.edge_type, edge.created_at);
    }
  }

  getEdgesFrom(nodeId: string): EdgeRecord[] {
    return this.db.query(`SELECT * FROM edges WHERE source_id = ?`).all(nodeId) as EdgeRecord[];
  }

  getEdgesTo(nodeId: string): EdgeRecord[] {
    return this.db.query(`SELECT * FROM edges WHERE target_id = ?`).all(nodeId) as EdgeRecord[];
  }

  // Watermark operations
  setWatermark(nodeId: string, type: NodeWatermark['watermark_type'], status: NodeWatermark['status'], message?: string, checkedBy?: string): void {
    const now = Math.floor(Date.now() / 1000);
    this.db.run(`
      INSERT OR REPLACE INTO node_watermarks (node_id, watermark_type, status, message, updated_at, checked_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [nodeId, type, status, message ?? null, now, checkedBy ?? null]);
  }

  getWatermarkStatus(nodeId: string, type: NodeWatermark['watermark_type']): NodeWatermark | null {
    const result = this.db.query(`SELECT * FROM node_watermarks WHERE node_id = ? AND watermark_type = ?`).get(nodeId, type) as NodeWatermark | undefined;
    return result ?? null;
  }

  getWatermarks(nodeId: string): NodeWatermark[] {
    return this.db.query(`SELECT * FROM node_watermarks WHERE node_id = ?`).all(nodeId) as NodeWatermark[];
  }

  // Utility methods
  beginTransaction(): void {
    this.db.run('BEGIN TRANSACTION');
  }

  commit(): void {
    this.db.run('COMMIT');
  }

  rollback(): void {
    this.db.run('ROLLBACK');
  }

  close(): void {
    this.db.close();
  }

  // Health check queries
  getSystemHealthSummary(): { total_records: number, healthy_records: number, health_percentage: number } {
    const result = this.db.query(`
      SELECT
        COUNT(*) as total_records,
        COALESCE(SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END), 0) as healthy_records,
        CASE
          WHEN COUNT(*) = 0 THEN 0.0
          ELSE ROUND(
            COALESCE(SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END), 0) * 100.0 / COUNT(*),
            2
          )
        END as health_percentage
      FROM node_watermarks
      WHERE watermark_type IN ('presence', 'schema', 'structure', 'links')
    `).get() as { total_records: number, healthy_records: number, health_percentage: number };

    return result;
  }

  getZombieLinks(): Array<{ source_id: string, target_id: string, source_collection: string, source_type: string, edge_type: string }> {
    return this.db.query(`
      SELECT
        e.source_id,
        e.target_id,
        n_src.collection as source_collection,
        n_src.record_type as source_type,
        e.edge_type
      FROM edges e
      JOIN nodes n_src ON e.source_id = n_src.id
      LEFT JOIN nodes n_target ON e.target_id = n_target.id
      WHERE n_target.id IS NULL
    `).all() as Array<{ source_id: string, target_id: string, source_collection: string, source_type: string, edge_type: string }>;
  }

  getOrphanRecords(): Array<{ id: string, collection: string, record_type: string, title?: string }> {
    return this.db.query(`
      SELECT
        n.id,
        n.collection,
        n.record_type,
        na_title.value as title
      FROM nodes n
      LEFT JOIN edges e ON n.id = e.target_id
      LEFT JOIN node_attributes na_title ON n.id = na_title.node_id AND na_title.key = 'title'
      WHERE n.collection IN ('mem', 'sys')
        AND e.source_id IS NULL
    `).all() as Array<{ id: string, collection: string, record_type: string, title?: string }>;
  }

  getSchemaViolations(): Array<{ id: string, collection: string, record_type: string, violation_details?: string }> {
    return this.db.query(`
      SELECT
        n.id,
        n.collection,
        n.record_type,
        w.message as violation_details
      FROM nodes n
      JOIN node_watermarks w ON n.id = w.node_id
      WHERE w.watermark_type = 'schema' AND w.status = 0
    `).all() as Array<{ id: string, collection: string, record_type: string, violation_details?: string }>;
  }
}