import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, rmSync, copyFileSync } from 'node:fs';
import { dirname, join, relative, extname } from 'node:path';
import matter from 'gray-matter';
import * as yaml from 'js-yaml';

import { toPosixPath } from './paths.js';

export interface TBCRecord {
  id: string;
  record_type?: string;
  kind?: string;
  data: Record<string, unknown>;
  content: string;
}

/** The write options of {@link storeRecord}. */
export interface StoreRecordWriteOptions {
  /**
   * Skip the write when the rendered content is identical to the file's
   * current content. This is what makes a repeated write a no-op — the
   * file's mtime is left untouched.
   */
  onlyIfChanged?: boolean;
  /**
   * Compute the rendered content and report whether it *would* change the
   * file, but write nothing. Used by the `--dry-run` mode.
   */
  dryRun?: boolean;
}

/**
 * The record-id convention of the filesystem store.
 *
 * A record id is a **POSIX-separated relative path** inside its collection:
 * `note`, `core/20251228150423`, `tbc-act-ops/SKILL.md`. The separator is
 * always `/`, never the OS-native one, so a vault written on Windows and a
 * vault written on POSIX are the same vault.
 *
 * `validateRecordId` enforces the convention by rejecting `\` (a Windows
 * separator is never a valid id) and `..` (a traversal is never a valid id).
 * The nested-skill checks in this module test for `/` for the same reason.
 */
function validateRecordId(id: string): void {
  if (id.includes('..')) {
    throw new Error(`Invalid record ID: directory traversal detected`);
  }
  if (id.includes('\\')) {
    throw new Error(`Invalid record ID: backslash is not a valid separator (use '/')`);
  }
}

/**
 * Whether `collection` is (or is a sub-path of) a skills collection.
 *
 * The known skills collection roots are `skills` (baseline profile) and
 * `skills_next` (next profile).  Collections like `skills/core` and
 * `skills_next/ext` must match; other collections that happen to contain
 * the substring `skills` (e.g. a hypothetical `meta-skills`) must not.
 *
 * The test is a **segment boundary** test: the first `/`-separated segment
 * must equal one of the two known roots.
 */
function isSkillsCollection(collection: string): boolean {
  const seg = collection.split('/')[0];
  return seg === 'skills' || seg === 'skills_next';
}

/**
 * Derive a record title from the body's first H1.
 *
 * Shared with the mining layer (`lib/assimilate.ts`) so that a record
 * written by `mem remember` and a record baked by `mem assimilate` carry
 * the same derived title.
 */
export function deriveTitleFromContent(content: string): string | null {
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match && h1Match[1]) {
    return h1Match[1].trim();
  }
  return null;
}

function determineFormat(record: TBCRecord, id: string): 'markdown' | 'json' | 'yaml' | 'raw' {
  const ext = extname(id).toLowerCase();
  if (ext === '.md' || ext === '.markdown') return 'markdown';
  if (ext === '.json') return 'json';
  if (ext === '.yaml' || ext === '.yml') return 'yaml';
  // If content starts with frontmatter, it's markdown
  if (record.content.trim().startsWith('---')) return 'markdown';
  // If record has frontmatter data (data object has keys), treat as markdown
  if (Object.keys(record.data).length > 0) return 'markdown';
  return 'raw';
}

function serializeFrontmatter(meta: Record<string, unknown>): string {
  return yaml.dump(meta, { lineWidth: -1, sortKeys: true });
}

/**
 * Write a record into a collection directory.
 *
 * The front-matter of an existing file is **merged** with the record's own
 * front-matter (`{ ...existing, ...incoming }`), so no user key is lost, and
 * the body is re-emitted from the file — the authoritative body is never
 * modified.
 *
 * @returns `true` when the file was written, `false` when the write was
 *          skipped (the content was unchanged) or suppressed (`dryRun`).
 */
