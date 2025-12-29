import { HAMINode } from "@hami-frameworx/core";

import { TBCActivityStorage } from "../types.js";

export class PrepareCloseRecordsNode extends HAMINode<TBCActivityStorage> {
    kind(): string {
        return "tbc-activity:prepare-close-records";
    }

    async prep(shared: TBCActivityStorage): Promise<void> {
        // No prep needed
    }

    async exec(_prepRes: void): Promise<void> {
        // No exec needed
    }

    async post(shared: TBCActivityStorage, _prepRes: void, _execRes: void): Promise<string | undefined> {
        const collectionResults = shared.fetchResults?.[shared.collection!];
        const records = collectionResults ? Object.values(collectionResults) : [];

        // For assimilation, we want records stored directly in mem/ with simple filenames
        for (const record of records) {
            if (record.filename) {
                // Extract just the filename part (e.g., "uuid.md" from "act/current/uuid/uuid.md")
                const parts = record.filename.split('/');
                record.filename = parts[parts.length - 1];
            }
        }

        shared.records = records;
        return "default";
    }
}