import assert from 'node:assert';

import { Node } from 'pocketflow';

import { HAMIFlow, HAMINode, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from '@hami-frameworx/core';

import { Shared } from '../types.js';

interface FlowConfig {
    verbose: boolean;
}

const FlowConfigSchema: ValidationSchema = {
    type: 'object',
    properties: {
        verbose: { type: 'boolean' },
    },
    required: ['verbose'],
};

class DexRebuildSkillsStartNode extends HAMINode<Shared, FlowConfig> {
    kind(): string {
        return 'tbc-system:dex-rebuild-skills-flow-start';
    }

    async post(shared: Shared): Promise<string> {
        shared.stage = shared.stage || {};
        shared.stage.verbose = shared.stage.verbose || this.config?.verbose;
        return 'default';
    }
}

export class DexRebuildSkillsFlow extends HAMIFlow<Record<string, any>, FlowConfig> {
    startNode: Node;
    config: FlowConfig;

    constructor(config: FlowConfig) {
        const startNode = new DexRebuildSkillsStartNode(config);
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return 'tbc-system:dex-rebuild-skills-flow';
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
            .next(n('tbc-system:load-specifications-flow', {
                verbose: false,
                rootDirectory: shared.stage.rootDirectory,
            }))
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    s.stage.messages.push({
                        level: 'debug',
                        source: 'dex-rebuild-skills-flow',
                        message: 'Rebuilding skills index...',
                    });
                },
            }))
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    s.record.records = undefined;
                    s.stage.synthesizeRequests = [
                        {
                            type: 'metadata-index',
                            provider: 'tbc-system:synthesize-collation-metadata',
                            meta: {
                                sources: [
                                    { collection: `${s.stage.skillsCollection}/core`, 'idGlob': '*/SKILL.md' },
                                    { collection: `${s.stage.skillsCollection}/ext`, 'idGlob': '*/SKILL.md' },
                                ],
                                id: 'skills.jsonl',
                            },
                        },
                    ];
                },
            }))
            .next(n('tbc-synthesize:synthesize-record-flow', {
                requestsKey: 'synthesizeRequests',
            }))
            .next(n('tbc-system:write-records-flow', {
                verbose: this.config?.verbose,
                sourcePath: 'record.records',
                collection: 'dexCollection',
                protocolKey: 'dex',
            }))
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    s.stage.messages.push({
                        level: 'debug',
                        source: 'dex-rebuild-skills-flow',
                        message: 'Rebuilt skills.jsonl',
                    });
                },
            }))
            .next(n('tbc-system:log-and-clear-messages'));
    }
}
