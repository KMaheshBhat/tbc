import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import matter from 'gray-matter';

import { deriveTitleFromContent } from './fs.js';

/** Record file extensions understood by the filesystem store. */
const RECORD_EXTENSIONS = ['.md', '.json', '.yaml', '.yml'];

/** The record file extensions that carry a YAML front-matter block. */
const MARKDOWN_EXTENSIONS = ['.md', '.markdown'];

/** A memory record read from the filesystem — the body is authoritative. */
export interface AssimilateRecord {
    /** The bare id (the file name without its extension). */
    id: string;
    /** The file name, extension included (e.g. '019d6261-…-bc67.md'). */
    filename: string;
    /** The parsed front matter. */
    data: Record<string, unknown>;
    /** The body (front matter stripped) — never modified. */
    content: string;
    /** `record_create_date` → the file mtime → now(). */
    createdAt: string;
    /** The file mtime (ISO) — the `created_at` fallback of D14. */
    modifiedAt: string;
}

/** A record whose front matter has been mined — the derived layer. */
export interface MinedRecord {
    /** The bare id. */
    id: string;
    /** The file name, extension included. */
    filename: string;
    /** The canonical front matter (D11). */
    frontmatter: Record<string, unknown>;
    /** The mined tags (the relations' source). */
    tags: string[];
    /** The body — never modified. */
    content: string;
    /** Whether the title was derived from the body. */
    titleDerived: boolean;
    /** The number of tags the normalisation rule rewrote or added. */
    tagsNormalized: number;
    /** The `created_at` of a **new** SQLite row (D14). */
    createdAt: string;
    /**
     * Whether the mined front-matter can be baked back into the file.
     *
     * Only a markdown record file carries a YAML front-matter block — a
     * `.json` / `.yaml` record has no such block, so baking one would
     * rewrite the file in a foreign format. Such a record is still mined
     * and indexed; only the bake is skipped.
     */
    bakeable: boolean;
    /** The mined `record_type` (never invented — undefined when absent). */
    recordType?: string;
    /** The mined `kind` (never invented — undefined when absent). */
    kind?: string;
}


/**
 * Derive a title from the first five words of the content.
 *
 * Shared with `mem remember` so that both flows mint the same title shape.
 */
export function deriveTitle(content?: string): string {
    const words = (content || '').trim().split(/\s+/).filter(Boolean);
    return words.length ? words.slice(0, 5).join(' ') : '';
}

/**
 * Normalise a tag list.
 *
 * A bare tag becomes `t/<tag>`; a tag that already carries a `<prefix>/`
 * shape is preserved. The companion tag is prepended. The result is
 * de-duplicated, so the rule is idempotent: normalising an already
 * normalised list yields the same list (the mining is a fixed point).
 */
