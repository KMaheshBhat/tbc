import { HAMINode } from "@hami-frameworx/core";

import { TBCCoreStorage } from "../types.js";

interface GenerateDexRecordsNodeConfig {
    verbose: boolean;
}

export class GenerateDexRecordsNode extends HAMINode<TBCCoreStorage, GenerateDexRecordsNodeConfig> {
    kind(): string {
        return "tbc-core:generate-dex-records";
    }

    async prep(shared: TBCCoreStorage): Promise<any> {
        return {
            rootDirectory: shared.rootDirectory,
            recordsByType: shared.recordsByType,
            verbose: this.config?.verbose
        };
    }

    async exec(params: any): Promise<any[]> {
        const { recordsByType } = params;
        const records = [];
        
        for (const [recordType, typeRecords] of Object.entries(recordsByType as Record<string, any[]>)) {
            const content = this.generateIndexContent(recordType, typeRecords as any[]);
            records.push({
                id: `${recordType}-index`,
                filename: `${recordType}.md`,
                contentType: 'markdown',
                title: `${recordType.charAt(0).toUpperCase() + recordType.slice(1)} Records Index`,
                content: content,
                record_type: 'dex'
            });
        }
        
        return records;
    }

    private generateIndexContent(recordType: string, records: any[]): string {
        let content = `=== ${recordType.charAt(0).toUpperCase() + recordType.slice(1)} Records Index ===\n`;

        for (const record of records) {
            // Generic field extraction - include all fields except record_type
            const fields = this.extractSerializableFields(record);
            const fieldString = fields.map(([key, value]) => `${key}: ${value}`).join(', ');
            content += `- ${fieldString}\n`;
        }

        return content;
    }

    private extractSerializableFields(record: any): [string, string][] {
        const fields: [string, string][] = [];

        for (const [key, value] of Object.entries(record)) {
            // Skip record_type as it's redundant in per-type index files
            if (key === 'record_type') continue;

            // Include only simple serializable values
            if (this.isSerializableValue(key, value)) {
                fields.push([key, String(value)]);
            }
        }

        return fields;
    }

    private isSerializableValue(key: string, value: any): boolean {
        const type = typeof value;

        // Exclude specific complex fields
        if (key === 'content' || key === 'fullContent' || key === 'filename') {
            return false;
        }

        // Include simple types
        if (type === 'string' || type === 'number' || type === 'boolean') {
            return true;
        }

        // Exclude complex types
        if (value === null || value === undefined ||
            type === 'object' || type === 'function') {
            return false;
        }

        return true;
    }

    async post(shared: TBCCoreStorage, prepRes: any, execRes: any[]): Promise<string | undefined> {
        // Store the generated records for use by store-records node
        shared.generatedDexRecords = execRes;
        
        // Set up records array for store operation
        shared.records = execRes;
        shared.collection = 'dex';
        
        return 'default'; // Follow HAMI pattern
    }
}