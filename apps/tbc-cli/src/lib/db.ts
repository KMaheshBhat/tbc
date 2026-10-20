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

/**
 * The payload persisted in the `data` column of the `record` table.
 *
 * The filesystem is the durable store; SQLite is a derived index that makes
 * the queries fast. The payload therefore mirrors the whole record (front
 * matter + body), exactly like the legacy store, so that a keyword search
 * over the SQLite index also matches the body text. Storing the record twice
 * is cheap at the volumes a personal companion deals with and it keeps the
 * two implementations interchangeable.
 */
function recordPayload(record: TBCRecord): Record<string, unknown> {
  return {
    ...record.data,
    content: record.content,
    id: record.id,
  };
}

/** Parse a stored payload back into a record payload. */
function parsePayload(data: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(data);
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

/**
 * Serialize a payload with its keys in a canonical (sorted) order.
 *
 * The payload of a record is a function of the record's *values* — the key
 * order of the source front-matter is not part of the record. A canonical
 * serialization therefore makes the stored row a deterministic function of
 * the mined values, which is what makes a repeated broadcast a no-op.
 */
function canonicalJson(payload: Record<string, unknown>): string {
  const sortValue = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(sortValue);
    // A `Date` is an object, but it is a *value*, not a key/value bag — it must
    // be left to `JSON.stringify` (which renders it as an ISO string).
    if (value instanceof Date) return value;
    if (value && typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
      return Object.fromEntries(entries.map(([key, entry]) => [key, sortValue(entry)]));
    }
    return value;
  };
  return JSON.stringify(sortValue(payload));
}

/**
 * The deterministic identity of a relation row.
 *
 * The mined relations and the `mem remember` relations must be the *same*
 * rows, so both use this identity.
 */
function relationIdentity(collection: string, fromRecordId: string, relationType: string, toRecordId: string): string {
  return `${collection}:${fromRecordId}:${relationType}:${toRecordId}`;
}

/** The payload persisted in the `data` column of the `record_relation` table. */
function relationPayload(targetCollection: string, relationType: string): string {
  return JSON.stringify({
    target_collection: targetCollection,
    relation_type: relationType,
  });
}

/** A record to be written into the SQLite index of a collection. */
export interface CollectionIndexRecord {
    /** The bare record id — the store key of every store. */
    id: string;
    /** The mined `record_type` (never the legacy's blanket `'record'`). */
    recordType: string;
    /** The payload persisted in the `data` column. */
    payload: Record<string, unknown>;
    /** The `created_at` of a **new** row (D14). */
    createdAt: string;
}

/** The outcome of a collection-scoped index rebuild. */
export interface CollectionIndexResult {
    /** The rows that were materially written (new or changed). */
    written: number;
    /** The stale rows that were removed. */
    removed: number;
    /** The rows that were already identical to the incoming ones. */
    unchanged: number;
}

/** A relationship to be written into the SQLite relation table. */
export interface CollectionRelation {
    /** The bare id of the record the relation starts from. */
    fromRecordId: string;
    /** The id of the relation's target (the tag, for a tag relation). */
    toRecordId: string;
    /** The kind of the relation (`'tag'`). */
    relationType: string;
    /** The collection of the target — defaults to the relation type. */
    targetCollection?: string;
}

/** The outcome of a collection-scoped relation rebuild. */
export interface CollectionRelationResult {
    /** The relations that were materially written (new or changed). */
    written: number;
    /** The stale relations that were removed. */
    removed: number;
}

/**
 * Rebuild the rows of ONE collection in the SQLite index from the mined records.
 *
 * The rebuild is **collection-scoped**: the rows of the other collections
 * (`sys`, `skills`, `.`, ...) are never read, rewritten or removed. The stale
 * rows of the collection — the rows whose `record_id` is not in the incoming
 * set — are removed (D5), so that the index always agrees with the
 * filesystem.
 *
 * The `created_at` of an existing row is preserved; a new row takes the
 * record's own `createdAt` (D14). The `updated_at` is always `now()`.
 *
 * `options.dryRun` computes the counts and writes nothing.
 */
export function rebuildCollectionIndex(
    dbPath: string,
    collection: string,
    records: CollectionIndexRecord[],
    options?: { dryRun?: boolean },
): CollectionIndexResult {
    const dryRun = options?.dryRun === true;
    const incoming = new Set(records.map((record) => record.id));

    if (dryRun && !existsSync(dbPath)) {
        return { written: records.length, removed: 0, unchanged: 0 };
    }

    const db = new Database(dbPath);
    try {
        ensureRecordTable(db);
        ensureRecordRelationTable(db);

        const existing = db.query('SELECT record_id, record_kind, data, created_at FROM record WHERE collection = ?')
            .all(collection) as { record_id: string; record_kind: string; data: string; created_at: string }[];

        const existingById = new Map(existing.map((row) => [row.record_id, row]));
        const stale = existing.filter((row) => !incoming.has(row.record_id)).map((row) => row.record_id);

        let written = 0;
        let unchanged = 0;
        for (const record of records) {
            const previous = existingById.get(record.id);
            const dataJson = canonicalJson(record.payload);
            if (previous && previous.record_kind === record.recordType && previous.data === dataJson) {
                unchanged += 1;
            } else {
                written += 1;
            }
        }

        if (dryRun) {
            return { written, removed: stale.length, unchanged };
        }

        const now = new Date().toISOString();
        const upsert = db.prepare(`
            INSERT INTO record (record_id, collection, record_kind, data, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(collection, record_id) DO UPDATE SET
                record_kind = excluded.record_kind,
                data = excluded.data,
                updated_at = excluded.updated_at
        `);
        const remove = db.prepare('DELETE FROM record WHERE collection = ? AND record_id = ?');

        db.transaction(() => {
            for (const record of records) {
                const previous = existingById.get(record.id);
                upsert.run(
                    record.id,
                    collection,
                    record.recordType,
                    canonicalJson(record.payload),
                    previous?.created_at ?? record.createdAt,
                    now,
                );
            }
            for (const recordId of stale) {
                remove.run(collection, recordId);
            }
        })();

        return { written, removed: stale.length, unchanged };
    } finally {
        db.close();
    }
}


