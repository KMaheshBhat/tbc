import { HAMINode } from '@hami-frameworx/core';

import { Shared } from '../types.js';

import { generateAssetsManifest } from '../assets-manifest.js' with { type: 'macro' };

const ASSETS = await generateAssetsManifest();

type NodeInput = {
    assetsBase: string;
};

type NodeOutput = Record<string, Record<string, string>>;

export class LoadAssetsNode extends HAMINode<Shared> {
    kind(): string {
        return 'tbc-pi:load-assets';
    }

    async exec(input: NodeInput): Promise<NodeOutput> {
        const result: NodeOutput = {};

        const mappings = [
            { folder: 'templates', collection: 'templates' },
        ];

        const assetPaths = Object.keys(ASSETS);
        for (const { folder: directory, collection } of mappings) {
            const directoryRecords: Record<string, string> = {};

            for (const path of assetPaths) {
                if (path.startsWith(directory + '/')) {
                    const id = path.substring(directory.length + 1);
                    directoryRecords[id] = ASSETS[path];
                } else if (path === directory && !path.includes('/')) {
                    directoryRecords[path] = ASSETS[path];
                }
            }

            if (Object.keys(directoryRecords).length > 0) {
                result[collection] = directoryRecords;
            }
        }
        return result;
    }

    async post(
        shared: Shared,
        _input: NodeInput,
        output: NodeOutput,
    ): Promise<string | undefined> {
        shared.stage.records = shared.stage.records || {};

        for (const [collection, records] of Object.entries(output)) {
            shared.stage.records[collection] = {
                ...(shared.stage.records[collection] || {}),
                ...records,
            };
        }

        return 'default';
    }
}