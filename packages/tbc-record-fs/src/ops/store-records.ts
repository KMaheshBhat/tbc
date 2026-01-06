import assert from "assert";
import { writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import matter from "gray-matter";
import yaml from "js-yaml";

import { HAMINode } from "@hami-frameworx/core";

import { TBCRecordFSStorage } from "../types.js";
import { TBCStore } from "@tbc-frameworx/tbc-record";

export class StoreRecordsNode extends HAMINode<TBCRecordFSStorage> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-record-fs:store-records";
    }

    async prep(shared: TBCRecordFSStorage): Promise<[string, string, Record<string, any>[]]> {
        assert(shared.record, 'shared.record is required');
        assert(shared.record?.rootDirectory, 'shared.record.rootDirectory is required');
        assert(shared.record?.collection, 'shared.record.collection is required');
        assert(shared.record?.records, 'shared.record.records is required');
        return [
            shared.record?.rootDirectory!,
            shared.record?.collection!,
            shared.record?.records!,
        ];
    }

    async exec(params: [string, string, Record<string, any>[]]): Promise<TBCStore> {
        const [rootDirectory, collection, records] = params;
        const storedTBCStore: TBCStore = {
            [collection]: {},
        };
        const collectionPath = join(rootDirectory, collection);

        // Ensure collection directory exists
        await mkdir(collectionPath, { recursive: true });

        for (const record of records) {
            if (!record.id) {
                console.error(`Record missing id:`, record);
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
                storedTBCStore[collection][record.id] = record;
            } catch (error) {
                console.error(`Error storing record ${record.id}:`, error);
                // Continue with other records
            }
        }
        return storedTBCStore;
    }

    private determineFileFormat(record: Record<string, any>): 'markdown' | 'json' | 'yaml' | 'raw' {
        // Check contentType first for interface files
        if (record.contentType === 'text') {
            return 'raw';
        }

        // Check filename extension
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

    async post(
        shared: TBCRecordFSStorage,
        _prepRes: [string, string, Record<string, any>[]],
        execRes: TBCStore,
    ): Promise<string | undefined> {
        assert(shared.record, 'shared.record is required');
        if (!shared.record.result) shared.record.result = {};
        shared.record.result.records = execRes;
        shared.record.result.totalCount = Object.values(execRes).reduce((sum, collection) => sum + Object.keys(collection).length, 0);
        return "default";
    }
}