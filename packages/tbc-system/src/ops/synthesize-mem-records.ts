import { HAMINode } from '@hami-frameworx/core';

import { Shared } from '../types.js';

type NodeInput = {
    companionName: string;
    primeName: string;
    companionID: string;
    primeID: string;
    memoryMapID: string;
};

type NodeOutput = Record<string, any>;

export class SynthesizeMemRecordsNode extends HAMINode<Shared> {
    kind(): string {
        return 'tbc-system:synthesize-mem-records';
    }

    async prep(shared: Shared): Promise<NodeInput> {
        const minted = shared.stage.minted?.keys || {};
        return {
            companionName: shared.stage.companionName,
            primeName: shared.stage.primeName,
            companionID: minted.companionID,
            primeID: minted.primeID,
            memoryMapID: minted.memoryMapID,
        };
    }

    async exec(input: NodeInput): Promise<NodeOutput> {
        const { companionName, primeName, companionID, primeID, memoryMapID } = input;
        const result: NodeOutput = {};
        const timestamp = new Date().toISOString().replace('T', ' ').split('.')[0] + ' UTC';
        const toLowerKebabCase = (str: string) => str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

        // 1. Companion Record
        const companionTag = `c/agent/${toLowerKebabCase(companionName)}`;
        result[`${companionID}.md`] = {
            id: companionID,
            record_type: 'party',
            record_tags: [companionTag],
            record_create_date: timestamp,
            record_title: companionName,
            party_type: 'agent',
            contentType: 'markdown',
            content: `# ${companionName}\n\n${companionName} is the AI Assistant in the Third Brain Companion System, instantiated to assist Prime User ${primeName}. As an agent, ${companionName} engages in interactions, evolves motivations to align with the Prime User's, and operates within the Record System for memory persistence.`,
        };

        // 2. Prime User Record
        result[`${primeID}.md`] = {
            id: primeID,
            record_type: 'party',
            record_tags: [companionTag],
            record_create_date: timestamp,
            record_title: primeName,
            party_type: 'person',
            contentType: 'markdown',
            content: `# ${primeName}\n\n${primeName} is the Prime User of the Third Brain Companion System, the primary human actor initiating and guiding ${companionName}. As the owner of the system, they directs motivations, confirms identities, and delegates memory persistence when needed.`,
        };

        // 3. Memory Map Record
        result[`${memoryMapID}.md`] = {
            id: memoryMapID,
            record_type: 'structure',
            record_tags: [companionTag],
            title: 'Map of Memories',
            contentType: 'markdown',
            content: `# Map of Memories\n\nThese are memories of the Companion - ${companionName}.  The Companion Agent to list the other records here - any type, with any number of sections.`,
        };

        return result;
    }

    async post(shared: Shared, _input: NodeInput, output: NodeOutput): Promise<string | undefined> {
        shared.stage.records = shared.stage.records || {};
        const memCollection = shared.system.protocol.mem.collection || shared.stage.memCollection || 'mem';
        shared.stage.records[memCollection] = output;
        return 'default';
    }
}
