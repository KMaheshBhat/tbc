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
    rmSync,
    statSync
} from 'node:fs';
import { join, basename, extname, dirname } from 'node:path';
import matter from 'gray-matter';
import yaml from 'js-yaml';

class FSStore implements RecordStore {
    private rootDirectory: string = '';
    private dexCollection: string = 'dex';
    private initialized: boolean = false;
    private config : Record<string, any> = {};

    async initialize(config: Record<string, any>): Promise<TBCRecordStoreCapability[]> {
        this.rootDirectory = config.rootDirectory || '';
        this.dexCollection = config.dexCollection || 'dex';

        if (!this.rootDirectory) throw new Error('FSStore: rootDirectory is required');

        if (!existsSync(this.rootDirectory)) mkdirSync(this.rootDirectory, { recursive: true });

        this.initialized = true;
        this.config = { ...config, eagerIndex: config.eagerIndex !== false };
        return ['store', 'fetch', 'index', 'query'];
    }

    private ensureDexDir(): void {
        const dexDir = join(this.rootDirectory, this.dexCollection);
        if (!existsSync(dexDir)) mkdirSync(dexDir, { recursive: true });
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

            if (!record.record_title) {
                if (typeof record.content === 'string' && record.content) {
                    const match = record.content.match(/^#\s+(.+)/m);
                    if (match) record.record_title = match[1].trim();
                } else if (record.data?.title) {
                    record.record_title = record.data.title;
                }
            }

            const format = this.determineFileFormat(record);
            const filePath = this.constructFilePath(collectionPath, record, format);

            const parentDir = dirname(filePath);
            if (!existsSync(parentDir)) mkdirSync(parentDir, { recursive: true });

            if (format === 'markdown') {
                const { content, ...meta } = record;
                meta.id = (meta.id as string).replaceAll('.md', '')
                const frontmatter = yaml.dump(meta, { lineWidth: -1 });
                writeFileSync(filePath, `---\n${frontmatter}---\n${content || ''}`);
            } else if (format === 'json') {
                writeFileSync(filePath, JSON.stringify(record, null, 2));
            } else if (format === 'yaml') {
                const yamlContent = typeof record.content === 'object' ? record.content : (record.content || record);
                writeFileSync(filePath, yaml.dump(yamlContent));
            } else {
                writeFileSync(filePath, typeof record.content === 'string' ? record.content : JSON.stringify(record.content || ''));
            }

            const kind = record.record_type || record.kind || 'unknown';
            if (!kindGroups[kind]) kindGroups[kind] = [];
            kindGroups[kind].push(record);
        }

        if (!this.config.eagerIndex) {
            return;
        }
        this.ensureDexDir();
        for (const [kind, group] of Object.entries(kindGroups)) {
            const indexPath = join(this.rootDirectory, this.dexCollection, `${collection}.${kind}.jsonl`);
            this.updateDexShard(indexPath, group);
        }
    }

    private determineFileFormat(record: Record<string, any>): 'markdown' | 'json' | 'yaml' | 'raw' {
        if (record.contentType === 'raw' || record.contentType === 'text') {
            return 'raw';
        }

        if (record.filename) {
            if (record.filename.endsWith('.md')) {
                return 'markdown';
            }
            if (record.filename.endsWith('.json')) {
                return 'json';
            }
            if (record.filename.endsWith('.yaml') || record.filename.endsWith('.yml')) {
                return 'yaml';
            }
        }

        if (record.contentType === 'markdown') {
            return 'markdown';
        }
        if (record.contentType === 'json') {
            return 'json';
        }
        if (record.contentType === 'yaml') {
            return 'yaml';
        }

        if (record.content) {
            return 'markdown';
        }

        return 'raw';
    }

