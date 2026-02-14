import { HAMINode } from '@hami-frameworx/core';

import type { Shared } from '../types.js';

type SchemaWatermarkNodeInput = {
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

type SchemaWatermarkNodeOutput = {
    schemaResults: Array<{
        nodeId: string;
        schema: { status: number; message?: string };
    }>;
};

export class SchemaWatermarkNode extends HAMINode<Shared> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return 'tbc-dex:schema-watermark';
    }

    async prep(shared: Shared): Promise<SchemaWatermarkNodeInput> {
        if (!shared.processedRecords) {
            throw new Error('processedRecords is required in shared state');
        }
        if (!shared.rootDirectory) {
            throw new Error('rootDirectory is required in shared state');
        }
        if (!shared.dexStore) {
            throw new Error('dexStore is required in shared state');
        }
        return {
            processedRecords: shared.processedRecords,
            rootDirectory: shared.rootDirectory,
            dexStore: shared.dexStore,
        };
    }

    async exec(params: SchemaWatermarkNodeInput): Promise<SchemaWatermarkNodeOutput> {
        const schemaResults: SchemaWatermarkNodeOutput['schemaResults'] = [];

        for (const record of params.processedRecords) {
            const schema = await this.checkSchema(record);

            // Update watermark in database
            params.dexStore.setWatermark(record.node.id, 'schema', schema.status, schema.message, 'schema-watermark');

            schemaResults.push({
                nodeId: record.node.id,
                schema,
            });
        }

        return { schemaResults };
    }

    private async checkSchema(record: SchemaWatermarkNodeInput['processedRecords'][0]): Promise<{ status: number; message?: string }> {
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
            goal_status: 'string',
            party_type: 'string',
            log_type: 'string',
        };
    }

    async post(shared: Shared, _prepRes: SchemaWatermarkNodeInput, execRes: SchemaWatermarkNodeOutput): Promise<string | undefined> {
        shared.schemaResults = execRes.schemaResults;
        return 'default';
    }
}