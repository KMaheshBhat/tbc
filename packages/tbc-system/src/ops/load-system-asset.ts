import { HAMINode } from '@hami-frameworx/core';

import { generateAssetsManifest } from '../assets-manifest.js' with { type: 'macro' };
import { Shared } from '../types.js';

const ASSETS = await generateAssetsManifest();

type NodeInput = {
    sysCollection: string;
    skillsCollection: string;
};

type NodeOutput = Record<string, Record<string, string>>;

export class LoadSystemAssetsNode extends HAMINode<Shared> {
    kind(): string {
        return 'tbc-system:load-system-assets';
    }

    async prep(shared: Shared): Promise<NodeInput> {
        return {
            sysCollection: shared.system.protocol?.sys.collection || shared.stage.sysCollection || 'sys',
            skillsCollection: shared.system.protocol?.skills.collection || shared.stage.skillsCollection || 'skills',
        }
    }

    async exec(input: NodeInput): Promise<NodeOutput> {
        const { sysCollection, skillsCollection } = input;
        const result: NodeOutput = {};

        const mappings = [
            { folder: 'templates', collection: 'templates' },
            { folder: 'sys/core', collection: `${sysCollection}/core` },
            { folder: 'sys/ext', collection: `${sysCollection}/ext` },
            { folder: 'skills/core', collection: `${skillsCollection}/core` },
            { folder: 'skills/ext', collection: `${skillsCollection}/ext` },
        ];

        // Get all relative paths from our "baked-in" manifest
        const assetPaths = Object.keys(ASSETS);
        for (const { folder: directory, collection } of mappings) {
            const directoryRecords: Record<string, string> = {};

            for (const path of assetPaths) {
                // Check if file is inside the target directory
                if (path.startsWith(directory + '/')) {
                    // Strip the directory prefix to get the relative ID
                    // e.g., "skills/core/tbc-act-ops/SKILL.md" -> "tbc-act-ops/SKILL.md"
                    const id = path.substring(directory.length + 1);
                    directoryRecords[id] = ASSETS[path];
                } else if (path === directory && !path.includes('/')) {
                    // Handle cases like 'templates' if it's a flat folder with no sub-nesting
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
