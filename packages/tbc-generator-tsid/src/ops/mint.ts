import { HAMINode } from "@hami-frameworx/core";
import { Minted, MintRequest } from '@tbc-frameworx/tbc-generator';

import { Shared } from "../types.js";

function generateTsid(): string {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    const hours = String(now.getUTCHours()).padStart(2, '0');
    const minutes = String(now.getUTCMinutes()).padStart(2, '0');
    const seconds = String(now.getUTCSeconds()).padStart(2, '0');
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

export class MintTsidNode extends HAMINode<Shared> {
    kind(): string {
        return "tbc-generator-tsid:mint";
    }

    async prep(shared: Shared): Promise<MintRequest> {
        return shared.stage.mintRequest;
    }

    async exec(request: MintRequest): Promise<Minted> {
        const result: Minted = {
            keys: {},
            batch: [],
        };
        if (request.key) {
            result.keys[request.key] = generateTsid();
        }
        if (request.count) {
            for (let i = 0; i < request.count; i++) {
                result.batch.push(generateTsid());
                if (i < request.count - 1) {
                    // Pause for 1 second between generations
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }
        return result;
    }

    async post(
        shared: Shared,
        _request: MintRequest,
        result: Minted,
    ): Promise<string> {
        if (!shared.stage.minted) {
            shared.stage.minted = { keys: {}, batch: [] };
        }
        shared.stage.minted = result;
        return "default";
    }
}