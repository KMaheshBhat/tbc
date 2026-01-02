import { HAMINode } from "@hami-frameworx/core";

import type { TBCViewStorage } from "../types.js";

type WatermarkExecutorInput = {
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

type WatermarkExecutorOutput = {
    watermarkResults: Array<{
        nodeId: string;
        watermarks: Record<string, { status: number; message?: string }>;
    }>;
};

export class WatermarkExecutorNode extends HAMINode<TBCViewStorage> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-view:watermark-executor";
    }

    async prep(shared: TBCViewStorage): Promise<WatermarkExecutorInput> {
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

    async exec(params: WatermarkExecutorInput): Promise<WatermarkExecutorOutput> {
        const watermarkResults: WatermarkExecutorOutput['watermarkResults'] = [];

        for (const record of params.processedRecords) {
            const watermarks: Record<string, { status: number; message?: string }> = {};

            // Execute presence watermark
            watermarks.presence = await this.checkPresence(record.node, params.rootDirectory);

            // Execute schema watermark
            watermarks.schema = await this.checkSchema(record);

            // Execute structure watermark
            watermarks.structure = await this.checkStructure(record, params.rootDirectory);

            // Execute links watermark
            watermarks.links = await this.checkLinks(record, params.viewStore);

            // Execute vector watermark (placeholder)
            watermarks.vector = { status: 2, message: "Not implemented" }; // pending

            // Update watermarks in database
            for (const [type, result] of Object.entries(watermarks)) {
                params.viewStore.setWatermark(record.node.id, type as any, result.status, result.message, 'watermark-executor');
            }

            watermarkResults.push({
                nodeId: record.node.id,
                watermarks,
            });
        }

        return { watermarkResults };
    }

    private async checkPresence(node: WatermarkExecutorInput['processedRecords'][0]['node'], rootDirectory: string): Promise<{ status: number; message?: string }> {
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

    private async checkSchema(record: WatermarkExecutorInput['processedRecords'][0]): Promise<{ status: number; message?: string }> {
        try {
            // Check required YAML frontmatter fields based on record type
            const requiredFields = this.getRequiredFields(record.node.record_type);

            for (const field of requiredFields) {
                if (!(field in record.attributes)) {
                    return { status: 0, message: `Missing required field: ${field}` };
                }
            }

            // Check field types
            const fieldTypes = this.getFieldTypes(record.node.record_type);
            for (const [field, expectedType] of Object.entries(fieldTypes)) {
                const value = record.attributes[field];
                if (value !== undefined && typeof value !== expectedType) {
                    return { status: 0, message: `Field ${field} has wrong type: expected ${expectedType}, got ${typeof value}` };
                }
            }

            return { status: 1, message: 'OK' };
        } catch (error) {
            return { status: 3, message: `Error checking schema: ${error}` };
        }
    }

    private async checkStructure(record: WatermarkExecutorInput['processedRecords'][0], rootDirectory: string): Promise<{ status: number; message?: string }> {
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

    private async checkLinks(record: WatermarkExecutorInput['processedRecords'][0], viewStore: any): Promise<{ status: number; message?: string }> {
        try {
            // Check if all target IDs in edges exist
            for (const edge of record.edges) {
                const targetExists = viewStore.getNode(edge.target_id);
                if (!targetExists) {
                    return { status: 0, message: `Broken link to non-existent record: ${edge.target_id}` };
                }
            }

            return { status: 1, message: 'OK' };
        } catch (error) {
            return { status: 3, message: `Error checking links: ${error}` };
        }
    }

    private getRequiredFields(recordType: string): string[] {
        switch (recordType) {
            case 'root':
                return ['companion', 'prime', 'system_path', 'memory_path', 'view_path', 'activity_path'];
            case 'log':
                return ['record_type', 'log_type'];
            case 'party':
                return ['party_type'];
            case 'goal':
                return ['goal_owner', 'goal_type', 'goal_status'];
            default:
                return ['record_type'];
        }
    }

    private getFieldTypes(recordType: string): Record<string, string> {
        // Basic type checking - could be expanded
        return {
            'goal_status': 'string',
            'party_type': 'string',
            'log_type': 'string',
        };
    }

    private async getFileContent(filePath: string, rootDirectory: string): Promise<string | null> {
        try {
            const fullPath = require('path').join(rootDirectory, filePath);
            return await Bun.file(fullPath).text();
        } catch {
            return null;
        }
    }

    async post(shared: TBCViewStorage, _prepRes: WatermarkExecutorInput, execRes: WatermarkExecutorOutput): Promise<string | undefined> {
        shared.watermarkResults = execRes.watermarkResults;
        return "default";
    }
}