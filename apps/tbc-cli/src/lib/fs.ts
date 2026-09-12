import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, rmSync, copyFileSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import matter from 'gray-matter';
import * as yaml from 'js-yaml';

export interface TBCRecord {
  id: string;
  record_type?: string;
  kind?: string;
  data: Record<string, unknown>;
  content: string;
}

export interface StoreRecordOptions {
  root: string;
  collection: string;
  record: TBCRecord;
}

function validateRecordId(id: string): void {
  if (id.includes('..') || id.includes('\\')) {
    throw new Error(`Invalid record ID: directory traversal detected`);
  }
}

function deriveTitleFromContent(content: string): string | null {
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) {
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

export function storeRecord(root: string, collection: string, record: TBCRecord): void {
  validateRecordId(record.id);

  const collectionDir = join(root, collection);
  if (!existsSync(collectionDir)) {
    mkdirSync(collectionDir, { recursive: true });
  }

  // For skills, the id is the skill name and we need to create a subdirectory with SKILL.md
  if (collection.includes('skills') && record.id && !record.id.includes('/') && record.id !== '.gitkeep') {
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

    writeFileSync(filePath, finalContent, 'utf-8');
    return;
  }

  // Determine file extension based on record type and id
  let fileName = record.id;
  const format = determineFormat(record, record.id);

  // For markdown files (not for .id files or SKILL.md which has path in id), add .md extension
  if (format === 'markdown' && !record.id.includes('/') && !record.id.endsWith('.id')) {
    fileName = `${record.id}.md`;
  }

  const filePath = join(collectionDir, fileName);

  // Special handling for .id files - write raw content without frontmatter
  if (record.id.endsWith('.id')) {
    writeFileSync(filePath, record.content, 'utf-8');
    return;
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

  writeFileSync(filePath, finalContent, 'utf-8');
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
        const relPath = relative(baseDir, fullPath);
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
  if (collection.includes('skills') && !id.includes('/') && id !== '.gitkeep') {
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