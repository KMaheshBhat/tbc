import { Database } from 'bun:sqlite';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import type { TBCRecord } from './fs.ts';

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

export function ensureRecordRelationTable(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS record_relation (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_collection TEXT NOT NULL,
        source_record_id TEXT NOT NULL,
        target_collection TEXT NOT NULL,
        target_record_id TEXT NOT NULL,
        relation_type TEXT NOT NULL,
        created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    ) STRICT;
  `);
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

    const stmt = db.prepare(`
      INSERT INTO record_relation (source_collection, source_record_id, target_collection, target_record_id, relation_type)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT DO NOTHING
    `);

    stmt.run(sourceCollection, sourceRecordId, targetCollection, targetRecordId, relationType);
  } finally {
    db.close();
  }
}