export function storeRecord(
  root: string,
  collection: string,
  record: TBCRecord,
  options?: StoreRecordWriteOptions,
): boolean {
  validateRecordId(record.id);

  const collectionDir = join(root, collection);
  if (!existsSync(collectionDir)) {
    mkdirSync(collectionDir, { recursive: true });
  }

  // For skills, the id is the skill name and we need to create a subdirectory with SKILL.md
  if (isSkillsCollection(collection) && record.id && !record.id.includes('/') && record.id !== '.gitkeep') {
    // Create skill directory and write SKILL.md inside
    const skillDir = join(collectionDir, record.id);
    if (!existsSync(skillDir)) {
      mkdirSync(skillDir, { recursive: true });
    }
    const filePath = join(skillDir, 'SKILL.md');
    
    let content = record.content;
    let frontmatter: Record<string, unknown> = { ...record.data };

    if (!frontmatter.record_title && content) {
      const derivedTitle = deriveTitleFromContent(content);
      if (derivedTitle) {
        frontmatter.record_title = derivedTitle;
      }
    }

    if (record.record_type) {
      frontmatter.record_type = record.record_type;
    }
    if (record.kind) {
      frontmatter.kind = record.kind;
    }

    const fmString = serializeFrontmatter(frontmatter);

    let existingContent = '';
    if (existsSync(filePath)) {
      existingContent = readFileSync(filePath, 'utf-8');
    }

    let finalContent: string;

    if (existingContent.startsWith('---')) {
      const parsed = matter(existingContent);
      const mergedData = { ...parsed.data, ...frontmatter };
      const mergedFmString = serializeFrontmatter(mergedData);
      finalContent = `---\n${mergedFmString}---\n${parsed.content}`;
    } else {
      finalContent = `---\n${fmString}---\n${content}`;
    }

    if (options?.dryRun) {
      return finalContent !== existingContent;
    }

    if (options?.onlyIfChanged && existingContent === finalContent) {
      return false;
    }

    writeFileSync(filePath, finalContent, 'utf-8');
    return true;
  }

  // Determine file extension based on record type and id
  let fileName = record.id;
  const format = determineFormat(record, record.id);

  // For markdown files (not for .id files or SKILL.md which has path in id), add .md extension
  if (format === 'markdown' && !record.id.includes('/') && !record.id.endsWith('.id') && !record.id.endsWith('.md')) {
    fileName = `${record.id}.md`;
  }

  const filePath = join(collectionDir, fileName);
  mkdirSync(dirname(filePath), { recursive: true });

  // Special handling for .id files - write raw content without frontmatter
  if (record.id.endsWith('.id')) {
    const existing = existsSync(filePath) ? readFileSync(filePath, 'utf-8') : '';
    if (options?.dryRun) {
      return existing !== record.content;
    }
    if (options?.onlyIfChanged && existing === record.content) {
      return false;
    }
    writeFileSync(filePath, record.content, 'utf-8');
    return true;
  }

  // Honour the 'raw' format computed above: write the content verbatim.
  // The 'raw' branch is only reached for ids without a .md/.json/.yaml
  // extension whose content carries no front-matter and whose data is empty.
  if (format === 'raw') {
    const existing = existsSync(filePath) ? readFileSync(filePath, 'utf-8') : '';
    if (options?.dryRun) {
      return existing !== record.content;
    }
    if (options?.onlyIfChanged && existing === record.content) {
      return false;
    }
    writeFileSync(filePath, record.content, 'utf-8');
    return true;
  }

  let content = record.content;
  let frontmatter: Record<string, unknown> = { ...record.data };

  if (!frontmatter.record_title && content) {
    const derivedTitle = deriveTitleFromContent(content);
    if (derivedTitle) {
      frontmatter.record_title = derivedTitle;
    }
  }

  if (record.record_type) {
    frontmatter.record_type = record.record_type;
  }
  if (record.kind) {
    frontmatter.kind = record.kind;
  }

  const fmString = serializeFrontmatter(frontmatter);

  let existingContent = '';
  if (existsSync(filePath)) {
    existingContent = readFileSync(filePath, 'utf-8');
  }

  let finalContent: string;

  if (existingContent.startsWith('---')) {
    const parsed = matter(existingContent);
    const mergedData = { ...parsed.data, ...frontmatter };
    const mergedFmString = serializeFrontmatter(mergedData);
    finalContent = `---\n${mergedFmString}---\n${parsed.content}`;
  } else {
    finalContent = `---\n${fmString}---\n${content}`;
  }

  if (options?.dryRun) {
    return finalContent !== existingContent;
  }

  if (options?.onlyIfChanged && existingContent === finalContent) {
    return false;
  }

  writeFileSync(filePath, finalContent, 'utf-8');
  return true;
}

