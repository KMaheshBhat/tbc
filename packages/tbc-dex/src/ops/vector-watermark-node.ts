import { HAMINode } from "@hami-frameworx/core";

import type { Shared } from "../types.js";

type VectorWatermarkNodeInput = {
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

type VectorWatermarkNodeOutput = {
    vectorResults: Array<{
        nodeId: string;
        vector: { status: number; message?: string };
    }>;
};

export class VectorWatermarkNode extends HAMINode<Shared> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-dex:vector-watermark";
    }

    async prep(shared: Shared): Promise<VectorWatermarkNodeInput> {
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

    async exec(params: VectorWatermarkNodeInput): Promise<VectorWatermarkNodeOutput> {
        const vectorResults: VectorWatermarkNodeOutput['vectorResults'] = [];

        for (const record of params.processedRecords) {
            const vector = await this.checkVector(record);

            // Update watermark in database
            params.dexStore.setWatermark(record.node.id, 'vector', vector.status, vector.message, 'vector-watermark');

            vectorResults.push({
                nodeId: record.node.id,
                vector,
            });
        }

        return { vectorResults };
    }

    private async checkVector(record: VectorWatermarkNodeInput['processedRecords'][0]): Promise<{ status: number; message?: string }> {
        // Placeholder for vector embedding checks
        return { status: 2, message: "Not implemented" };
    }

    async post(shared: Shared, _prepRes: VectorWatermarkNodeInput, execRes: VectorWatermarkNodeOutput): Promise<string | undefined> {
        shared.vectorResults = execRes.vectorResults;
        return "default";
    }
}