import assert from 'assert';

import { Node } from 'pocketflow';

import { HAMIFlow, HAMINode, HAMINodeConfigValidateResult, HAMIRegistrationManager, validateAgainstSchema, ValidationSchema } from '@hami-frameworx/core';

import { Shared } from '../types.js';

interface FlowConfig {
    verbose?: boolean;
    rootDirectory?: string;
}

const FlowConfigSchema: ValidationSchema = {
    type: 'object',
    properties: {
        verbose: { type: 'boolean' },
        rootDirectory: { type: 'string' },
    },
};

class SysValidateFlowStartNode extends HAMINode<Shared, FlowConfig> {
    constructor(config?: FlowConfig, maxRetries?: number, wait?: number) {
        super(config, maxRetries, wait);
    }

    kind(): string {
        return 'tbc-system:validate-flow-start';
    }

    async post(shared: Shared, prepRes: unknown, execRes: unknown): Promise<string> {
        shared.stage = shared.stage || {};
        shared.stage.verbose = this.config?.verbose;
        shared.stage.rootDirectory = shared.rootDirectory || this.config?.rootDirectory;
        shared.system = shared.system || {};
        shared.record = shared.record || {};
        shared.stage.query = {
            type: 'list-all-ids',
        };
        shared.stage.queryRecursive = {
            type: 'list-all-ids',
            recursive: true,
        };
        shared.stage.sysCollection = 'sys';
        shared.stage.sysCoreCollection = 'sys/core';
        shared.stage.sysExtCollection = 'sys/ext';
        shared.stage.skillsCollection = 'skills';
        shared.stage.dexCollection = 'dex';
        shared.stage.memCollection = 'mem';
        shared.stage.actCollection = 'act';
        return 'default';
    }
}

export class SysValidateFlow extends HAMIFlow<Record<string, any>, FlowConfig> {
    startNode: Node;
    config: FlowConfig;

    constructor(config: FlowConfig) {
        const startNode = new SysValidateFlowStartNode(config);
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return 'tbc-system:validate-flow';
    }

