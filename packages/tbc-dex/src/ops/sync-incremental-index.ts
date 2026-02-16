import assert from 'node:assert';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
    HAMINode,
    validateAgainstSchema,
} from '@hami-frameworx/core';

import { Shared } from '../types.js';

interface SyncPayload {
    root: string;
    drafts: any[];
    dexCollection: string;
}

// in packages/tbc-dex/src/ops/sync-incremental-index.ts
export class SyncIncrementalIndexNode extends HAMINode<Shared, any> {
    kind() { return 'tbc-dex:sync-incremental-index'; }
    async prep(shared: Shared): Promise<SyncPayload> {
        // 1. Resolve Root (handle both config or shared stage)
        const root = this.config.rootDirectory || shared.stage?.rootDirectory;
        assert(root, 'rootDirectory must be provided in config or shared.stage');

        // 2. Resolve Drafts using HAMI path logic
        const sourcePath = this.config.sourcePath;
        const rawDrafts = this.resolvePath(shared, sourcePath);

        const dexCollection = shared.system.protocol.dex.collection || 'dex';

        if (!rawDrafts) {
            return { root, drafts: [], dexCollection };
        }

        const drafts = Array.isArray(rawDrafts) ? rawDrafts : [rawDrafts];

        return { root, drafts, dexCollection };
    }

    async exec(payload: SyncPayload) {
        const { root, drafts, dexCollection } = payload;
        if (drafts.length === 0) return 'default';

        const partitions: Record<string, any[]> = {};

        for (const draft of drafts) {
            // Handle both raw drafts and formatted record objects
            const type = draft.record_type || 'unknown';
            if (!partitions[type]) partitions[type] = [];

            // INDEX STRATEGY:
            // We strip 'content' if it's too large, or keep specific indexable fields.
            // If 'draft' is a record object from tbc-record, it might have 'id' and 'content'.
            // We want the metadata fields for the Dex.
            partitions[type].push(draft);
        }

        for (const [type, records] of Object.entries(partitions)) {
            const dexDir = join(root, dexCollection );
            if (!existsSync(dexDir)) mkdirSync(dexDir, { recursive: true });

            const indexPath = join(dexDir, `${type}.memory.jsonl`);
            await this.updatePartition(indexPath, records);
        }
        return 'default';
    }

    private async updatePartition(path: string, newRecords: any[]) {
        let lines: string[] = existsSync(path)
            ? readFileSync(path, 'utf-8').split('\n').filter(l => l.trim())
            : [];

        const newIds = new Set(newRecords.map(r => r.id));

        lines = lines.filter(line => {
            try {
                const entry = JSON.parse(line);
                return !newIds.has(entry.id);
            } catch (e) { return false; }
        });

        for (const record of newRecords) {
            // Strip the heavy content for the Dex
            // We want the index to be a metadata-only manifest
            const { content, fullContent, ...metadata } = record;

            // Ensure we at least have a title/id for search results
            lines.push(JSON.stringify(metadata));
        }

        writeFileSync(path, lines.join('\n') + '\n');
    }

    /**
     * Resolves a value from a nested object using a dot-notation string path.
     * @param obj The source object (usually 'shared')
     * @param path The string path (e.g., 'stage.draft.record')
     * @returns The value at that path, or undefined if not found.
     */
    protected resolvePath(obj: any, path: string): any {
        if (!path || !obj) return undefined;

        return path.split('.').reduce((prev, curr) => {
            return prev ? prev[curr] : undefined;
        }, obj);
    }
}