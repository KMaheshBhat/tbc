import assert from 'node:assert';

import { Node } from 'pocketflow';

import { HAMIFlow, HAMINode, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from '@hami-frameworx/core';

import packageJson from '../../package.json' with { type: 'json' };
import { Shared } from '../types.js';

interface Config {
    rootDirectory?: string;
    verbose: boolean;
}

const ConfigSchema: ValidationSchema = {
    type: 'object',
    properties: {
        root: { type: 'string' },
        verbose: { type: 'boolean' },
    },
    required: ['verbose'],
};

class DexRebuildStartNode extends HAMINode<Shared, Config> {
    kind(): string {
        return 'tbc-system:dex-rebuild-flow-start';
    }

    async post(shared: Shared, prepRes: unknown, execRes: unknown): Promise<string> {
        shared.stage = shared.stage || {};
        shared.stage.verbose = this.config?.verbose;
        shared.stage.rootDirectory = shared.rootDirectory || this.config?.rootDirectory;
        shared.system = shared.system || {};
        return 'default';
    }
}

class DexRebuildInnerFlow extends HAMIFlow<Shared, Config> {
    startNode: Node;
    config: Config;

    constructor(config: Config) {
        const startNode = new Node();
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return 'tbc-system:dex-rebuild-inner-flow';
    }

    validateConfig(config: Config): HAMINodeConfigValidateResult {
        return { valid: true, errors: [] };
    }

    async prep(shared: Shared): Promise<void> {
        assert(shared.registry, 'registry is required');
        const n = shared.registry.createNode.bind(shared.registry);
        const protocol = shared.system.protocol;

        const dexCollection = protocol?.dex?.collection || 'dex';
        const memCollection = protocol?.mem?.collection || 'mem';

        const collections = ['sys', 'skills', 'mem', 'dex', 'act'] as const;
        let currentNode: Node = this.startNode;

        for (const col of collections) {
            const colConfig = protocol[col];
            const rebuildProviders = colConfig?.on?.rebuild;

            if (!rebuildProviders || rebuildProviders.length === 0) {
                continue;
            }

            for (const provider of rebuildProviders) {
                const node = n(provider.id, {
                    ...provider.config,
                    collection: memCollection,
                    dexCollection,
                    verbose: this.config?.verbose,
                }) as Node;
                currentNode = currentNode.next(node);

                const mutateNode = n('core:mutate', {
                    mutate: (s: Shared) => {
                        s.stage.messages.push({
                            level: 'info',
                            source: 'dex-rebuild-flow',
                            message: `Completed ${col} rebuild via ${provider.id}`,
                        });
                    },
                }) as Node;
                currentNode = currentNode.next(mutateNode);

                const logNode = n('tbc-system:log-and-clear-messages') as Node;
                currentNode = currentNode.next(logNode);
            }
        }
    }

    async run(shared: Shared): Promise<string | undefined> {
        shared.stage = shared.stage || {};
        shared.stage.verbose = this.config?.verbose;
        shared.stage.rootDirectory = shared.stage.rootDirectory || shared.rootDirectory || this.config?.rootDirectory;
        return super.run(shared);
    }
}

export class DexRebuildFlow extends HAMIFlow<Shared, Config> {
    startNode: Node;
    config: Config;

    constructor(config: Config) {
        const startNode = new DexRebuildStartNode(config);
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return 'tbc-system:dex-rebuild-flow';
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

        const abortSequence = new Node();
        abortSequence
            .next(n('core:mutate', {
                mutate: (shared: Record<string, any>) => {
                    shared.stage.messages.push({
                        level: 'error',
                        code: 'OVERWRITE-GUARD',
                        source: 'dex-rebuild-flow',
                        message: 'has no existing companion (not a valid TBC Root)',
                        suggestion: 'Can only be run on a valid TBC Root. (Use "tbc sys init" for new Companion).',
                    });
                },
            }))
            .next(n('tbc-system:log-and-clear-messages'));
        const branchToAbort = n('core:branch', {
            branch: (shared: Record<string, any>) => {
                if (!shared.stage.validationResult.success) {
                    return 'abort';
                }
                return 'default';
            },
        });
        branchToAbort.on('abort', abortSequence);

        const innerFlow = new DexRebuildInnerFlow(this.config);

        const finalLogNode = n('core:mutate', {
            mutate: (shared: Shared) => {
                shared.stage.messages.push({
                    level: 'info',
                    kind: 'raw',
                    message: ' ┌┼───────────────────────────────────────────────────────────',
                });
                shared.stage.messages.push({
                    level: 'info',
                    kind: 'raw',
                    message: `[✓] System Index (Dex) Rebuilt: ${packageJson.version}`,
                });
                shared.stage.messages.push({
                    level: 'info',
                    kind: 'raw',
                    message: ' └┼───────────────────────────────────────────────────────────',
                });
                shared.stage.messages.push({
                    level: 'info',
                    source: 'dex-rebuild-flow',
                    message: `Digest: ${shared.stage.dexCollection}/sys.digest.txt`,
                    suggestion: 'This file now contains the full context of your [sys], [sys/core], and [sys/ext] specifications.',
                });
                shared.stage.messages.push({
                    level: 'info',
                    source: 'dex-rebuild-flow',
                    message: `Digest: ${shared.stage.dexCollection}/skills.jsonl`,
                    suggestion: 'This file is index of all skill you can use for your goals.',
                });
                shared.stage.messages.push({
                    level: 'info',
                    source: 'dex-rebuild-flow',
                    message: `Digest: ${shared.stage.dexCollection}/${shared.stage.memCollection}.*.jsonl`,
                    suggestion: 'These files is index of all your memory records partitioined by record_type.',
                });
            },
        });

        this.startNode
            .next(n('tbc-system:prepare-messages', {
                verbose: this.config?.verbose,
            }))
            .next(n('tbc-system:log-and-clear-messages'))
            .next(n('core:mutate', {
                mutate: (shared: Record<string, any>) => {
                    shared.stage.messages.push({
                        level: 'info',
                        source: 'dex-rebuild-flow',
                        message: 'Checking first ...',
                    });
                },
            }))
            .next(n('tbc-system:validate-flow', {
                verbose: this.config?.verbose,
                rootDirectory: this.config?.rootDirectory,
                resolve: {
                    resolveRootDirectory: true,
                    resolveProtocol: true,
                    resolveCollections: true,
                },
            }))
            .next(branchToAbort)
            .next(n('core:mutate', {
                mutate: (shared: Shared) => {
                    shared.stage.messages.push({
                        level: 'info',
                        source: 'dex-rebuild-flow',
                        message: 'existing valid TBC root found, proceeding ...',
                    });
                },
            }))
            .next(n('core:mutate', {
                mutate: (shared: Shared) => {
                    shared.stage.messages.push({
                        level: 'info',
                        source: 'dex-rebuild-flow',
                        message: 'Rebuilding DEX...',
                    });
                },
            }))
            .next(n('tbc-system:log-and-clear-messages'))
            .next(innerFlow)
            .next(finalLogNode)
            .next(n('tbc-system:log-and-clear-messages'));
    }

    async run(shared: Shared): Promise<string | undefined> {
        shared.stage = shared.stage || {};
        shared.stage.verbose = this.config?.verbose;
        shared.stage.rootDirectory = shared.stage.rootDirectory || shared.rootDirectory || this.config?.rootDirectory;
        return super.run(shared);
    }
}