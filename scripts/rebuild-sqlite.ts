import { copyFileSync, existsSync, readdirSync, readFileSync, renameSync, rmSync, statSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { Database } from 'bun:sqlite';
import { YAML } from 'bun';

/**
 * Rebuild a TBC root's SQLite database from the filesystem.
 *
 * The filesystem is the authority: every memory record is a plain text file
 * under `<root>/<mem>/`. The SQLite database is a derived index (the "hybrid
 * querier" of the legacy flows and the dual-write target of the NG services),
 * so it can always be rebuilt from the filesystem.
 *
 * Why a rebuild can be required:
 *   - the legacy store wrote `record_kind = 'record'` for every row, so the
 *     SQLite type filter never matched a legacy row. A row written by the NG
 *     layer carries its real `record_type`, and the hybrid querier stops at
 *     the first provider that returns a hit - a type filtered recall would
 *     then silently return only the new rows.
 *   - the `record_relation` table may carry a schema that the legacy store
 *     cannot index.
 *   - a long lived database accumulates a large write-ahead log.
 *
 * Usage:
 *   bun run scripts/rebuild-sqlite.ts --root <tbc-root> [--dry-run] [--no-backup]
 */

interface Options {
  root: string;
  dryRun: boolean;
  backup: boolean;
}

const RECORD_EXTENSIONS = ['.md', '.json', '.yaml', '.yml'];

const RELATION_COLUMNS = [
  'relation_id', 'relation_kind', 'collection', 'from_record_id',
  'to_record_id', 'data', 'valid_from', 'valid_to', 'created_at', 'updated_at',
];

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

const RECORD_TABLE_DDL = `
  CREATE TABLE IF NOT EXISTS record (
      record_id    TEXT NOT NULL,
      collection   TEXT NOT NULL,
      record_kind  TEXT NOT NULL,
      content_hash TEXT,
      data         TEXT NOT NULL DEFAULT '{}',
      created_at   TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at   TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      PRIMARY KEY (collection, record_id)
  ) STRICT;
`;

function parseArgs(argv: string[]): Options {
  let root = '';
  let dryRun = false;
  let backup = true;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--root') {
      root = argv[++i] ?? '';
    } else if (arg.startsWith('--root=')) {
      root = arg.slice('--root='.length);
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--no-backup') {
      backup = false;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!root) {
    throw new Error('Usage: bun run scripts/rebuild-sqlite.ts --root <tbc-root> [--dry-run] [--no-backup]');
  }

  return { root, dryRun, backup };
}


/**
 * Split a record file into its front matter and its body.
 *
 * The front matter block is the YAML document delimited by `---` at the very
 * top of the file (the same contract the legacy metadata node relies on).
 */
function parseFrontMatter(content: string): { data: Record<string, unknown>; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { data: {}, body: content };
  }
  let data: Record<string, unknown> = {};
  try {
    const parsed = YAML.parse(match[1]);
    if (parsed && typeof parsed === 'object') {
      data = parsed as Record<string, unknown>;
    }
  } catch {
    data = {};
  }
  return { data, body: match[2] };
}

/**
 * Resolve the memory collection of a TBC root.
 *
 * The root record addresses the collections by path (`/mem/`) or by name
 * (`mem`); both are reduced to the collection directory, exactly as the
 * legacy protocol resolver does.
 */
function resolveMemCollection(root: string): string {
  const rootMd = join(root, 'sys', 'root.md');
  if (existsSync(rootMd)) {
    const { data } = parseFrontMatter(readFileSync(rootMd, 'utf-8'));
    const reference = data.memory_path;
    if (typeof reference === 'string' && reference.trim()) {
      const segments = reference.split('/').filter(Boolean);
      if (segments.length > 0) return segments[0];
    }
  }
  return 'mem';
}

interface FsRecord {
  id: string;
  filename: string;
  recordKind: string;
  createdAt: string;
  payload: Record<string, unknown>;
}

