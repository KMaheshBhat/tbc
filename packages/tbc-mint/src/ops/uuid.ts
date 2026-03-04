import { uuidv7 } from 'uuidv7';

import { HAMINode } from '@hami-frameworx/core';

import { 
    Minted,
    MintRequest,
    Shared,
} from '../types.js';

export class MintUUIDNode extends HAMINode<Shared> {
    kind(): string {
        return 'tbc-mint:uuid-mint';
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
            result.keys[request.key] = uuidv7();
            // Sleep to avoid collision with batch generation
            await new Promise(resolve => setTimeout(resolve, 1));
        }
        if (request.count) {
            for (let i = 0; i < request.count; i++) {
                result.batch.push(uuidv7());
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
        return 'default';
    }
}