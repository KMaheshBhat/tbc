import { HAMINode } from "@hami-frameworx/core";

import type { TBCDexStorage } from "../types.js";

type PresenceWatermarkNodeInput = {
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

type PresenceWatermarkNodeOutput = {
    presenceResults: Array<{
        nodeId: string;
        presence: { status: number; message?: string };
    }>;
};

export class PresenceWatermarkNode extends HAMINode<TBCDexStorage> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-dex:presence-watermark";
    }

    async prep(shared: TBCDexStorage): Promise<PresenceWatermarkNodeInput> {
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

    async exec(params: PresenceWatermarkNodeInput): Promise<PresenceWatermarkNodeOutput> {
        const presenceResults: PresenceWatermarkNodeOutput['presenceResults'] = [];

        for (const record of params.processedRecords) {
            const presence = await this.checkPresence(record.node, params.rootDirectory);

            // Update watermark in database
            params.dexStore.setWatermark(record.node.id, 'presence', presence.status, presence.message, 'presence-watermark');

            presenceResults.push({
                nodeId: record.node.id,
                presence,
            });
        }

        return { presenceResults };
    }

    private async checkPresence(node: PresenceWatermarkNodeInput['processedRecords'][0]['node'], rootDirectory: string): Promise<{ status: number; message?: string }> {
        try {
            const fs = require('fs');
            const path = require('path');
            const fullPath = path.join(rootDirectory, node.file_path);
            const exists = fs.existsSync(fullPath);

            if (!exists) {
                return { status: 0, message: 'File not found' };
            }

            // Check if ID matches filename
            const filename = path.basename(node.file_path, path.extname(node.file_path));
            if (filename !== node.id) {
                return { status: 0, message: `ID mismatch: expected ${node.id}, got ${filename}` };
            }

            return { status: 1, message: 'OK' };
        } catch (error) {
            return { status: 3, message: `Error checking presence: ${error}` };
        }
    }

    async post(shared: TBCDexStorage, _prepRes: PresenceWatermarkNodeInput, execRes: PresenceWatermarkNodeOutput): Promise<string | undefined> {
        shared.presenceResults = execRes.presenceResults;
        return "default";
    }
}