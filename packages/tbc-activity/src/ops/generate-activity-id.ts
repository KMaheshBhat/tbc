import { uuidv7 } from 'uuidv7';

import { HAMINode } from "@hami-frameworx/core";

import { Shared } from "../types.js";

export class GenerateActivityIdNode extends HAMINode<Shared> {
    kind(): string {
        return "tbc-activity:generate-activity-id";
    }

    async prep(shared: Shared): Promise<string | undefined> {
        // Return the provided activityId if exists, else undefined
        return shared.opts?.activityId;
    }

    async exec(prepRes: string | undefined): Promise<string> {
        if (prepRes) {
            // Use provided
            return prepRes;
        } else {
            // Generate new UUID
            return uuidv7();
        }
    }

    async post(shared: Shared, _prepRes: boolean, execRes: string): Promise<string | undefined> {
        shared.activityId = execRes;
        return "default";
    }
}