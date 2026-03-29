import {
    RecordStore,
    TBCRecordStoreCapability,
    TBCRecord,
    TBCStore,
    TBCQueryParams
} from '@tbc-frameworx/tbc-record';
import {
    existsSync,
    mkdirSync,
    readFileSync,
    writeFileSync,
    readdirSync,
    rmSync
} from 'node:fs';
import { join, basename, extname, dirname } from 'node:path';
import matter from 'gray-matter';
import yaml from 'js-yaml';

class FSStore implements RecordStore {
    private rootDirectory: string = '';
    private dexCollection: string = 'dex';
    private initialized: boolean = false;

    async initialize(config: Record<string, any>): Promise<TBCRecordStoreCapability[]> {
        this.rootDirectory = config.rootDirectory || '';
        this.dexCollection = config.dexCollection || 'dex';

        if (!this.rootDirectory) throw new Error('FSStore: rootDirectory is required');

        if (!existsSync(this.rootDirectory)) mkdirSync(this.rootDirectory, { recursive: true });
        const dexDir = join(this.rootDirectory, this.dexCollection);
        if (!existsSync(dexDir)) mkdirSync(dexDir, { recursive: true });

        this.initialized = true;
        return ['store', 'fetch', 'index', 'query'];
    }

    async teardown(): Promise<void> {
        this.initialized = false;
    }

