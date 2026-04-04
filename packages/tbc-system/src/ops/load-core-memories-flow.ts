import assert from 'node:assert';

import { Node } from 'pocketflow';

import { HAMIFlow, HAMINode, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from '@hami-frameworx/core';

import { Shared } from '../types.js';

interface Config {
    verbose?: boolean;
}

const ConfigSchema: ValidationSchema = {
    type: 'object',
    properties: {
        verbose: { type: 'boolean' },
    },
};

class LoadCoreMemoriesStartNode extends HAMINode<Shared, Config> {
    kind(): string {
        return 'tbc-system:load-core-memories-flow-start';
    }

    async post(shared: Shared): Promise<string> {
        assert(shared.system?.protocol, 'protocol must be resolved before load-core-memories-flow');
        return 'default';
    }
}

export class LoadCoreMemoriesFlow extends HAMIFlow<Shared, Config> {
    startNode: Node;
    config: Config;

    constructor(config: Config) {
        const startNode = new LoadCoreMemoriesStartNode(config);
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return 'tbc-system:load-core-memories';
    }

    async prep(shared: Shared): Promise<void> {
        assert(shared.registry, 'registry is required');
        assert(shared.system?.protocol, 'protocol must be resolved');

        const n = shared.registry.createNode.bind(shared.registry);

        // Get protocol-derived fetchers for mem collection
        const memFetchers = shared.system.protocol.mem.on?.fetch?.map(p => p.id) ?? [];

        this.startNode
            // Set mem collection
            .next(n('core:assign', {
                'record.collection': 'stage.memCollection',
            }))
            .next(n('core:assign', {
                'stage.records': 'record.result.records',
            }))
            .next(n('tbc-system:prepare-records-manifest'))
            .next(n('tbc-system:add-manifest-messages', {
                'source': 'load-core-memories-flow',
                'level': 'debug',
            }))
            // Extract IDs from root.md
            .next(n('core:mutate', {
                mutate: (shared: Record<string, any>) => {
                    shared.record.IDs = [];
                    if (!shared.stage.manifest[shared.stage.sysCollection]) {
                        return;
                    }
                    for (const id of shared.stage.manifest[shared.stage.sysCollection]) {
                        if (id === 'root.md') {
                            const rootRecord = shared.record.result.records[shared.stage.sysCollection][id];
                            shared.system.rootRecord = rootRecord;
                            const memoryPath = rootRecord['memory_path'];
                            const memoryMap = rootRecord['memory_map'];
                            const companionPath = rootRecord['companion'];
                            const primePath = rootRecord['prime'];
                            const companionID = companionPath.replace(memoryPath, '').replace(/\.md$/, '');
                            shared.system.companionID = companionID;
                            const primeID = primePath.replace(memoryPath, '').replace(/\.md$/, '');
                            shared.system.primeID = primeID;
                            const memoryMapID = memoryMap.replace(memoryPath, '').replace(/\.md$/, '');
                            shared.system.memoryMapID = memoryMapID;
                            shared.record.IDs.push(...[companionID, primeID, memoryMapID]);
                        }
                    }
                },
            }))
            // Log identification messages
            .next(n('core:mutate', {
                mutate: (shared: Record<string, any>) => {
                    shared.stage.messages.push({
                        level: 'debug',
                        source: 'load-core-memories',
                        message: `Identifying companionID (${shared.system.companionID}) and load from ${shared.record.collection}`,
                    });
                    shared.stage.messages.push({
                        level: 'debug',
                        source: 'load-core-memories',
                        message: `Identifying primeID (${shared.system.primeID}) and load from ${shared.record.collection}`,
                    });
                    shared.stage.messages.push({
                        level: 'debug',
                        source: 'load-core-memories',
                        message: `Identifying memoryMapID (${shared.system.memoryMapID}) and load from ${shared.record.collection}`,
                    });
                },
            }))
            // Fetch mem records - USE PROTOCOL-AWARE FETCHERS
            .next(n('tbc-record:fetch-records-flow', {
                recordProviders: memFetchers,
                verbose: this.config.verbose,
            }))
            // Assign companion/prime/memoryMap records
            .next(n('core:mutate', {
                mutate: (shared: Record<string, any>) => {
                    for (const [collection, entries] of Object.entries(shared.record.result.records)) {
                        shared.stage.manifest[collection] = Object.keys(entries as Record<string, any>);
                    }
                    shared.system.companionRecord = shared.record.result.records[shared.stage.memCollection][shared.system.companionID];
                    shared.system.primeRecord = shared.record.result.records[shared.stage.memCollection][shared.system.primeID];
                    shared.system.memoryMapRecord = shared.record.result.records[shared.stage.memCollection][shared.system.memoryMapID];
                    shared.system.manifest = shared.stage.manifest;
                    shared.manifest = shared.stage.manifest;
                },
            }));
    }

    validateConfig(config: Config): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, ConfigSchema);
        return { valid: result.isValid, errors: result.errors || [] };
    }
}
