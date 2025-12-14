import { HAMINode } from "@hami-frameworx/core";

import { TBCCoreStorage } from "../types.js";

interface GenerateDexExtensionsNodeConfig {
    verbose: boolean;
}

export class GenerateDexExtensionsNode extends HAMINode<TBCCoreStorage, GenerateDexExtensionsNodeConfig> {
    kind(): string {
        return "tbc-core:generate-dex-extensions";
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
        // Collect all extension records regardless of type (typically 'specification')
        const extensionsRecords: any[] = [];
        for (const typeRecords of Object.values(recordsByType as Record<string, any[]>)) {
            extensionsRecords.push(...typeRecords);
        }

        const content = this.generateIndexContent(extensionsRecords);
        const record = {
            id: 'extensions',
            filename: 'extensions.md',
            contentType: 'markdown',
            title: 'Extensions Index',
            content: content,
            record_type: 'dex'
        };

        return [record];
    }

    private generateIndexContent(records: Record<string, any>): string {
        let content = "=== Extensions Index ===\n";

        for (const id in records) {
            const record = records[id];
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
            // Skip record_type as it's redundant in index files
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
        shared.generatedDexExtensions = execRes;

        // Set up records array for store operation
        shared.records = execRes;
        shared.collection = 'dex';

        return 'default'; // Follow HAMI pattern
    }
}