export function normalizeTags(rawTags: string[], companionTag: string): string[] {
    const tags = rawTags
        .map((tag) => tag.trim())
        .filter(Boolean)
        .map((tag) => (/^[a-z]\//.test(tag) ? tag : `t/${tag}`));
    return [...new Set([companionTag, ...tags].filter(Boolean))];
}

/**
 * List the record files of a collection (top level only).
 *
 * The result is sorted by id so that every consumer is deterministic.
 */
export function listMemoryRecordFiles(root: string, collection: string): string[] {
    const collectionDir = join(root, collection);
    if (!existsSync(collectionDir)) return [];

    const files: string[] = [];
    for (const entry of readdirSync(collectionDir)) {
        const fullPath = join(collectionDir, entry);
        if (!statSync(fullPath).isFile()) continue;
        if (!RECORD_EXTENSIONS.includes(extname(entry).toLowerCase())) continue;
        files.push(entry);
    }

    files.sort((a, b) => {
        const idA = basename(a, extname(a));
        const idB = basename(b, extname(b));
        return idA < idB ? -1 : idA > idB ? 1 : 0;
    });
    return files;
}


/**
 * Load one memory record from the filesystem.
 *
 * Returns `null` when the file cannot be read or parsed — the caller
 * reports the skip as a warning (the failure is not fatal).
 */
export function readMemoryRecord(root: string, collection: string, filename: string): AssimilateRecord | null {
    const filePath = join(root, collection, filename);
    if (!existsSync(filePath)) return null;

    let parsed: matter.GrayMatterFile<string>;
    try {
        parsed = matter(readFileSync(filePath, 'utf-8'));
    } catch {
        return null;
    }

    const data = (parsed.data ?? {}) as Record<string, unknown>;
    const extension = extname(filename);
    const id = extension ? basename(filename, extension) : basename(filename);
    const modifiedAt = statSync(filePath).mtime.toISOString();

    // `record_create_date` is a string when it is quoted in the front-matter
    // and a `Date` when it is not — both are accepted (D14).
    const rawCreatedAt = data.record_create_date;
    const createdAt = rawCreatedAt instanceof Date
        ? rawCreatedAt.toISOString()
        : (typeof rawCreatedAt === 'string' && rawCreatedAt.trim() ? rawCreatedAt.trim() : modifiedAt);

    return {
        id,
        filename,
        data,
        content: parsed.content ?? '',
        createdAt,
        modifiedAt,
    };
}

/**
 * Load every memory record of a collection, sorted by id.
 *
 * A file that cannot be read or parsed is skipped and reported through
 * `onWarning` — the remaining records are still mined and broadcast.
 */
export function readMemoryRecords(
    root: string,
    collection: string,
    onWarning?: (filename: string) => void,
): AssimilateRecord[] {
    const records: AssimilateRecord[] = [];

    for (const filename of listMemoryRecordFiles(root, collection)) {
        const record = readMemoryRecord(root, collection, filename);
        if (!record) {
            onWarning?.(filename);
            continue;
        }
        records.push(record);
    }

    return records;
}


/**
 * Mine a record — derive the canonical front matter (D11).
 *
 * The mining set is: the bare `id`; `record_title` (derived from the
 * body's first H1 when missing); `record_tags` (normalised, with the
 * companion tag); `contentType: 'markdown'`. `record_type`/`kind` and
 * `record_create_date` are preserved and **never invented**; every other
 * key is preserved verbatim; the body is never modified.
 *
 * The mining is a **fixed point**: mining an already-mined record yields
 * the identical front matter.
 */
export function mineMemoryRecord(record: AssimilateRecord, companionTag: string): MinedRecord {
    const frontmatter: Record<string, unknown> = { ...record.data };

    // The id is always the bare id (the store key of every store).
    frontmatter.id = record.id;

    // The title is derived from the body's first H1 when it is missing.
    let titleDerived = false;
    if (!frontmatter.record_title) {
        const derived = deriveTitleFromContent(record.content);
        if (derived) {
            frontmatter.record_title = derived;
            titleDerived = true;
        }
    }

    // The tags are normalised through the shared rule.
    const rawTags = Array.isArray(record.data.record_tags)
        ? record.data.record_tags.filter((tag): tag is string => typeof tag === 'string')
        : [];
    const tags = normalizeTags(rawTags, companionTag);
    // The number of tags the rule rewrote or added — a tag that is already in
    // its normalised shape is not counted.
    const rawSet = new Set(rawTags.map((tag) => tag.trim()).filter(Boolean));
    const tagsNormalized = tags.filter((tag) => !rawSet.has(tag)).length;
    frontmatter.record_tags = tags;

    // The content type is the markdown shape of a memory record.
    frontmatter.contentType = 'markdown';

    return {
        id: record.id,
        filename: record.filename,
        frontmatter,
        tags,
        content: record.content,
        titleDerived,
        tagsNormalized,
        createdAt: record.createdAt,
        bakeable: MARKDOWN_EXTENSIONS.includes(extname(record.filename).toLowerCase()),
        recordType: typeof record.data.record_type === 'string' ? record.data.record_type : undefined,
        kind: typeof record.data.kind === 'string' ? record.data.kind : undefined,
    };
}