function readFsRecords(memDir: string): FsRecord[] {
  if (!existsSync(memDir)) return [];

  const records: FsRecord[] = [];

  for (const entry of readdirSync(memDir)) {
    const fullPath = join(memDir, entry);
    if (!statSync(fullPath).isFile()) continue;
    if (!RECORD_EXTENSIONS.includes(extname(entry).toLowerCase())) continue;

    const { data: frontmatter, body } = parseFrontMatter(readFileSync(fullPath, 'utf-8'));
    const id = basename(entry, extname(entry));
    const recordType = frontmatter.record_type ?? frontmatter.kind;
    const createdAt = typeof frontmatter.record_create_date === 'string'
      ? frontmatter.record_create_date
      : new Date().toISOString();

    records.push({
      id,
      filename: entry,
      recordKind: typeof recordType === 'string' && recordType ? recordType : 'unknown',
      createdAt,
      // The legacy store persisted the whole record (front matter + body), so
      // that a content search over the SQLite index keeps working.
      payload: { ...frontmatter, content: body, id, filename: entry },
    });
  }

  records.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return records;
}

interface Relation {
  relationId: string;
  relationKind: string;
  collection: string;
  fromRecordId: string;
  toRecordId: string;
  data: string;
  createdAt: string;
}

function readExistingRelations(dbPath: string): Relation[] {
  if (!existsSync(dbPath)) return [];

  const db = new Database(dbPath, { readonly: true });
  try {
    const columns = (db.query('PRAGMA table_info(record_relation)').all() as { name: string }[]).map((c) => c.name);
    if (columns.length === 0) return [];

    const legacyShape = RELATION_COLUMNS.every((column) => columns.includes(column));
    const divergentShape = columns.includes('source_collection');

    if (legacyShape) {
      const rows = db.query(`SELECT relation_id, relation_kind, collection, from_record_id, to_record_id, data, created_at
                             FROM record_relation`).all() as Record<string, string>[];
      return rows.map((row) => ({
        relationId: row.relation_id,
        relationKind: row.relation_kind,
        collection: row.collection,
        fromRecordId: row.from_record_id,
        toRecordId: row.to_record_id,
        data: row.data ?? '{}',
        createdAt: row.created_at ?? new Date().toISOString(),
      }));
    }

    if (divergentShape) {
      const rows = db.query(`SELECT source_collection, source_record_id, target_collection, target_record_id, relation_type, created_at
                             FROM record_relation`).all() as Record<string, string>[];
      return rows.map((row) => ({
        relationId: `${row.source_collection}:${row.source_record_id}:${row.relation_type}:${row.target_record_id}`,
        relationKind: row.relation_type,
        collection: row.source_collection,
        fromRecordId: row.source_record_id,
        toRecordId: row.target_record_id,
        data: JSON.stringify({ target_collection: row.target_collection, relation_type: row.relation_type }),
        createdAt: row.created_at ?? new Date().toISOString(),
      }));
    }

    return [];
  } finally {
    db.close();
  }
}

function readExistingTimestamps(dbPath: string, collection: string): Map<string, { createdAt: string; updatedAt: string }> {
  const timestamps = new Map<string, { createdAt: string; updatedAt: string }>();
  if (!existsSync(dbPath)) return timestamps;

  const db = new Database(dbPath, { readonly: true });
  try {
    const rows = db.query('SELECT record_id, created_at, updated_at FROM record WHERE collection = ?').all(collection) as Record<string, string>[];
    for (const row of rows) {
      timestamps.set(row.record_id, { createdAt: row.created_at, updatedAt: row.updated_at });
    }
  } finally {
    db.close();
  }
  return timestamps;
}