    /* ============================================================
       Persistence
    ============================================================ */
    async store(collection: string, records: TBCRecord[]): Promise<void> {
        this.ensureInitialized();
        const collectionPath = join(this.rootDirectory, collection);
        if (!existsSync(collectionPath)) mkdirSync(collectionPath, { recursive: true });

        const kindGroups: Record<string, TBCRecord[]> = {};

        for (const record of records) {
            this.validateId(record.id);

            // Logic fix: determine format early so metadata extraction happens for both paths
            const isMarkdown = record.contentType === 'markdown' || !!record.content;

            // Extract title from H1 if missing - needed for the Dex shard
            if (!record.record_title) {
                if (record.content) {
                    const match = record.content.match(/^#\s+(.+)/m);
                    if (match) record.record_title = match[1].trim();
                } else if (record.data?.title) {
                    record.record_title = record.data.title;
                }
            }

            const fileName = isMarkdown ? `${record.id}.md` : `${record.id}.json`;
            const filePath = join(collectionPath, fileName);

            if (isMarkdown) {
                const { content, ...meta } = record;
                const frontmatter = yaml.dump(meta, { lineWidth: -1 });
                writeFileSync(filePath, `---\n${frontmatter}---\n${content || ''}`);
            } else {
                writeFileSync(filePath, JSON.stringify(record, null, 2));
            }

            const kind = record.record_type || record.kind || 'unknown';
            if (!kindGroups[kind]) kindGroups[kind] = [];
            kindGroups[kind].push(record);
        }

        for (const [kind, group] of Object.entries(kindGroups)) {
            const indexPath = join(this.rootDirectory, this.dexCollection, `${collection}.${kind}.jsonl`);
            this.updateDexShard(indexPath, group);
        }
    }

    /* ============================================================
       Discovery
    ============================================================ */
    async query(collection: string, params: TBCQueryParams): Promise<string[]> {
        this.ensureInitialized();

        if (params.type === 'filter-by-tags') {
            throw new Error('filter-by-tags not implemented in FSStore');
        }

        const dexDir = join(this.rootDirectory, this.dexCollection);
        if (!existsSync(dexDir)) return [];

        const shards = readdirSync(dexDir)
            .filter(f => f.startsWith(`${collection}.`) && f.endsWith('.jsonl'));

        const results = new Set<string>();

        for (const shard of shards) {
            const content = readFileSync(join(dexDir, shard), 'utf-8');
            const lines = content.split('\n').filter(l => l.trim());

            for (const line of lines) {
                const entry = JSON.parse(line);

                if (params.type === 'list-all-ids') {
                    results.add(entry.id);
                } else if (params.type === 'search-by-content' && params.searchTerm) {
                    if (line.toLowerCase().includes(params.searchTerm.toLowerCase())) {
                        results.add(entry.id);
                    }
                }
            }
        }

        let sorted = Array.from(results);

        if (params.sortBy === 'id') {
            sorted.sort();
            if (params.sortOrder === 'desc') sorted.reverse();
        }

        if (params.limit !== undefined) {
            const offset = params.offset || 0;
            sorted = sorted.slice(offset, offset + params.limit);
        }

        return sorted;
    }

    async fetch(collection: string, ids: string[]): Promise<TBCStore> {
        this.ensureInitialized();
        const store: TBCStore = { [collection]: {} };
        const collectionPath = join(this.rootDirectory, collection);

        for (const id of ids) {
            this.validateId(id);
            const record = this.findAndParseRecord(collectionPath, id);
            if (record) store[collection][id] = record;
        }
        return store;
    }

    async index(collection: string, options: {
        event: 'full-build' | 'incremental';
        recordIds?: string[];
        params?: Record<string, any>;
    }): Promise<void> {
        this.ensureInitialized();
        const dexDir = join(this.rootDirectory, this.dexCollection);
        if (!existsSync(dexDir)) mkdirSync(dexDir, { recursive: true });

        if (options.event === 'full-build') {
            const collectionPath = join(this.rootDirectory, collection);
            if (!existsSync(collectionPath)) return;

            const files = readdirSync(dexDir);
            for (const f of files) {
                if (f.startsWith(`${collection}.`)) rmSync(join(dexDir, f));
            }

            const sourceFiles = readdirSync(collectionPath);
            const kindGroups: Record<string, TBCRecord[]> = {};

            for (const file of sourceFiles) {
                const id = basename(file, extname(file));
                const record = this.findAndParseRecord(collectionPath, id);
                if (record) {
                    const kind = record.record_type || record.kind || 'unknown';
                    if (!kindGroups[kind]) kindGroups[kind] = [];
                    kindGroups[kind].push(record);
                }
            }

            for (const [kind, records] of Object.entries(kindGroups)) {
                const indexPath = join(dexDir, `${collection}.${kind}.jsonl`);
                this.updateDexShard(indexPath, records);
            }
        } else if (options.event === 'incremental') {
            throw new Error('FSStore.index: incremental not implemented');
        }
    }

    private updateDexShard(path: string, newRecords: TBCRecord[]) {
        const dir = dirname(path);
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

        let lines: string[] = existsSync(path)
            ? readFileSync(path, 'utf-8').split('\n').filter(l => l.trim())
            : [];

        const newIds = new Set(newRecords.map(r => r.id));
        lines = lines.filter(line => {
            try { return !newIds.has(JSON.parse(line).id); } catch { return false; }
        });

        for (const record of newRecords) {
            const { content, fullContent, data, ...metadata } = record;
            lines.push(JSON.stringify(metadata));
        }

        writeFileSync(path, lines.join('\n') + '\n');
    }

    private findAndParseRecord(collectionPath: string, id: string): TBCRecord | null {
        const candidates = [join(collectionPath, `${id}.json`), join(collectionPath, `${id}.md`)];
        for (const filePath of candidates) {
            if (!existsSync(filePath)) continue;
            try {
                const content = readFileSync(filePath, 'utf-8');
                if (extname(filePath) === '.json') return JSON.parse(content);

                const parsed = matter(content);
                const record: any = { ...parsed.data, content: parsed.content, id };
                if (!record.record_title && parsed.content) {
                    const match = parsed.content.match(/^#\s+(.+)/m);
                    if (match) record.record_title = match[1].trim();
                }
                return record as TBCRecord;
            } catch (e) {
                if (process.env.NODE_ENV !== 'test') {
                    console.error(`FSStore: Error parsing ${filePath}`, e);
                }
            }
        }
        return null;
    }

    private validateId(id: string) {
        if (id.includes('..') || id.includes('/') || id.includes('\\')) {
            throw new Error(`Security: Invalid record ID "${id}"`);
        }
    }

    private ensureInitialized() {
        if (!this.initialized) throw new Error('FSStore not initialized');
    }
}

export { FSStore };
