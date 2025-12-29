import { HAMINode } from "@hami-frameworx/core";

import { TBCActivityStorage } from "../types.js";

export class PrepareMemStoreNode extends HAMINode<TBCActivityStorage> {
    kind(): string {
        return "tbc-activity:prepare-mem-store";
    }

    async prep(shared: TBCActivityStorage): Promise<void> {
        // No prep needed
    }

    async exec(_prepRes: void): Promise<void> {
        // No exec needed
    }

    async post(shared: TBCActivityStorage, _prepRes: void, _execRes: void): Promise<string | undefined> {
        shared.collection = 'mem';
        return "default";
    }
}