function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const root = options.root;
  const memCollection = resolveMemCollection(root);
  const memDir = join(root, memCollection);
  const dbPath = join(root, 'records.db');

  if (!existsSync(memDir)) {
    throw new Error(`Memory collection not found: ${memDir}`);
  }

  const records = readFsRecords(memDir);
  const relations = readExistingRelations(dbPath);
  const timestamps = readExistingTimestamps(dbPath, memCollection);

  console.log(`TBC root          : ${root}`);
  console.log(`Memory collection : ${memCollection} (${records.length} record(s) on disk)`);
  console.log(`Existing database : ${existsSync(dbPath) ? dbPath : '(none)'}`);
  console.log(`Relations carried : ${relations.length}`);
  console.log('');

  const kinds = new Map<string, number>();
  for (const record of records) {
    kinds.set(record.recordKind, (kinds.get(record.recordKind) ?? 0) + 1);
  }
  console.log('Record kinds (from the filesystem front matter):');
  for (const [kind, count] of [...kinds.entries()].sort()) {
    console.log(`  ${kind.padEnd(12)} ${count}`);
  }
  console.log('');

  if (options.dryRun) {
    console.log('Dry run - nothing was written.');
    return;
  }

  const tempPath = join(root, 'records.db.rebuild');
  rmSync(tempPath, { force: true });
  rmSync(`${tempPath}-wal`, { force: true });
  rmSync(`${tempPath}-shm`, { force: true });

  const db = new Database(tempPath);
  try {
    db.exec('PRAGMA journal_mode = DELETE');
    db.exec(RECORD_TABLE_DDL);
    db.exec(RELATION_TABLE_DDL);
    db.run('CREATE INDEX IF NOT EXISTS idx_record_lookup ON record(collection, record_kind)');
    db.run('CREATE INDEX IF NOT EXISTS idx_relation_out ON record_relation(collection, from_record_id, relation_kind)');
    db.run('CREATE INDEX IF NOT EXISTS idx_relation_in ON record_relation(collection, to_record_id, relation_kind)');

    const insertRecord = db.prepare(`
      INSERT INTO record (record_id, collection, record_kind, content_hash, data, created_at, updated_at)
      VALUES (?, ?, ?, NULL, ?, ?, ?)
      ON CONFLICT(collection, record_id) DO UPDATE SET
        record_kind = excluded.record_kind,
        data = excluded.data,
        updated_at = excluded.updated_at
    `);
    const insertRelation = db.prepare(`
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

    db.transaction(() => {
      for (const record of records) {
        const previous = timestamps.get(record.id);
        const createdAt = previous?.createdAt ?? record.createdAt;
        const updatedAt = previous?.updatedAt ?? createdAt;
        insertRecord.run(
          record.id,
          memCollection,
          record.recordKind,
          JSON.stringify(record.payload),
          createdAt,
          updatedAt,
        );
      }
      for (const relation of relations) {
        insertRelation.run(
          relation.relationId,
          relation.relationKind,
          relation.collection,
          relation.fromRecordId,
          relation.toRecordId,
          relation.data,
          relation.createdAt,
          relation.createdAt,
          relation.createdAt,
        );
      }
    })();

    db.run('VACUUM');
  } finally {
    db.close();
  }

  if (options.backup && existsSync(dbPath)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    for (const suffix of ['', '-wal', '-shm']) {
      const source = `${dbPath}${suffix}`;
      if (existsSync(source)) {
        copyFileSync(source, `${dbPath}.bak-${stamp}${suffix}`);
      }
    }
    console.log(`Backup written    : ${dbPath}.bak-${stamp}`);
  }

  for (const suffix of ['-wal', '-shm']) {
    rmSync(`${dbPath}${suffix}`, { force: true });
  }
  renameSync(tempPath, dbPath);

  const size = statSync(dbPath).size;
  console.log(`Rebuilt database  : ${dbPath} (${size} bytes, ${records.length} record(s), ${relations.length} relation(s))`);
  console.log('');
  console.log('Next: run "tbc ng dex rebuild --root <tbc-root>" to regenerate the inDEX artifacts.');
}

main();
