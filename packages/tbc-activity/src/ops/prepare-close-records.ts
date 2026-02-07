import { HAMINode } from "@hami-frameworx/core";

import { Shared } from "../types.js";

export class PrepareCloseRecordsNode extends HAMINode<Shared> {
    kind(): string {
        return "tbc-activity:prepare-close-records";
    }

    private isValidUuid7(id: string): boolean {
        // UUID v7 regex: 8-4-4-4-12 with version 7
        const uuidV7Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidV7Regex.test(id);
    }

    async prep(shared: Shared): Promise<void> {
        // No prep needed
    }

    async exec(_prepRes: void): Promise<void> {
        // No exec needed
    }

    async post(shared: Shared, _prepRes: void, _execRes: void): Promise<string | undefined> {
        const collectionResults = shared.fetchResults?.[shared.collection!];
        let records = collectionResults ? Object.values(collectionResults) : [];

        // Filter to only include records with valid UUID v7 IDs (TBC records)
        records = records.filter(record => this.isValidUuid7(record.id));

        // For assimilation, we want records stored directly in mem/ with simple filenames
        for (const record of records) {
            if (record.filename) {
                // Extract just the filename part (e.g., "uuid.md" from "act/current/uuid/uuid.md")
                const parts = record.filename.split('/');
                record.filename = parts[parts.length - 1];
            }
        }

        shared.records = records;
        shared.collection = 'mem';
        return "default";
    }
}