import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { HAMINode } from '@hami-frameworx/core';
import { Glob } from 'bun';
import yaml from 'js-yaml';
import { Shared, TBCMessage, TBCProtocol } from '../types.js';
import { PROTOCOLS } from '../protocols.js';

type NodeOutput = {
    protocol: TBCProtocol;
    rootMdPath: string;
    messages: TBCMessage[];
};

export class ResolveProtocolNode extends HAMINode<Shared> {
    kind(): string {
        return 'tbc-system:resolve-protocol';
    }

    async prep(shared: Shared): Promise<string> {
        const root = shared.system?.rootDirectory || shared.stage?.rootDirectory;
        if (!root) {
            throw new Error('Root directory must be resolved before protocol resolution.');
        }
        return root;
    }

    /**
     * Extracts the top-level collection directory from a path.
     * Example: "/sys_next/core/" -> "sys_next"
     */
    private extractCollection(path: any): string | undefined {
        if (typeof path !== 'string') return undefined;
        const parts = path.split('/').filter(Boolean);
        return parts.length > 0 ? parts[0] : undefined;
    }

    async exec(rootDirectory: string): Promise<NodeOutput> {
        const messages: TBCMessage[] = [];
        let rootMdPath = 'not found';

        // 1. Safe Defaults
        const protocol: TBCProtocol = PROTOCOLS['baseline'];
        // 2. Discover root.md (Max depth 2 to find sys/root.md or sys_next/root.md)
        const glob = new Glob('**/root.md');
        const scanner = glob.scan({ cwd: rootDirectory, onlyFiles: true });

        let foundPath: string | null = null;
        for await (const file of scanner) {
            if (file.startsWith('bak-')) continue;
            foundPath = file;
            break;
        }

        if (foundPath) {
            rootMdPath = foundPath;
            try {
                const fullPath = join(rootDirectory, foundPath);
                const content = readFileSync(fullPath, 'utf8');
                const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);

                if (match) {
                    const fm = yaml.load(match[1]) as any;

                    // 3. Dynamic Collection Derivation
                    // sys: system_path -> extension_path -> 'sys'
                    protocol.sys.collection =
                        this.extractCollection(fm.system_path) ||
                        this.extractCollection(fm.extension_path) ||
                        'sys';

                    // skills: skills_path -> skills_extension_path -> 'skills'
                    protocol.skills.collection =
                        this.extractCollection(fm.skills_path) ||
                        this.extractCollection(fm.skills_extension_path) ||
                        'skills';

                    // mem: memory_path -> companion/prime/map first parts -> 'mem'
                    protocol.mem.collection =
                        this.extractCollection(fm.memory_path) ||
                        this.extractCollection(fm.companion) ||
                        this.extractCollection(fm.prime) ||
                        this.extractCollection(fm.memory_map) ||
                        'mem';

                    // dex: view_path -> 'dex'
                    protocol.dex.collection = this.extractCollection(fm.view_path) || 'dex';

                    // act: activity_path -> 'act' (falls back to dex if defined, else 'act')
                    protocol.act.collection = this.extractCollection(fm.activity_path) || protocol.dex.collection || 'act';

                    messages.push({
                        level: 'info',
                        code: 'PROTOCOL-RESOLVED',
                        source: this.kind(),
                        message: `Resolved protocol collections from ${foundPath}`
                    });
                }
            } catch (e) {
                messages.push({
                    level: 'warn',
                    code: 'PROTOCOL-PARSE-ERROR',
                    source: this.kind(),
                    message: `Could not parse YAML in ${foundPath}.`
                });
            }
        }

        // 4. Sniff for SQLite (Enabling hybrid storage for mem)
        // Check root first (Kong style) then dex collection
        const possibleDbPaths = [
            join(rootDirectory, 'records.db'),
            join(rootDirectory, protocol.dex.collection, 'records.db')
        ];

        if (possibleDbPaths.some(p => existsSync(p))) {
            // Write-side: Add SQLite storer to mem.on.store while preserving existing config
            const memStore = protocol.mem.on?.store || [];
            if (!memStore.some(p => p.id === 'tbc-record-sqlite:store-records')) {
                protocol.mem.on = protocol.mem.on || {};
                protocol.mem.on.store = [...memStore, { id: 'tbc-record-sqlite:store-records' }];
            }
            // Update dexCollection config for FS store to match resolved dex collection
            protocol.mem.on = protocol.mem.on || {};
            const fsStoreEntry = (protocol.mem.on.store || []).find(p => p.id === 'tbc-record-fs:store-records');
            if (fsStoreEntry) {
                fsStoreEntry.config = { ...fsStoreEntry.config, dexCollection: protocol.dex.collection };
            }
            // Discovery-side (Fallthrough Priority) - SQLite querier
            const memQuery = protocol.mem.on?.query || [];
            const hasSqliteQuerier = memQuery.some(p => p.id === 'tbc-record-sqlite:query-records');
            if (!hasSqliteQuerier) {
                protocol.mem.on = protocol.mem.on || {};
                protocol.mem.on.query = [
                    { id: 'tbc-record-sqlite:query-records' },
                    ...memQuery
                ];
            }
            messages.push({
                level: 'info',
                code: 'SQLITE-ENABLED',
                source: this.kind(),
                message: `Sniffed records.db. Hybrid SQLite [storer,querier] active for ${protocol.mem.collection}.`
            });
        }

        return { protocol, rootMdPath, messages };
    }

    async post(shared: Shared, _prepRes: string, execRes: NodeOutput): Promise<string> {
        shared.system = shared.system || {};
        shared.system.protocol = execRes.protocol;

        shared.stage.messages = shared.stage.messages || [];
        shared.stage.messages.push({
            level: 'info',
            kind: 'raw',
            code: 'UI-HEADER',
            message: ' ┌┤ Protocol Discovery (Dynamic) ├──────────────────────────────',
        });
        shared.stage.messages.push(...execRes.messages);
        shared.stage.messages.push({
            level: 'info',
            kind: 'raw',
            code: 'UI-FOOTER',
            message: ' └───────────────────────────────────────────────────────────',
        });

        return 'default';
    }
}