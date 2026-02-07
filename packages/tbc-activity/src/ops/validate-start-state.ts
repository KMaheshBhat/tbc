import { HAMINode } from "@hami-frameworx/core";

import { Shared } from "../types.js";

export class ValidateStartStateNode extends HAMINode<Shared> {
    kind(): string {
        return "tbc-activity:validate-start-state";
    }

    async prep(shared: Shared): Promise<{ state: string | undefined; activityId: string }> {
        return { state: shared.activityState, activityId: shared.activityId! };
    }

    async exec(params: { state: string | undefined; activityId: string }): Promise<void> {
        if (params.state === 'archive') {
            throw new Error(`Activity ${params.activityId} is already archived and cannot be started`);
        }
        if (params.state === 'current') {
            throw new Error(`Activity ${params.activityId} is already in progress`);
        }
    }

    async post(shared: Shared, _prepRes: string | undefined, _execRes: void): Promise<string | undefined> {
        shared.opts!.targetState = 'current';
        return "default";
    }
}