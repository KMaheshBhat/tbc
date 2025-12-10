import { HAMINode } from "@hami-frameworx/core";
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

interface WriteRecordsNodeConfig {
    verbose: boolean;
}

export class WriteRecordsNode extends HAMINode<Record<string, any>, WriteRecordsNodeConfig> {
    kind(): string {
        return "tbc-core:write-records";
    }

    async prep(shared: Record<string, any>): Promise<any> {
        return {
            rootDirectory: shared.rootDirectory,
            recordsByType: shared.recordsByType,
            verbose: this.config?.verbose
        };
    }

    async exec(params: any): Promise<string> {
        const { rootDirectory, recordsByType, verbose } = params;
        const dexDir = join(rootDirectory, 'dex');

        // Create dex directory if it doesn't exist
        await mkdir(dexDir, { recursive: true });

        // Write index files for each record type
        for (const [recordType, records] of Object.entries(recordsByType as Record<string, any[]>)) {
            const indexContent = this.generateIndexContent(recordType, records as any[]);
            const indexPath = join(dexDir, `${recordType}.md`);

            await writeFile(indexPath, indexContent);
            verbose && console.log(`Wrote ${(records as any[]).length} ${recordType} records to ${indexPath}`);
        }

        return 'default'; // Follow HAMI pattern - return 'default' for linear flows
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

    async post(shared: Record<string, any>, prepRes: any, execRes: string): Promise<string | undefined> {
        shared.refreshRecordsResult = execRes;
        return 'default'; // Follow HAMI pattern
    }
}