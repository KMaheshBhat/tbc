import { HAMINode } from "@hami-frameworx/core";

import { TBCActivityStorage } from "../types.js";

export class ValidateBacklogStateNode extends HAMINode<TBCActivityStorage> {
    kind(): string {
        return "tbc-activity:validate-backlog-state";
    }

    async prep(shared: TBCActivityStorage): Promise<{ state: string | undefined; activityId: string }> {
        return { state: shared.activityState, activityId: shared.activityId! };
    }

    async exec(params: { state: string | undefined; activityId: string }): Promise<void> {
        if (params.state !== 'current') {
            throw new Error(`Activity ${params.activityId} is not in progress and cannot be moved to backlog`);
        }
    }

    async post(shared: TBCActivityStorage, _prepRes: string | undefined, _execRes: void): Promise<string | undefined> {
        shared.opts!.targetState = 'backlog';
        return "default";
    }
}