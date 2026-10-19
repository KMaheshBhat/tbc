import { Database } from 'bun:sqlite';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import type { TBCRecord } from './fs.js';

export interface TBCProtocol {
  rootDirectory: string;
  sysCollection: string;
  skillsCollection: string;
  memCollection: string;
  dexCollection: string;
  actCollection: string;
  hasSqlite: boolean;
  sqlitePath: string;
}

export function ensureRecordTable(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS record (
        record_id TEXT NOT NULL,
        collection TEXT NOT NULL,
        record_kind TEXT NOT NULL,
        content_hash TEXT,
        data TEXT NOT NULL DEFAULT '{}',
        created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        PRIMARY KEY (collection, record_id)
    ) STRICT;
  `);
}

/**
 * The legacy-compatible `record_relation` shape.
 *
 * The NG layer historically created a divergent table
 * (`id, source_collection, source_record_id, target_collection,
 *  target_record_id, relation_type, created_at`). The legacy
 * `tbc-record-sqlite` store expects the shape below and unconditionally
 * creates `idx_relation_out ON record_relation(collection, from_record_id,
 * relation_kind)`, which made every legacy command fail on an NG-created
 * database with `no such column: collection`.
 *
 * The legacy shape is a capability superset (relation identity, relation kind,
 * payload, temporal validity), so the NG layer adopts it. Foreign keys are
 * intentionally omitted: the legacy store enables `PRAGMA foreign_keys = ON`
 * and inserts relation targets that are not always present in `record`,
 * which would turn the schema convergence into a hard failure.
 */
const RELATION_TABLE_DDL = `
  CREATE TABLE IF NOT EXISTS record_relation (
      relation_id      TEXT PRIMARY KEY,
      relation_kind    TEXT NOT NULL,
      collection       TEXT NOT NULL,
      from_record_id   TEXT NOT NULL,
      to_record_id     TEXT NOT NULL,
      data             TEXT NOT NULL DEFAULT '{}',
      valid_from       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      valid_to         TEXT,
      created_at       TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at       TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  ) STRICT;
`;

/** The columns a legacy-compatible `record_relation` table must expose. */
const RELATION_COLUMNS = [
  'relation_id', 'relation_kind', 'collection', 'from_record_id',
  'to_record_id', 'data', 'valid_from', 'valid_to', 'created_at', 'updated_at',
];

function tableColumns(db: Database, table: string): string[] {
  const rows = db.query(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return rows.map((column) => column.name);
}

/**
 * Ensure a `record_relation` table exists in the legacy-compatible shape.
 *
 * - table absent            → create it (legacy-compatible shape + indexes)
 * - table already compatible → leave the data alone, ensure the indexes
 * - table has the divergent NG shape → migrate the rows in place
 * - table has an unrecognised shape → leave it alone and skip the relation
 *   indexes (no destructive guess; the legacy store guards itself too)
 */
export function ensureRecordRelationTable(db: Database): void {
  const columns = tableColumns(db, 'record_relation');
  const present = columns.length > 0;
  const compatible = RELATION_COLUMNS.every((column) => columns.includes(column));
  const divergent = columns.includes('source_collection');

  if (present && !compatible && divergent) {
    db.transaction(() => {
      // A leftover from an interrupted migration must not block the rename.
      db.run('DROP TABLE IF EXISTS record_relation_ng_legacy');
      db.run('ALTER TABLE record_relation RENAME TO record_relation_ng_legacy');
      db.exec(RELATION_TABLE_DDL);
      db.run(`INSERT OR REPLACE INTO record_relation
        (relation_id, relation_kind, collection, from_record_id, to_record_id, data, valid_from, created_at, updated_at)
        SELECT source_collection || ':' || source_record_id || ':' || relation_type || ':' || target_record_id,
               relation_type,
               source_collection,
               source_record_id,
               target_record_id,
               json_object('target_collection', target_collection, 'relation_type', relation_type),
               created_at,
               created_at,
               created_at
        FROM record_relation_ng_legacy`);
      db.run('DROP TABLE record_relation_ng_legacy');
    })();
  } else if (!present) {
    db.exec(RELATION_TABLE_DDL);
  }

  // The relation indexes are created only when the table actually has the
  // columns they need.
  if (compatible || !present) {
    db.run('CREATE INDEX IF NOT EXISTS idx_record_lookup ON record(collection, record_kind)');
    db.run('CREATE INDEX IF NOT EXISTS idx_relation_out ON record_relation(collection, from_record_id, relation_kind)');
    db.run('CREATE INDEX IF NOT EXISTS idx_relation_in ON record_relation(collection, to_record_id, relation_kind)');
  }
}

export function upsertRecord(dbPath: string, collection: string, record: TBCRecord): void {
  const db = new Database(dbPath);
  try {
    ensureRecordTable(db);
    ensureRecordRelationTable(db);

    const recordKind = record.record_type || record.kind || 'unknown';
    const dataJson = JSON.stringify(record.data);

    const stmt = db.prepare(`
      INSERT INTO record (record_id, collection, record_kind, data, updated_at)
      VALUES (?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      ON CONFLICT(collection, record_id) DO UPDATE SET
        record_kind = excluded.record_kind,
        data = excluded.data,
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    `);

    stmt.run(record.id, collection, recordKind, dataJson);
  } finally {
    db.close();
  }
}

export function fetchRecord(dbPath: string, collection: string, id: string): TBCRecord | null {
  if (!existsSync(dbPath)) {
    return null;
  }

  const db = new Database(dbPath);
  try {
    ensureRecordTable(db);

    const stmt = db.prepare(`
      SELECT record_id, collection, record_kind, data, created_at, updated_at
      FROM record
      WHERE collection = ? AND record_id = ?
    `);

    const row = stmt.get(collection, id) as
      | { record_id: string; collection: string; record_kind: string; data: string; created_at: string; updated_at: string }
      | undefined;

    if (!row) {
      return null;
    }

    const data = JSON.parse(row.data);
    return {
      id: row.record_id,
      record_type: row.record_kind,
      kind: row.record_kind,
      data,
      content: '',
    };
  } finally {
    db.close();
  }
}

export function queryRecords(dbPath: string, collection: string, options?: { recordType?: string }): TBCRecord[] {
  if (!existsSync(dbPath)) {
    return [];
  }

  const db = new Database(dbPath);
  try {
    ensureRecordTable(db);

    let sql = `
      SELECT record_id, collection, record_kind, data, created_at, updated_at
      FROM record
      WHERE collection = ?
    `;
    const params: (string | number | bigint | boolean | null | Uint8Array)[] = [collection];

    if (options?.recordType) {
      sql += ` AND record_kind = ?`;
      params.push(options.recordType);
    }

    const stmt = db.prepare(sql);
    const rows = stmt.all(...params) as Array<{
      record_id: string;
      collection: string;
      record_kind: string;
      data: string;
      created_at: string;
      updated_at: string;
    }>;

    return rows.map((row) => ({
      id: row.record_id,
      record_type: row.record_kind,
      kind: row.record_kind,
      data: JSON.parse(row.data),
      content: '',
    }));
  } finally {
    db.close();
  }
}

/** Search records whose serialized front matter contains the supplied text. */
export function searchRecords(
  dbPath: string,
  collection: string,
  query: string,
  recordType?: string,
): TBCRecord[] {
  if (!existsSync(dbPath)) return [];

  const db = new Database(dbPath);
  try {
    ensureRecordTable(db);
    let sql = `
      SELECT record_id, collection, record_kind, data
      FROM record
      WHERE collection = ? AND lower(data) LIKE lower(?)
    `;
    const params: (string | number | bigint | boolean | null | Uint8Array)[] = [
      collection,
      `%${query}%`,
    ];
    if (recordType) {
      sql += ` AND record_kind = ?`;
      params.push(recordType);
    }

    const rows = db.prepare(sql).all(...params) as Array<{
      record_id: string;
      record_kind: string;
      data: string;
    }>;
    return rows.map((row) => ({
      id: row.record_id,
      record_type: row.record_kind,
      kind: row.record_kind,
      data: JSON.parse(row.data),
      content: '',
    }));
  } finally {
    db.close();
  }
}

export function upsertRecordRelation(
  dbPath: string,
  sourceCollection: string,
  sourceRecordId: string,
  targetCollection: string,
  targetRecordId: string,
  relationType: string
): void {
  const db = new Database(dbPath);
  try {
    ensureRecordTable(db);
    ensureRecordRelationTable(db);

    // Deterministic composite identity => idempotent upsert (legacy parity).
    const relationId = `${sourceCollection}:${sourceRecordId}:${relationType}:${targetRecordId}`;
    // The legacy shape has a single collection column (the source record's
    // collection), so the target collection is preserved inside the payload.
    const dataJson = JSON.stringify({
      target_collection: targetCollection,
      relation_type: relationType,
    });
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO record_relation (
        relation_id, relation_kind, collection, from_record_id, to_record_id, data, valid_from, created_at, updated_at
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

    stmt.run(
      relationId,
      relationType,
      sourceCollection,
      sourceRecordId,
      targetRecordId,
      dataJson,
      now,
      now,
      now
    );
  } finally {
    db.close();
  }
}
