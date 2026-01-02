import { HAMINode } from "@hami-frameworx/core";

import type { TBCViewStorage } from "../types.js";

type StructureWatermarkNodeInput = {
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
    viewStore: any; // ViewStore
};

type StructureWatermarkNodeOutput = {
    structureResults: Array<{
        nodeId: string;
        structure: { status: number; message?: string };
    }>;
};

export class StructureWatermarkNode extends HAMINode<TBCViewStorage> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-view:structure-watermark";
    }

    async prep(shared: TBCViewStorage): Promise<StructureWatermarkNodeInput> {
        if (!shared.processedRecords) {
            throw new Error("processedRecords is required in shared state");
        }
        if (!shared.rootDirectory) {
            throw new Error("rootDirectory is required in shared state");
        }
        if (!shared.viewStore) {
            throw new Error("viewStore is required in shared state");
        }
        return {
            processedRecords: shared.processedRecords,
            rootDirectory: shared.rootDirectory,
            viewStore: shared.viewStore,
        };
    }

    async exec(params: StructureWatermarkNodeInput): Promise<StructureWatermarkNodeOutput> {
        const structureResults: StructureWatermarkNodeOutput['structureResults'] = [];

        for (const record of params.processedRecords) {
            const structure = await this.checkStructure(record, params.rootDirectory);

            // Update watermark in database
            params.viewStore.setWatermark(record.node.id, 'structure', structure.status, structure.message, 'structure-watermark');

            structureResults.push({
                nodeId: record.node.id,
                structure,
            });
        }

        return { structureResults };
    }

    private async checkStructure(record: StructureWatermarkNodeInput['processedRecords'][0], rootDirectory: string): Promise<{ status: number; message?: string }> {
        try {
            // For temporal logs, check mandatory H2 sections
            if (['log'].includes(record.node.record_type)) {
                const content = await this.getFileContent(record.node.file_path, rootDirectory);
                if (!content) {
                    return { status: 0, message: 'Cannot read file content' };
                }

                const requiredSections = ['## Context/Background', '## Process/Dialogue Log', '## Deliverables/Outcomes'];
                for (const section of requiredSections) {
                    if (!content.includes(section)) {
                        return { status: 0, message: `Missing required section: ${section}` };
                    }
                }
            }

            return { status: 1, message: 'OK' };
        } catch (error) {
            return { status: 3, message: `Error checking structure: ${error}` };
        }
    }

    private async getFileContent(filePath: string, rootDirectory: string): Promise<string | null> {
        try {
            const fullPath = require('path').join(rootDirectory, filePath);
            return await Bun.file(fullPath).text();
        } catch {
            return null;
        }
    }

    async post(shared: TBCViewStorage, _prepRes: StructureWatermarkNodeInput, execRes: StructureWatermarkNodeOutput): Promise<string | undefined> {
        shared.structureResults = execRes.structureResults;
        return "default";
    }
}