export function upsertRecord(dbPath: string, collection: string, record: TBCRecord): void {

  const db = new Database(dbPath);
  try {
    ensureRecordTable(db);
    ensureRecordRelationTable(db);

    const recordKind = record.record_type || record.kind || 'unknown';
    const dataJson = JSON.stringify(recordPayload(record));

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

    const data = parsePayload(row.data);
    return {
      id: row.record_id,
      record_type: row.record_kind,
      kind: row.record_kind,
      data,
      content: typeof data.content === 'string' ? data.content : '',
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

    return rows.map((row) => {
      const data = parsePayload(row.data);
      return {
        id: row.record_id,
        record_type: row.record_kind,
        kind: row.record_kind,
        data,
        content: typeof data.content === 'string' ? data.content : '',
      };
    });
  } finally {
    db.close();
  }
}

/** Search records whose serialized payload contains the supplied text. */
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
    return rows.map((row) => {
      const data = parsePayload(row.data);
      return {
        id: row.record_id,
        record_type: row.record_kind,
        kind: row.record_kind,
        data,
        content: typeof data.content === 'string' ? data.content : '',
      };
    });
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
    const relationId = relationIdentity(sourceCollection, sourceRecordId, relationType, targetRecordId);
    // The legacy shape has a single collection column (the source record's
    // collection), so the target collection is preserved inside the payload.
    const dataJson = relationPayload(targetCollection, relationType);
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

/**
 * Rebuild the relationships of ONE collection from the mined tags.
 *
 * The relations reuse the **exact** convention of {@link upsertRecordRelation}
 * — the same deterministic `relation_id` and the same `data` payload — so the
 * mined rows and the `mem remember` rows are the *same* rows.
 *
 * The relation rows of the collection that are no longer mined are removed
 * (D13). The rows of the other collections are never touched.
 *
 * `options.dryRun` computes the counts and writes nothing.
 */
export function rebuildCollectionRelations(
    dbPath: string,
    collection: string,
    relations: CollectionRelation[],
    options?: { dryRun?: boolean },
): CollectionRelationResult {
    const dryRun = options?.dryRun === true;

    const identities = relations.map((relation) => relationIdentity(
        collection,
        relation.fromRecordId,
        relation.relationType,
        relation.toRecordId,
    ));
    const incoming = new Set(identities);

    if (dryRun && !existsSync(dbPath)) {
        return { written: relations.length, removed: 0 };
    }

    const db = new Database(dbPath);
    try {
        ensureRecordTable(db);
        ensureRecordRelationTable(db);

        const existing = db.query('SELECT relation_id, relation_kind, from_record_id, to_record_id, data FROM record_relation WHERE collection = ?')
            .all(collection) as { relation_id: string; relation_kind: string; from_record_id: string; to_record_id: string; data: string }[];

        const existingById = new Map(existing.map((row) => [row.relation_id, row]));
        const stale = existing.filter((row) => !incoming.has(row.relation_id)).map((row) => row.relation_id);

        let written = 0;
        for (const relation of relations) {
            const identity = relationIdentity(collection, relation.fromRecordId, relation.relationType, relation.toRecordId);
            const previous = existingById.get(identity);
            const dataJson = relationPayload(relation.targetCollection ?? relation.relationType, relation.relationType);
            if (previous
                && previous.relation_kind === relation.relationType
                && previous.from_record_id === relation.fromRecordId
                && previous.to_record_id === relation.toRecordId
                && previous.data === dataJson) {
                continue;
            }
            written += 1;
        }

        if (dryRun) {
            return { written, removed: stale.length };
        }

        const now = new Date().toISOString();
        const upsert = db.prepare(`
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
        const remove = db.prepare('DELETE FROM record_relation WHERE collection = ? AND relation_id = ?');

        db.transaction(() => {
            for (const relation of relations) {
                const identity = relationIdentity(collection, relation.fromRecordId, relation.relationType, relation.toRecordId);
                const dataJson = relationPayload(relation.targetCollection ?? relation.relationType, relation.relationType);
                upsert.run(
                    identity,
                    relation.relationType,
                    collection,
                    relation.fromRecordId,
                    relation.toRecordId,
                    dataJson,
                    now,
                    now,
                    now,
                );
            }
            for (const identity of stale) {
                remove.run(collection, identity);
            }
        })();

        return { written, removed: stale.length };
    } finally {
        db.close();
    }
}
