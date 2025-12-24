import { HAMINode } from "@hami-frameworx/core";

import { writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import matter from "gray-matter";
import yaml from "js-yaml";

import { TBCRecordFSStorage } from "../types.js";

type StoreRecordsInput = {
    rootDirectory: string;
    collection: string;
    records: Record<string, any>[];
};

type StoreRecordsOutput = string[]; // array of stored IDs

export class StoreRecordsNode extends HAMINode<TBCRecordFSStorage> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-record-fs:store-records";
    }

    async prep(shared: TBCRecordFSStorage): Promise<StoreRecordsInput> {
        if (!shared.rootDirectory || !shared.collection || !shared.records) {
            throw new Error("rootDirectory, collection, and records are required in shared state");
        }
        return {
            rootDirectory: shared.rootDirectory,
            collection: shared.collection,
            records: shared.records,
        };
    }

    async exec(params: StoreRecordsInput): Promise<StoreRecordsOutput> {
        const storedIds: string[] = [];
        const collectionPath = join(params.rootDirectory, params.collection);

        // Ensure collection directory exists
        await mkdir(collectionPath, { recursive: true });

        for (const record of params.records) {
            if (!record.id) {
                console.error(`Record missing id:` , record);
                continue;
            }

            try {
                // Determine file format based on record.filename or record.contentType
                const fileFormat = this.determineFileFormat(record);
                const filePath = this.constructFilePath(collectionPath, record, fileFormat);
                const fileContent = this.generateFileContent(record, fileFormat);

                // Ensure directory exists
                await mkdir(dirname(filePath), { recursive: true });

                // Write file
                await writeFile(filePath, fileContent, 'utf-8');
                storedIds.push(record.id);
            } catch (error) {
                console.error(`Error storing record ${record.id}:`, error);
                // Continue with other records
            }
        }

        return storedIds;
    }

    private determineFileFormat(record: Record<string, any>): 'markdown' | 'json' | 'yaml' | 'raw' {
        // Check filename extension first
        if (record.filename) {
            if (record.filename.endsWith('.md')) {
                return 'markdown';
            }
            if (record.filename.endsWith('.json')) {
                return 'json';
            }
            if (record.filename.endsWith('.yaml') || record.filename.endsWith('.yml')) {
                return 'yaml';
            }
        }

        // Check contentType
        if (record.contentType === 'markdown') {
            return 'markdown';
        }
        if (record.contentType === 'json') {
            return 'json';
        }
        if (record.contentType === 'yaml') {
            return 'yaml';
        }

        // For filenames like .kilocodemodes (dotfiles without extension), default to yaml if contentType indicates
        if (record.filename && record.filename.startsWith('.') && !record.filename.includes('.') && record.contentType === 'yaml') {
            return 'yaml';
        }

        // Default to raw format
        return 'raw';
    }

    private constructFilePath(collectionPath: string, record: Record<string, any>, format: 'markdown' | 'json' | 'yaml' | 'raw'): string {
        // Use record.filename if provided
        if (record.filename) {
            return join(collectionPath, record.filename);
        }

        // Default filename based on format
        switch (format) {
            case 'markdown':
                return join(collectionPath, `${record.id}.md`);
            case 'json':
                return join(collectionPath, `${record.id}.json`);
            case 'yaml':
                return join(collectionPath, `${record.id}.yaml`);
            case 'raw':
                return join(collectionPath, record.id);
        }
    }

    private generateFileContent(record: Record<string, any>, format: 'markdown' | 'json' | 'yaml' | 'raw'): string {
        switch (format) {
            case 'markdown':
                const { content, frontmatter, ...frontmatterData } = record;
                const finalFrontmatter = frontmatter || frontmatterData;
                // Use yaml.dump with no line wrapping to keep description on single line
                const frontmatterStr = yaml.dump(finalFrontmatter, { lineWidth: -1 });
                return `---\n${frontmatterStr}---\n\n${content || ''}`;
            case 'json':
                return JSON.stringify(record, null, 2);
            case 'yaml':
                return yaml.dump(record.content || record);
            case 'raw':
                return record.content || '';
        }
    }

    async post(shared: TBCRecordFSStorage, _prepRes: StoreRecordsInput, execRes: StoreRecordsOutput): Promise<string | undefined> {
        shared.storeResults = { ...shared.storeResults, [shared.collection!]: execRes };
        return "default";
    }
}