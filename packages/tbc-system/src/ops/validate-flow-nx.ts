import assert from 'node:assert';

import { Node } from 'pocketflow';

import { HAMIFlow, HAMINode, HAMINodeConfigValidateResult, HAMIRegistrationManager, validateAgainstSchema, ValidationSchema } from '@hami-frameworx/core';

import { Shared } from '../types.js';
import { PROTOCOLS } from '../protocols.js';

interface Config {
    verbose?: boolean;
    rootDirectory?: string;
    resolveProtocol?: boolean;
}

const ConfigSchema: ValidationSchema = {
    type: 'object',
    properties: {
        verbose: { type: 'boolean' },
        rootDirectory: { type: 'string' },
        resolveProtocol: { type: 'boolean' },
    },
};

class StartNode extends HAMINode<Shared, Config> {
    constructor(config?: Config, maxRetries?: number, wait?: number) {
        super(config, maxRetries, wait);
    }

    kind(): string {
        return 'tbc-system:validate-flow-start:nx';
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
        shared.system.protocol = shared.system.protocol || PROTOCOLS['baseline'];
        const sysCollection = shared.system.protocol.sys.collection || 'sys';
        const skillsCollection = shared.system.protocol.skills.collection || 'skills';
        const memCollection = shared.system.protocol.mem.collection || 'mem';
        const dexCollection = shared.system.protocol.dex.collection || 'dex';
        const actCollection = shared.system.protocol.dex.collection || 'act';
        shared.stage.sysCollection = sysCollection;
        shared.stage.sysCoreCollection = `${sysCollection}/core`;
        shared.stage.sysExtCollection = `${sysCollection}/ext`;
        shared.stage.skillsCollection = skillsCollection;
        shared.stage.memCollection = memCollection;
        shared.stage.dexCollection = dexCollection;
        shared.stage.actCollection = actCollection;
        return 'default';
    }
}

export class ValidateFlowNx extends HAMIFlow<Record<string, any>, Config> {
    startNode: Node;
    config: Config;

    constructor(config: Config) {
        const startNode = new StartNode(config);
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return 'tbc-system:validate-flow:nx';
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
        const n = shared.registry.createNode.bind(shared.registry);
        const resolveProtocolOrSkip = this.config.resolveProtocol ?
            n('tbc-system:resolve-protocol') :
            new Node();
        this.startNode
            .next(n('tbc-system:prepare-messages'))
            .next(n('tbc-system:resolve-root-directory'))
            .next(resolveProtocolOrSkip)
            .next(n('core:mutate', {
                mutate: (shared: Shared) => {
                    const proto = shared.system.protocol;
                    shared.stage.sysCollection = proto.sys.collection;
                    shared.stage.sysCoreCollection = `${proto.sys.collection}/core`;
                    shared.stage.sysExtCollection = `${proto.sys.collection}/ext`;
                    shared.stage.skillsCollection = proto.skills.collection;
                    shared.stage.memCollection = proto.mem.collection;
                    shared.stage.dexCollection = proto.dex.collection;
                    shared.stage.actCollection = proto.act.collection;
                },
            }))
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
