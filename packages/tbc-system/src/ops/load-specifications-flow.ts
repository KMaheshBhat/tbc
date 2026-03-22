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

class StartNode extends HAMINode<Shared, Config> {
    kind(): string {
        return 'tbc-system:load-specifications-flow-start';
    }

    async post(shared: Shared): Promise<string> {
        assert(shared.system?.protocol, 'protocol must be resolved before load-specifications-flow');

        // Initialize stage queries
        shared.stage.query = {
            type: 'list-all-ids',
        };
        shared.stage.queryRecursive = {
            type: 'list-all-ids',
            recursive: true,
        };

        return 'default';
    }
}

export class LoadSpecificationsFlow extends HAMIFlow<Shared, Config> {
    startNode: Node;
    config: Config;

    constructor(config: Config) {
        const startNode = new StartNode(config);
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return 'tbc-system:load-specifications-flow';
    }

    validateConfig(config: Config): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, ConfigSchema);
        return {
            valid: result.isValid,
            errors: result.errors || [],
        };
    }

    async prep(shared: Shared): Promise<void> {
        assert(shared.registry, 'registry is required');
        assert(shared.system?.protocol, 'protocol must be resolved');
        assert(this.config, 'flow must be configured');
        const n = shared.registry.createNode.bind(shared.registry);
        const proto = shared.system.protocol;
        const verbose = this.config.verbose ?? false;
        // Get protocol-derived providers for sys (used for sys, sysCore, sysExt)
        const sysQueriers = proto.sys.recordQueriers;
        const sysFetchers = proto.sys.recordFetchers;
        // Get protocol-derived providers for skills
        const skillsQueriers = proto.skills.recordQueriers;
        const skillsFetchers = proto.skills.recordFetchers;
        this.startNode
            .next(n('core:assign', {
                'record.rootDirectory': 'system.rootDirectory',
                'record.collection': 'stage.sysCollection',
                'record.query': 'stage.query',
            }))
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    s.stage.messages.push({
                        level: 'debug',
                        source: 'load-specifications-flow',
                        message: `Query (${JSON.stringify(s.record.query)}) and load from ${s.record.collection} using ${sysQueriers} and ${sysFetchers}`,
                    });
                },
            }))
            .next(n('tbc-record:query-records-flow', {
                recordProviders: sysQueriers,
                verbose: verbose,
            }))
            .next(n('core:assign', {
                'record.IDs': 'record.result.IDs',
            }))
            .next(n('tbc-record:fetch-records-flow', {
                recordProviders: sysFetchers,
                verbose: verbose,
            }))
            .next(n('core:assign', {
                'record.rootDirectory': 'system.rootDirectory',
                'record.collection': 'stage.sysCoreCollection',
                'record.query': 'stage.query',
            }))
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    s.stage.messages.push({
                        level: 'debug',
                        source: 'load-specifications-flow',
                        message: `Query (${JSON.stringify(s.record.query)}) and load from ${s.record.collection} using ${sysQueriers} and ${sysFetchers}`,
                    });
                },
            }))
            .next(n('tbc-record:query-records-flow', {
                recordProviders: sysQueriers,
                verbose: verbose,
            }))
            .next(n('core:assign', {
                'record.IDs': 'record.result.IDs',
            }))
            .next(n('tbc-record:fetch-records-flow', {
                recordProviders: sysFetchers,
                verbose: verbose,
            }))
            .next(n('core:assign', {
                'record.rootDirectory': 'system.rootDirectory',
                'record.collection': 'stage.sysExtCollection',
                'record.query': 'stage.query',
            }))
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    s.stage.messages.push({
                        level: 'debug',
                        source: 'load-specifications-flow',
                        message: `Query (${JSON.stringify(s.record.query)}) and load from ${s.record.collection} using ${sysQueriers} and ${sysFetchers}`,
                    });
                },
            }))
            .next(n('tbc-record:query-records-flow', {
                recordProviders: sysQueriers,
                verbose: verbose,
            }))
            .next(n('core:assign', {
                'record.IDs': 'record.result.IDs',
            }))
            .next(n('tbc-record:fetch-records-flow', {
                recordProviders: sysFetchers,
                verbose: verbose,
            }))
            .next(n('core:assign', {
                'record.rootDirectory': 'system.rootDirectory',
                'record.collection': 'stage.skillsCollection',
                'record.query': 'stage.queryRecursive',
            }))
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    s.stage.messages.push({
                        level: 'debug',
                        source: 'load-specifications-flow',
                        message: `Query (${JSON.stringify(s.record.query)}) and load from ${s.record.collection} using ${skillsQueriers} and ${skillsFetchers}`,
                    });
                },
            }))
            .next(n('tbc-record:query-records-flow', {
                recordProviders: skillsQueriers,
                verbose: verbose,
            }))
            .next(n('core:assign', {
                'record.IDs': 'record.result.IDs',
            }))
            .next(n('tbc-record:fetch-records-flow', {
                recordProviders: skillsFetchers,
                verbose: verbose,
            }))
            ;
    }
}
