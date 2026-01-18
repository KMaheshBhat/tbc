import { HAMINode } from "@hami-frameworx/core";

import type { Shared } from "../types.js";

type LinksWatermarkNodeInput = {
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
    rootDirectory: string;
    dexStore: any; // DexStore
};

type LinksWatermarkNodeOutput = {
    linksResults: Array<{
        nodeId: string;
        links: { status: number; message?: string };
    }>;
};

export class LinksWatermarkNode extends HAMINode<Shared> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-dex:links-watermark";
    }

    async prep(shared: Shared): Promise<LinksWatermarkNodeInput> {
        if (!shared.processedRecords) {
            throw new Error("processedRecords is required in shared state");
        }
        if (!shared.rootDirectory) {
            throw new Error("rootDirectory is required in shared state");
        }
        if (!shared.dexStore) {
            throw new Error("dexStore is required in shared state");
        }
        return {
            processedRecords: shared.processedRecords,
            rootDirectory: shared.rootDirectory,
            dexStore: shared.dexStore,
        };
    }

    async exec(params: LinksWatermarkNodeInput): Promise<LinksWatermarkNodeOutput> {
        const linksResults: LinksWatermarkNodeOutput['linksResults'] = [];

        for (const record of params.processedRecords) {
            const links = await this.checkLinks(record, params.dexStore);

            // Update watermark in database
            params.dexStore.setWatermark(record.node.id, 'links', links.status, links.message, 'links-watermark');

            linksResults.push({
                nodeId: record.node.id,
                links,
            });
        }

        return { linksResults };
    }

    private async checkLinks(record: LinksWatermarkNodeInput['processedRecords'][0], dexStore: any): Promise<{ status: number; message?: string }> {
        try {
            // Check if all target IDs in edges exist
            for (const edge of record.edges) {
                const targetExists = dexStore.getNode(edge.target_id);
                if (!targetExists) {
                    return { status: 0, message: `Broken link to non-existent record: ${edge.target_id}` };
                }
            }

            return { status: 1, message: 'OK' };
        } catch (error) {
            return { status: 3, message: `Error checking links: ${error}` };
        }
    }

    async post(shared: Shared, _prepRes: LinksWatermarkNodeInput, execRes: LinksWatermarkNodeOutput): Promise<string | undefined> {
        shared.linksResults = execRes.linksResults;
        return "default";
    }
}