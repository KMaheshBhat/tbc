import { HAMINode } from '@hami-frameworx/core';

import { Shared } from '../types.js';

type NodeInput = {
    records: Record<string, any>;
};

type NodeOutput = Record<string, string[]>;

export class PrepareRecordsManifestNode extends HAMINode<Shared> {
    kind(): string {
        return 'tbc-system:prepare-records-manifest';
    }

    async prep(shared: Shared): Promise<NodeInput> {
        return {
            records: shared.stage?.records || {},
        };
    }

    async exec(input: NodeInput): Promise<NodeOutput> {
        const manifest: NodeOutput = {};

        for (const [collection, entries] of Object.entries(input.records)) {
            manifest[collection] = Object.keys(entries as Record<string, any>);
        }

        return manifest;
    }

    async post(
        shared: Shared,
        _input: NodeInput,
        output: NodeOutput,
    ): Promise<string | undefined> {
        shared.stage = shared.stage || {};
        shared.stage.manifest = output;
        return 'default';
    }
}
