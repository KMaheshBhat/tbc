import assert from 'node:assert';

import { Node } from 'pocketflow';

import { HAMIFlow, validateAgainstSchema } from '@hami-frameworx/core';
import type { HAMINodeConfigValidateResult, ValidationSchema } from '@hami-frameworx/core';

interface RefreshSkillsFlowConfig {
    verbose: boolean;
}

const RefreshSkillsFlowConfigSchema: ValidationSchema = {
    type: 'object',
    properties: {
        verbose: { type: 'boolean' },
    },
    required: ['verbose'],
};

export class RefreshSkillsFlow extends HAMIFlow<Record<string, any>, RefreshSkillsFlowConfig> {
    startNode: Node;
    config: RefreshSkillsFlowConfig;

    constructor(config: RefreshSkillsFlowConfig) {
        const startNode = new Node();
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return 'tbc-dex:refresh-skills';
    }

    async prep(shared: Record<string, any>): Promise<void> {
        assert(shared.registry, 'registry is required');
        const n = shared.registry.createNode.bind(shared.registry);

        // Wire the flow
        this.startNode
            .next(n('tbc-system:resolve'))
            .next(n('tbc-dex:generate-dex-skills', {
                verbose: this.config.verbose,
            }))
            .next(n('core:assign', {
                'record.collection': 'collection',
                'record.records': 'records',
            }))
            .next(n('tbc-record:store-records-flow', {
                recordProviders: ['tbc-record-fs:store-records'],
                verbose: this.config.verbose,
            }))
            .next(n('core:log-result', {
                resultKey: 'storeResults',
                format: 'table',
            }));
    }

    async run(shared: Record<string, any>): Promise<string | undefined> {
        // Set options in shared state
        shared.opts = { verbose: this.config.verbose };

        // Determine root directory
        const rootDir = shared.root || process.cwd();
        shared.rootDirectory = rootDir;
        shared.record = {
            rootDirectory: rootDir,
        };

        // Initialize fetchResults
        shared.fetchResults = {};

        // Set collection names
        shared.skillsCollection = 'dex/skills';

        return super.run(shared);
    }

    validateConfig(config: RefreshSkillsFlowConfig): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, RefreshSkillsFlowConfigSchema);
        return {
            valid: result.isValid,
            errors: result.errors || [],
        };
    }
}