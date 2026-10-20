import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { basename, extname, join, relative } from 'node:path';
import matter from 'gray-matter';

import { storeRawFile } from './fs.js';
import type { TBCProtocol } from './protocol.js';

/** A file discovered inside a TBC collection. */
export interface DexSourceFile {
  /** Path relative to the collection root, extension included (e.g. 'core/x/SKILL.md'). */
  relativePath: string;
  /** Base file name (e.g. 'SKILL.md'). */
  filename: string;
  /** Absolute path on disk. */
  absolutePath: string;
  /** Relative path without extension (e.g. 'core/x/SKILL'). */
  id: string;
}

/** A parsed record file: front-matter plus the markdown body. */
export interface DexRecord {
  /** Parsed front-matter (key order preserved). */
  frontmatter: Record<string, unknown>;
  /** Markdown body, front-matter stripped. */
  body: string;
}

/** A memory shard ready to be written to the inDEX collection. */
export interface DexShard {
  /** Artifact file name, e.g. 'mem.note.jsonl'. */
  fileName: string;
  /** Artifact content (JSONL, trailing newline). */
  content: string;
}

/** Record file extensions understood by the filesystem store. */
const RECORD_EXTENSIONS = ['.md', '.json', '.yaml', '.yml'];

/** Keys that never belong in an inDEX metadata entry. */
const EXCLUDED_ENTRY_KEYS = ['content', 'fullContent', 'data'];

/**
 * List the files of a collection.
 *
 * @param recursive when false only the direct children are returned (legacy
 *                 shard parity); when true the whole tree is walked.
 * The result is sorted by relative path so every consumer is deterministic.
 */
export function listCollectionFiles(
  root: string,
  collection: string,
  options?: { recursive?: boolean },
): DexSourceFile[] {
  const collectionDir = join(root, collection);
  if (!existsSync(collectionDir)) {
    return [];
  }

  const recursive = options?.recursive ?? false;
  const files: DexSourceFile[] = [];

  function scan(dir: string): void {
    for (const entry of readdirSync(dir)) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        if (recursive) {
          scan(fullPath);
        }
        continue;
      }
      if (!stat.isFile()) {
        continue;
      }
      const relativePath = relative(collectionDir, fullPath);
      const extension = extname(relativePath);
      files.push({
        relativePath,
        filename: basename(fullPath),
        absolutePath: fullPath,
        id: extension ? relativePath.slice(0, -extension.length) : relativePath,
      });
    }
  }

  scan(collectionDir);

  files.sort((a, b) => (a.relativePath < b.relativePath ? -1 : a.relativePath > b.relativePath ? 1 : 0));
  return files;
}

/** Parse a record file into its front-matter and its body. */
export function readDexRecord(absolutePath: string): DexRecord {
  const parsed = matter(readFileSync(absolutePath, 'utf-8'));
  return {
    frontmatter: (parsed.data ?? {}) as Record<string, unknown>,
    body: parsed.content,
  };
}

function isRecordFile(relativePath: string): boolean {
  return RECORD_EXTENSIONS.includes(extname(relativePath).toLowerCase());
}

/** Strip the keys that must never appear in an inDEX metadata entry. */
function entryFrontmatter(frontmatter: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(frontmatter)) {
    if (EXCLUDED_ENTRY_KEYS.includes(key)) continue;
    result[key] = value;
  }
  return result;
}

/**
 * Build the system digest (legacy `SynthesizeCollationDigestNode` parity).
 *
 * Sources, in order: `<sys>/root.md`, `<sys>/core/**\/*.md`, `<sys>/ext/**\/*.md`.
 * Each source contributes `<<<< SOURCE: <collection-relative-id> >>>>` followed
 * by the markdown body (front-matter stripped). Blocks are joined by a blank
 * line and the artifact ends with a trailing newline.
 */
export function buildSysDigest(root: string, protocol: TBCProtocol): string {
  const sysCollection = protocol.sysCollection;
  const sources: { marker: string; absolutePath: string }[] = [];

  const rootMd = join(root, sysCollection, 'root.md');
  if (existsSync(rootMd)) {
    sources.push({ marker: `${sysCollection}/root.md`, absolutePath: rootMd });
  }

  for (const sub of ['core', 'ext']) {
    const files = listCollectionFiles(root, `${sysCollection}/${sub}`, { recursive: true });
    for (const file of files) {
      if (extname(file.relativePath).toLowerCase() !== '.md') continue;
      sources.push({
        marker: `${sysCollection}/${sub}/${file.relativePath}`,
        absolutePath: file.absolutePath,
      });
    }
  }

  if (sources.length === 0) {
    return '';
  }

  const blocks = sources.map(
    (source) => `<<<< SOURCE: ${source.marker} >>>>\n${readDexRecord(source.absolutePath).body}`
  );

  return `${blocks.join('\n\n')}\n`;
}

