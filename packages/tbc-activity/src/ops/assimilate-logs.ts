import { HAMINode } from "@hami-frameworx/core";

import { Shared } from "../types.js";

export class AssimilateLogsNode extends HAMINode<Shared> {
    kind(): string {
        return "tbc-activity:assimilate-logs";
    }

    async prep(shared: Shared): Promise<{ activityId: string; rootDirectory: string }> {
        if (!shared.activityId) {
            throw new Error("activityId is required");
        }
        const rootDirectory = shared.rootDirectory || process.cwd();
        return { activityId: shared.activityId, rootDirectory };
    }

    async exec(_params: { activityId: string; rootDirectory: string }): Promise<void> {
        // The actual assimilation is handled by fetching and storing
        // This node just prepares for the flow
    }

    async post(shared: Shared, prepRes: { activityId: string; rootDirectory: string }, _execRes: void): Promise<string | undefined> {
        // Set collection to fetch from activity directory
        shared.collection = `act/current/${prepRes.activityId}`;
        // IDs will be set by fetch-all-ids or similar
        // Then store to mem
        return "default";
    }
}