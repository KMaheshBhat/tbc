import { HAMINode } from "@hami-frameworx/core";

import { TBCGeneratorStorage } from "../types.js";

export class TsidNode extends HAMINode<TBCGeneratorStorage> {
    kind(): string {
        return "tbc-generator:tsid";
    }

    async prep(shared: TBCGeneratorStorage): Promise<number> {
        return shared.count || 1;
    }

    async exec(prepRes: number): Promise<string[]> {
        const count = prepRes;
        const ids: string[] = [];
        for (let i = 0; i < count; i++) {
            const now = new Date();
            const year = now.getUTCFullYear();
            const month = String(now.getUTCMonth() + 1).padStart(2, '0');
            const day = String(now.getUTCDate()).padStart(2, '0');
            const hours = String(now.getUTCHours()).padStart(2, '0');
            const minutes = String(now.getUTCMinutes()).padStart(2, '0');
            const seconds = String(now.getUTCSeconds()).padStart(2, '0');
            ids.push(`${year}${month}${day}${hours}${minutes}${seconds}`);
            if (i < count - 1) {
                // Pause for 1 second between generations
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        return ids;
    }

    async post(shared: TBCGeneratorStorage, _prepRes: number, execRes: string[]): Promise<string | undefined> {
        shared.generatedIds = execRes;
        return "default";
    }
}