    private constructFilePath(collectionPath: string, record: Record<string, any>, format: 'markdown' | 'json' | 'yaml' | 'raw'): string {
        let fileName: string;

        if (record.filename) {
            fileName = record.filename;
        } else {
            const hasExtension = (id: string) => /\.[a-zA-Z0-9]+$/.test(id);
            switch (format) {
                case 'markdown':
                    fileName = hasExtension(record.id) ? record.id : `${record.id}.md`;
                    break;
                case 'json':
                    fileName = hasExtension(record.id) ? record.id : `${record.id}.json`;
                    break;
                case 'yaml':
                    fileName = hasExtension(record.id) ? record.id : `${record.id}.yaml`;
                    break;
                case 'raw':
                    fileName = record.id;
                    break;
                default:
                    fileName = record.id;
            }
        }

        return join(collectionPath, fileName);
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
        
        let results = new Set<string>();
        
        const shards = existsSync(dexDir) 
            ? readdirSync(dexDir).filter(f => f.startsWith(`${collection}.`) && f.endsWith('.jsonl'))
            : [];

        // Filter shards by recordType if specified (e.g., mem.goal.jsonl for 'goal')
        const filteredShards = params.recordType 
            ? shards.filter(f => f === `${collection}.${params.recordType}.jsonl`)
            : shards;

        let hasDataFromIndex = false;
        if (filteredShards.length > 0) {
            for (const shard of filteredShards) {
                const shardPath = join(dexDir, shard);
                const content = readFileSync(shardPath, 'utf-8');
                const lines = content.split('\n').filter(l => l.trim());
                
                if (lines.length > 0) {
                    hasDataFromIndex = true;
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
            }
        }
        
        if (!hasDataFromIndex) {
            const collectionPath = join(this.rootDirectory, collection);
            if (existsSync(collectionPath)) {
                const files = readdirSync(collectionPath, { recursive: params.recursive });
                for (const file of files) {
                    if (typeof file === 'string') {
                        const fullPath = join(collectionPath, file);
                        if (existsSync(fullPath) && !statSync(fullPath).isDirectory()) {
                            let id: string;
                            if (file.includes('/')) {
                                id = file;
                            } else {
                                id = basename(file);
                            }
                            
                            // Skip files that don't match recordType filter
                            if (params.recordType) {
                                const fileRecordType = this.extractRecordType(fullPath, file);
                                if (fileRecordType !== params.recordType) {
                                    continue;
                                }
                            }
                            
                            if (params.type === 'list-all-ids') {
                                results.add(id);
                            } else if (params.type === 'search-by-content' && params.searchTerm) {
                                try {
                                    const content = readFileSync(fullPath, 'utf-8');
                                    if (content.toLowerCase().includes(params.searchTerm.toLowerCase())) {
                                        results.add(id);
                                    }
                                } catch {
                                }
                            }
                        }
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
        const candidates = this.getFileCandidates(collectionPath, id);

        for (const filePath of candidates) {
            if (!existsSync(filePath)) continue;
            try {
                const content = readFileSync(filePath, 'utf-8');
                const ext = extname(filePath);

                if (ext === '.json') {
                    const record = JSON.parse(content);
                    return { ...record, id };
                }

                if (ext === '.yaml' || ext === '.yml') {
                    const record = yaml.load(content) as Record<string, any>;
                    return { ...record, id, filename: basename(filePath) };
                }

                if (ext === '.md') {
                    const parsed = matter(content);
                    const record: any = { ...parsed.data, content: parsed.content, id, filename: basename(filePath) };
                    if (!record.record_title && parsed.content) {
                        const match = parsed.content.match(/^#\s+(.+)/m);
                        if (match) record.record_title = match[1].trim();
                    }
                    return record as TBCRecord;
                }

                return { content, fullContent: content, id, filename: basename(filePath) };
            } catch (e) {
                if (process.env.NODE_ENV !== 'test') {
                    console.error(`FSStore: Error parsing ${filePath}`, e);
                }
            }
        }
        return null;
    }

    private getFileCandidates(collectionPath: string, id: string): string[] {
        const candidates = [
            join(collectionPath, `${id}.json`),
            join(collectionPath, `${id}.md`),
            join(collectionPath, id),
        ];

        try {
            if (!existsSync(collectionPath)) return candidates;
            const files = readdirSync(collectionPath);
            const patternMatches = files
                .filter(file => file.startsWith(`${id}.`) && file !== `${id}.json` && file !== `${id}.md`)
                .map(file => join(collectionPath, file));
            candidates.push(...patternMatches);
        } catch {
            // Directory doesn't exist
        }

        return candidates;
    }

    private validateId(id: string) {
        if (id.includes('..') || id.includes('\\')) {
            throw new Error(`Security: Invalid record ID "${id}"`);
        }
    }

    private extractRecordType(filePath: string, fileName: string): string | null {
        try {
            const ext = extname(filePath);
            if (ext === '.json') {
                const content = readFileSync(filePath, 'utf-8');
                const data = JSON.parse(content);
                return data.record_type || data.kind || null;
            }
            if (ext === '.md') {
                const content = readFileSync(filePath, 'utf-8');
                const parsed = matter(content);
                return parsed.data?.record_type || parsed.data?.kind || null;
            }
        } catch {
        }
        return null;
    }

    private ensureInitialized() {
        if (!this.initialized) throw new Error('FSStore not initialized');
    }
}

export { FSStore };