    validateConfig(config: FlowConfig): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, FlowConfigSchema);
        return {
            valid: result.isValid,
            errors: result.errors || [],
        };
    }

    async prep(shared: Shared): Promise<void> {
        assert(shared.registry, 'registry is required');
        const n = shared.registry.createNode.bind(shared.registry);
        this.startNode
            .next(n('tbc-system:prepare-messages'))
            .next(n('tbc-system:resolve-root-directory'))
            .next(n('core:assign', {
                'record.rootDirectory': 'system.rootDirectory',
                'record.collection': 'stage.sysCollection',
                'record.query': 'stage.query',
            }))
            .next(n('core:mutate', {
                mutate: (shared: Record<string, any>) => {
                    shared.stage.messages.push({
                        level: 'debug',
                        source: 'validate-flow',
                        message: `Query (${JSON.stringify(shared.record.query)}) and load from ${shared.record.collection}`,
                    });
                },
            }))
            .next(n('tbc-record:query-records-flow', {
                recordProviders: ['tbc-record-fs:query-records'],
                verbose: shared.stage.verbose,
            }))
            .next(n('core:assign', {
                'record.IDs': 'record.result.IDs',
            }))
            .next(n('tbc-record:fetch-records-flow', {
                recordProviders: ['tbc-record-fs:fetch-records'],
                verbose: shared.stage.verbose,
            }))
            .next(n('core:assign', {
                'record.rootDirectory': 'system.rootDirectory',
                'record.collection': 'stage.sysCoreCollection',
                'record.query': 'stage.query',
            }))
            .next(n('core:mutate', {
                mutate: (shared: Record<string, any>) => {
                    shared.stage.messages.push({
                        level: 'debug',
                        source: 'validate-flow',
                        message: `Query (${JSON.stringify(shared.record.query)}) and load from ${shared.record.collection}`,
                    });
                },
            }))
            .next(n('tbc-record:query-records-flow', {
                recordProviders: ['tbc-record-fs:query-records'],
                verbose: shared.stage.verbose,
            }))
            .next(n('core:assign', {
                'record.IDs': 'record.result.IDs',
            }))
            .next(n('tbc-record:fetch-records-flow', {
                recordProviders: ['tbc-record-fs:fetch-records'],
                verbose: shared.stage.verbose,
            }))
            .next(n('core:assign', {
                'record.rootDirectory': 'system.rootDirectory',
                'record.collection': 'stage.sysExtCollection',
                'record.query': 'stage.query',
            }))
            .next(n('core:mutate', {
                mutate: (shared: Record<string, any>) => {
                    shared.stage.messages.push({
                        level: 'debug',
                        source: 'validate-flow',
                        message: `Query (${JSON.stringify(shared.record.query)}) and load from ${shared.record.collection}`,
                    });
                },
            }))
            .next(n('tbc-record:query-records-flow', {
                recordProviders: ['tbc-record-fs:query-records'],
                verbose: shared.stage.verbose,
            }))
            .next(n('core:assign', {
                'record.IDs': 'record.result.IDs',
            }))
            .next(n('tbc-record:fetch-records-flow', {
                recordProviders: ['tbc-record-fs:fetch-records'],
                verbose: shared.stage.verbose,
            }))
            .next(n('core:assign', {
                'record.rootDirectory': 'system.rootDirectory',
                'record.collection': 'stage.skillsCollection',
                'record.query': 'stage.queryRecursive',
            }))
            .next(n('core:mutate', {
                mutate: (shared: Record<string, any>) => {
                    shared.stage.messages.push({
                        level: 'debug',
                        source: 'validate-flow',
                        message: `Query (${JSON.stringify(shared.record.query)}) and load from ${shared.record.collection}`,
                    });
                },
            }))
            .next(n('tbc-record:query-records-flow', {
                recordProviders: ['tbc-record-fs:query-records'],
                verbose: shared.stage.verbose,
            }))
            .next(n('core:assign', {
                'record.IDs': 'record.result.IDs',
            }))
            .next(n('tbc-record:fetch-records-flow', {
                recordProviders: ['tbc-record-fs:fetch-records'],
                verbose: shared.stage.verbose,
            }))
            .next(n('core:assign', {
                'record.collection': 'stage.memCollection',
            }))
            .next(n('core:assign', {
                'stage.records': 'record.result.records',
            }))
            .next(n('tbc-system:prepare-records-manifest'))
            .next(n('core:mutate', {
                mutate: (shared: Record<string, any>) => {
                    shared.record.IDs = [];
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
            .next(n('core:mutate', {
                mutate: (shared: Record<string, any>) => {
                    shared.stage.messages.push({
                        level: 'debug',
                        source: 'validate-flow',
                        message: `Identifying companionID (${shared.system.companionID}) and load from ${shared.record.collection}`,
                    });
                    shared.stage.messages.push({
                        level: 'debug',
                        source: 'validate-flow',
                        message: `Identifying primeID (${shared.system.primeID}) and load from ${shared.record.collection}`,
                    });
                    shared.stage.messages.push({
                        level: 'debug',
                        source: 'validate-flow',
                        message: `Identifying memoryMapID (${shared.system.memoryMapID}) and load from ${shared.record.collection}`,
                    });
                },
            }))
            .next(n('tbc-record:fetch-records-flow', {
                recordProviders: ['tbc-record-fs:fetch-records'],
                verbose: shared.stage.verbose,
            }))
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
            }))
            .next(n('core:mutate', {
                mutate: (shared: Record<string, any>) => {
                    shared.stage.messages.push({
                        level: 'info',
                        source: 'validate-flow',
                        message: 'Validating system',
                    });
                },
            }))
            .next(n('tbc-system:validate-system'))
            .next(n('tbc-system:log-and-clear-messages'));
    }

    async run(shared: Record<string, any>): Promise<string | undefined> {
        shared.stage = shared.stage || {};
        shared.stage.verbose = shared.verbose || this.config?.verbose;
        shared.stage.rootDirectory = shared.rootDirectory || this.config?.rootDirectory;
        return super.run(shared);
    }

}
