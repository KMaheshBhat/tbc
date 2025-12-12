import { uuidv7 } from 'uuidv7';

import { HAMINode } from "@hami-frameworx/core";

import { TBCGeneratorStorage } from "../types.js";

export class UuidNode extends HAMINode<TBCGeneratorStorage> {
    kind(): string {
        return "tbc-generator:uuid";
    }

    async prep(shared: TBCGeneratorStorage): Promise<number> {
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

    async post(shared: TBCGeneratorStorage, _prepRes: number, execRes: string[]): Promise<string | undefined> {
        shared.generatedIds = execRes;
        return "default";
    }
}