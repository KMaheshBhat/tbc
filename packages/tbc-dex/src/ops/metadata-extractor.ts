import { HAMINode } from "@hami-frameworx/core";
import matter from "gray-matter";
import path from "path";

import type { Shared } from "../types.js";

type MetadataExtractorInput = {
    changedFiles: Array<{
        id: string;
        collection: string;
        filePath: string;
        hash: string;
        mtime: number;
        isNew: boolean;
    }>;
    rootDirectory: string;
    dexStore: any; // DexStore
};

type MetadataExtractorOutput = {
    processedRecords: Array<{
        node: {
            id: string;
            collection: string;
            record_type: string;
            hash: string;
            last_seen_at: number;
            file_path: string;
        };
        attributes: Record<string, any>;
        edges: Array<{
            target_id: string;
            edge_type: string;
            created_at: number;
        }>;
    }>;
};

export class MetadataExtractorNode extends HAMINode<Shared> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-dex:metadata-extractor";
    }

    async prep(shared: Shared): Promise<MetadataExtractorInput> {
        if (!shared.changedFiles) {
            throw new Error("changedFiles is required in shared state");
        }
        if (!shared.rootDirectory) {
            throw new Error("rootDirectory is required in shared state");
        }
        if (!shared.dexStore) {
            throw new Error("dexStore is required in shared state");
        }
        return {
            changedFiles: shared.changedFiles,
            rootDirectory: shared.rootDirectory,
            dexStore: shared.dexStore,
        };
    }

    async exec(params: MetadataExtractorInput): Promise<MetadataExtractorOutput> {
        const processedRecords: MetadataExtractorOutput['processedRecords'] = [];

        for (const file of params.changedFiles) {
            try {
                const fullPath = path.join(params.rootDirectory, file.filePath);
                const content = await Bun.file(fullPath).text();
                const parsed = matter(content);

                const recordType = parsed.data.record_type || this.inferRecordType(file.collection, file.id);
                const attributes = { ...parsed.data };
                delete attributes.record_type; // Remove from attributes as it's stored separately

                const edges = this.extractLinks(parsed.content, file.id);

                processedRecords.push({
                    node: {
                        id: file.id,
                        collection: file.collection,
                        record_type: recordType,
                        hash: file.hash,
                        last_seen_at: file.mtime,
                        file_path: file.filePath,
                    },
                    attributes,
                    edges,
                });
            } catch (error) {
                // Log error if verbose, but shared not available here
                console.warn(`Failed to process file ${file.filePath}:`, error);
            }
        }

        return { processedRecords };
    }

    private inferRecordType(collection: string, id: string): string {
        // Basic inference based on collection and ID patterns
        if (collection === 'mem') {
            if (id === 'root') return 'root';
            if (id.startsWith('019')) return 'log'; // UUID v7 pattern
            return 'note'; // Default for mem
        }
        if (collection === 'sys') {
            return 'specification';
        }
        if (collection === 'skills') {
            return 'skill';
        }
        return 'unknown';
    }

    private extractLinks(content: string, sourceId: string): MetadataExtractorOutput['processedRecords'][0]['edges'] {
        const edges: MetadataExtractorOutput['processedRecords'][0]['edges'] = [];
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        const now = Math.floor(Date.now() / 1000);

        let match;
        while ((match = linkRegex.exec(content)) !== null) {
            const [, , linkPath] = match;

            // Extract ID from link path
            const linkId = this.extractIdFromLink(linkPath);
            if (linkId && linkId !== sourceId) { // Avoid self-links
                edges.push({
                    target_id: linkId,
                    edge_type: 'links_to',
                    created_at: now,
                });
            }
        }

        return edges;
    }

    private extractIdFromLink(linkPath: string): string | null {
        // Handle relative links like /mem/uuid.md or mem/uuid.md
        const parts = linkPath.split('/');
        const filename = parts[parts.length - 1];
        if (filename.endsWith('.md')) {
            return filename.replace('.md', '');
        }
        return null;
    }

    async post(shared: Shared, _prepRes: MetadataExtractorInput, execRes: MetadataExtractorOutput): Promise<string | undefined> {
        // Upsert nodes, attributes, and edges to database
        shared.dexStore!.beginTransaction();

        try {
            for (const record of execRes.processedRecords) {
                shared.dexStore!.upsertNode(record.node);
                shared.dexStore!.upsertAttributes(record.node.id, record.attributes);
                shared.dexStore!.upsertEdges(record.node.id, record.edges);
            }

            shared.dexStore!.commit();
        } catch (error) {
            shared.dexStore!.rollback();
            throw error;
        }

        shared.processedRecords = execRes.processedRecords;
        return "default";
    }
}