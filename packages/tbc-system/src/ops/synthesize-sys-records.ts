import { HAMINode } from '@hami-frameworx/core';

import { Shared } from '../types.js';

type NodeInput = {
    records: Record<string, any>;
    companionID: string;
    companionName: string;
    primeID: string;
    primeName: string;
    memoryMapID: string;
    sysCollection: string;
    skillsCollection: string;
    memCollection: string;
    dexCollection: string;
    actCollection: string;
};

export class SynthesizeSysRecordsNode extends HAMINode<Shared> {
    kind(): string {
        return 'tbc-system:synthesize-sys-records';
    }

    async prep(shared: Shared): Promise<NodeInput> {
        return {
            records: shared.stage.records || {},
            companionID: shared.stage.minted.keys.companionID,
            companionName: shared.stage.companionName,
            primeID: shared.stage.minted.keys.primeID,
            primeName: shared.stage.primeName,
            memoryMapID: shared.stage.minted.keys.memoryMapID,
            sysCollection: shared.stage.sysCollection,
            skillsCollection: shared.stage.skillsCollection,
            memCollection: shared.stage.memCollection,
            dexCollection: shared.stage.dexCollection,
            actCollection: shared.stage.actCollection,
        };
    }

    async exec(input: NodeInput) {
        const {
            records,
            companionID,
            companionName,
            primeID,
            primeName,
            memoryMapID,
            sysCollection,
            skillsCollection,
            memCollection,
            dexCollection,
            actCollection,
        } = input;
        const sys = records.sys || {};
        const templates = records.templates || {};
        const result: Record<string, any> = {};
        const toLowerKebabCase = (str: string) => str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

        // 1. Create the .id pointers (raw content)
        result['companion.id'] = {
            id: 'companion.id',
            content: companionID,
            contentType: 'raw',
        };
        result['prime.id'] = {
            id: 'prime.id',
            content: primeID,
            contentType: 'raw',
        };

        // 2. Hydrate root.md template
        // We assume root.md was loaded into the 'sys' collection from assets
        const rootTemplate = templates['root.md'] || '';
        if (rootTemplate) {
            const companionTag = `c/agent/${toLowerKebabCase(companionName)}`;
            let hydratedRoot = rootTemplate
                .replace(/{{companionName}}/g, companionName)
                .replace(/{{companionID}}/g, companionID)
                .replace(/{{primeName}}/g, primeName)
                .replace(/{{primeID}}/g, primeID)
                .replace(/{{memoryMapID}}/g, memoryMapID);

            result['root.md'] = {
                ...sys['root.md'],
                id: 'root',
                record_type: 'root',
                record_tags: [companionTag],
                title: `${companionName} Root`,
                companion: `/${memCollection}/${companionID}.md`,
                prime: `/${memCollection}/${primeID}.md`,
                system_path: `/${sysCollection}/core/`,
                extension_path: `/${sysCollection}/ext/`,
                skills_path: `/${skillsCollection}/core/`,
                skills_extension_path: `/${skillsCollection}/ext/`,
                memory_path: `/${memCollection}/`,
                view_path: `/${dexCollection}/`,
                activity_path: `/${actCollection}/`,
                memory_map: `/${memCollection}/${memoryMapID}.md`,
                content: hydratedRoot,
                contentType: 'markdown',
            };
        }

        return result;
    }

    async post(shared: Shared, _input: NodeInput, output: any) {
        shared.stage.records = shared.stage.records || {};
        const sysCollection = shared.system.protocol.sys.collection || shared.stage.sysCollection || 'sys';
        shared.stage.records[sysCollection] = output;
        return 'default';
    }
}
