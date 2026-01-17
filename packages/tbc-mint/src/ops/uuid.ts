import { uuidv7 } from 'uuidv7';

import { HAMINode } from "@hami-frameworx/core";

import { Shared } from "../types.js";

export class UuidNode extends HAMINode<Shared> {
    kind(): string {
        return "tbc-mint:uuid";
    }

    async prep(shared: Shared): Promise<number> {
        return shared.count || 1;
    }

    async exec(prepRes: number): Promise<string[]> {
        const count = prepRes;
        const ids: string[] = [];
        for (let i = 0; i < count; i++) {
            ids.push(uuidv7());
        }
        return ids;
    }

    async post(shared: Shared, _prepRes: number, execRes: string[]): Promise<string | undefined> {
        shared.generatedIds = execRes;
        return "default";
    }
}