/**
 * Write a file verbatim (no front-matter) into a collection directory.
 *
 * Used for artifacts that must be byte-exact, such as the inDEX rebuild
 * outputs (`sys.digest.txt`, `*.jsonl`). `storeRecord` always injects a YAML
 * front-matter block, so it cannot be used for these.
 */
export function storeRawFile(root: string, collection: string, fileName: string, content: string): void {
  validateRecordId(fileName);

  const collectionDir = join(root, collection);
  if (!existsSync(collectionDir)) {
    mkdirSync(collectionDir, { recursive: true });
  }

  const filePath = join(collectionDir, fileName);
  mkdirSync(dirname(filePath), { recursive: true });

  writeFileSync(filePath, content, 'utf-8');
}

export function queryCollection(
  root: string,
  collection: string,
  options?: { recursive?: boolean; recordType?: string }
): string[] {
  const collectionDir = join(root, collection);
  if (!existsSync(collectionDir)) {
    return [];
  }

  const results: string[] = [];
  const recursive = options?.recursive ?? false;
  const recordType = options?.recordType;

  function scan(dir: string, baseDir: string) {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        if (recursive) {
          scan(fullPath, baseDir);
        }
      } else if (stat.isFile()) {
        // The id is a POSIX-separated relative path (see `validateRecordId`),
        // so a vault queried on Windows yields the same ids as on POSIX.
        const relPath = toPosixPath(relative(baseDir, fullPath));
        const id = relPath.replace(/\.md$/, '');
        if (recordType) {
          try {
            const fileContent = readFileSync(fullPath, 'utf-8');
            const parsed = matter(fileContent);
            if (parsed.data.record_type === recordType || parsed.data.kind === recordType) {
              results.push(id);
            }
          } catch {
            // Skip unparseable files
          }
        } else {
          results.push(id);
        }
      }
    }
  }

  scan(collectionDir, collectionDir);
  return results;
}

export function fetchRecord(root: string, collection: string, id: string): TBCRecord | null {
  validateRecordId(id);

  const collectionDir = join(root, collection);
  
  // For skills, check skill subdirectory
  if (isSkillsCollection(collection) && !id.includes('/') && id !== '.gitkeep') {
    const skillFilePath = join(collectionDir, id, 'SKILL.md');
    if (existsSync(skillFilePath)) {
      const fileContent = readFileSync(skillFilePath, 'utf-8');
      const parsed = matter(fileContent);
      return {
        id,
        record_type: parsed.data.record_type,
        kind: parsed.data.kind,
        data: parsed.data,
        content: parsed.content,
      };
    }
  }

  const candidates = [
    join(collectionDir, `${id}.md`),
    join(collectionDir, `${id}.json`),
    join(collectionDir, `${id}.yaml`),
    join(collectionDir, `${id}.yml`),
    join(collectionDir, id),
  ];

  for (const filePath of candidates) {
    if (existsSync(filePath)) {
      const fileContent = readFileSync(filePath, 'utf-8');
      const parsed = matter(fileContent);
      return {
        id,
        record_type: parsed.data.record_type,
        kind: parsed.data.kind,
        data: parsed.data,
        content: parsed.content,
      };
    }
  }

  return null;
}

export async function deleteDirectory(path: string): Promise<void> {
  if (existsSync(path)) {
    rmSync(path, { recursive: true, force: true });
  }
}

export async function copyDirectory(source: string, target: string): Promise<void> {
  if (!existsSync(source)) return;

  mkdirSync(target, { recursive: true });
  const entries = readdirSync(source);

  for (const entry of entries) {
    const srcPath = join(source, entry);
    const tgtPath = join(target, entry);
    const stat = statSync(srcPath);
    if (stat.isDirectory()) {
      await copyDirectory(srcPath, tgtPath);
    } else {
      copyFileSync(srcPath, tgtPath);
    }
  }
}