/**
 * Build the skills metadata index (legacy `SynthesizeCollationMetadataNode`
 * parity).
 *
 * Sources: every `<skills>/**\/SKILL.md` file. Each entry carries the
 * collection-relative path as its `id`, the skills collection name and the
 * record's front-matter, with `content`, `fullContent` and `data` removed.
 */
export function buildSkillsIndex(root: string, protocol: TBCProtocol): string {
  const skillsCollection = protocol.skillsCollection;
  const files = listCollectionFiles(root, skillsCollection, { recursive: true })
    .filter((file) => file.relativePath.endsWith('SKILL.md'));

  const lines = files.map((file) => {
    const { frontmatter } = readDexRecord(file.absolutePath);
    // The entry id is always the collection-relative path; a front-matter `id`
    // never overrides it (legacy parity).
    const { id: _frontmatterId, ...rest } = entryFrontmatter(frontmatter);
    const entry = {
      id: file.relativePath,
      collection: skillsCollection,
      ...rest,
      filename: file.filename,
    };
    return JSON.stringify(entry);
  });

  if (lines.length === 0) {
    return '';
  }

  return `${lines.join('\n')}\n`;
}

/**
 * Build the memory shards (legacy `FSStore.index` full-build parity).
 *
 * Only the top-level files of the collection are indexed, grouped by
 * `record_type || kind || 'unknown'` and sorted by record id inside a shard.
 */
export function buildCollectionShards(root: string, collection: string): DexShard[] {
  const files = listCollectionFiles(root, collection, { recursive: false })
    .filter((file) => isRecordFile(file.relativePath));

  const groups = new Map<string, { id: string; filename: string; frontmatter: Record<string, unknown> }[]>();

  for (const file of files) {
    const { frontmatter } = readDexRecord(file.absolutePath);
    const kind = String(frontmatter.record_type || frontmatter.kind || 'unknown');
    const extension = extname(file.relativePath);
    const id = extension ? basename(file.relativePath, extension) : basename(file.relativePath);
    const group = groups.get(kind);
    if (group) {
      group.push({ id, filename: file.filename, frontmatter });
    } else {
      groups.set(kind, [{ id, filename: file.filename, frontmatter }]);
    }
  }

  const shards: DexShard[] = [];

  for (const [kind, records] of groups) {
    records.sort((a, b) => a.id.localeCompare(b.id));
    const lines = records.map((record) => {
      const entry = {
        ...entryFrontmatter(record.frontmatter),
        id: record.id,
        filename: record.filename,
      };
      return JSON.stringify(entry);
    });
    shards.push({
      fileName: `${collection}.${kind}.jsonl`,
      content: `${lines.join('\n')}\n`,
    });
  }

  shards.sort((a, b) => (a.fileName < b.fileName ? -1 : a.fileName > b.fileName ? 1 : 0));
  return shards;
}

/** A written inDEX artifact. */
export interface DexArtifact {
  /** The artifact's file name (e.g. 'mem.note.jsonl'). */
  fileName: string;
  /** The artifact's content. */
  content: string;
}

/**
 * Remove the stale memory shards of a collection.
 *
 * A record whose `record_type` changed would otherwise leave an orphan shard
 * behind (legacy `FSStore.index` parity).
 */
function removeStaleShards(dexDirectory: string, collection: string): void {
  if (!existsSync(dexDirectory)) return;
  for (const entry of readdirSync(dexDirectory)) {
    if (entry.startsWith(`${collection}.`) && entry.endsWith('.jsonl')) {
      rmSync(join(dexDirectory, entry), { force: true });
    }
  }
}

/**
 * Build and write the inDEX artifacts of a TBC root.
 *
 * The rebuild targets are fixed (legacy `on.rebuild` parity):
 *   1. `<dex>/sys.digest.txt`  - the collated system specifications
 *   2. `<dex>/skills.jsonl`    - the skills metadata index
 *   3. `<dex>/<mem>.*.jsonl`   - the memory shards, partitioned by record_type
 *
 * The artifacts are written to the filesystem only; they are never dual-written
 * to SQLite (legacy `dex` collection protocol parity).
 *
 * @returns the artifacts that were written.
 */
export function writeDexArtifacts(root: string, protocol: TBCProtocol): DexArtifact[] {
  const dexDirectory = join(root, protocol.dexCollection);
  if (!existsSync(dexDirectory)) {
    mkdirSync(dexDirectory, { recursive: true });
  }

  // The stale shards are removed first (legacy parity) so that a record whose
  // `record_type` changed does not leave an orphan shard behind.
  removeStaleShards(dexDirectory, protocol.memCollection);

  const artifacts: DexArtifact[] = [
    { fileName: 'sys.digest.txt', content: buildSysDigest(root, protocol) },
    { fileName: 'skills.jsonl', content: buildSkillsIndex(root, protocol) },
  ];

  for (const shard of buildCollectionShards(root, protocol.memCollection)) {
    artifacts.push({ fileName: shard.fileName, content: shard.content });
  }

  for (const artifact of artifacts) {
    storeRawFile(root, protocol.dexCollection, artifact.fileName, artifact.content);
  }

  return artifacts;
}
