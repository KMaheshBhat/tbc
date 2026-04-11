import assert from 'node:assert';

import { Node } from 'pocketflow';

import { HAMIFlow, HAMINode, HAMINodeConfigValidateResult, ValidationSchema, validateAgainstSchema } from '@hami-frameworx/core';

import { Shared } from '../types.js';

interface Config {
    verbose: boolean;
    rootDirectory?: string;
    agentType: string;
}

const ConfigSchema: ValidationSchema = {
    type: 'object',
    properties: {
        verbose: { type: 'boolean' },
        rootDirectory: { type: 'string' },
        agentType: { type: 'string' },
    },
    required: ['agentType'],
};

class StartNode extends HAMINode<Shared, Config> {
    kind(): string {
        return 'tbc-interface:agent-integrate-flow-start';
    }

    async post(shared: Shared): Promise<string> {
        shared.stage = shared.stage || {};
        shared.system = shared.system || {};
        shared.stage.verbose = shared.stage.verbose || this.config?.verbose;
        shared.stage.rootDirectory = shared.stage.rootDirectory || this.config?.rootDirectory;
        shared.stage.agentType = shared.stage.agentType || this.config?.agentType;
        const targetType = shared.stage.agentType || 'generic';
        const protocol = AGENT_PROTOCOLS[targetType];
        assert(protocol, `Protocol Error: No registered protocol for record type [${targetType}]`);
        shared.stage.activeProtocol = protocol;
        shared.stage.rootCollection = '.';
        return 'default';
    }
}

const AGENT_PROTOCOLS: Record<string, {
    assetProvider: string;
    synthesisProvider: string;
}> = {
    'generic': {
        assetProvider: 'tbc-interface:load-generic-assets',
        synthesisProvider: 'tbc-interface:synthesize-generic-records',
    },
    'gemini-cli': {
        assetProvider: 'tbc-gemini:load-assets',
        synthesisProvider: 'tbc-gemini:synthesize-integration-records',
    },
    'goose': {
        assetProvider: 'tbc-goose:load-assets',
        synthesisProvider: 'tbc-goose:synthesize-integration-records',
    },
    'github-copilot': {
        assetProvider: 'tbc-github-copilot:load-assets',
        synthesisProvider: 'tbc-github-copilot:synthesize-integration-records',
    },
    'kilocode': {
        assetProvider: 'tbc-kilocode:load-assets',
        synthesisProvider: 'tbc-kilocode:synthesize-integration-records',
    },
    'pi': {
        assetProvider: 'tbc-pi:load-assets',
        synthesisProvider: 'tbc-pi:synthesize-integration-records',
    },
};

export class AgentIntegrateFlow extends HAMIFlow<Shared, Config> {
    startNode: Node;
    config: Config;

    constructor(config: Config) {
        const startNode = new StartNode(config);
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return 'tbc-interface:agent-integrate-flow';
    }

    async prep(shared: Record<string, any>): Promise<void> {
        assert(shared.registry, 'registry is required');
        const n = shared.registry.createNode.bind(shared.registry);
        const abortSequence = new Node();
        abortSequence
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    s.stage.messages.push({
                        level: 'error',
                        code: 'OVERWRITE-GUARD',
                        source: 'agent-integrate-flow',
                        message: 'has no existing companion (not a valid TBC Root)',
                        suggestion: 'Use "tbc sys init" instead.',
                    });
                },
            }))
            .next(n('tbc-system:log-and-clear-messages'));
        const branchToAbort = n('core:branch', { branch: (s: Shared) => s.stage.validationResult?.success ? 'default' : 'abort' });;
        branchToAbort.on('abort', abortSequence);

        this.startNode
            .next(n('tbc-system:prepare-messages', {
                verbose: this.config?.verbose,
            }))
            .next(n('tbc-system:resolve-flow', {
                verbose: this.config?.verbose,
                rootDirectory: this.config?.rootDirectory,
                resolveRootDirectory: true,
                resolveProtocol: true,
                resolveCollections: true,
            }))
            .next(n('tbc-system:log-and-clear-messages'))
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    s.stage.messages.push({
                        level: 'info',
                        source: 'agent-integrate-flow',
                        message: 'Checking first ...',
                    });
                },
            }))
            .next(n('tbc-system:log-and-clear-messages'))
            .next(n('tbc-system:validate-flow', {
                verbose: shared.stage.verbose,
                rootDirectory: shared.stage.rootDirectory,
            }))
            .next(branchToAbort)
            .next(n('tbc-system:load-system-assets'))
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    s.stage.synthesizeRequests = [{
                        type: 'role-definition',
                        provider: 'tbc-system:synthesize-value',
                    }];
                },
            }))
            .next(n('tbc-synthesize:synthesize-value-flow', {
                requestsKey: 'synthesizeRequests',
                valueTargetKey: 'roleDefinition',
            }))
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    s.stage.records = undefined;
                },
            }))
            .next(n(AGENT_PROTOCOLS[shared.stage.agentType].assetProvider))
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    s.stage.synthesizeRequests = [{
                        type: s.stage.agentType,
                        provider: s.stage.activeProtocol.synthesisProvider,
                    }];
                },
            }))
            .next(n('tbc-synthesize:synthesize-record-flow', {
                requestsKey: 'synthesizeRequests',
            }))
            .next(n('tbc-system:write-records-flow', {
                verbose: this.config?.verbose,
                storeProviders: [{ id: 'tbc-record-fs:store-records', config: { eagerIndex: false } }],
                sourcePath: 'record.records',
                collection: 'rootCollection',
            }))
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    shared.stage.messages.push({
                        level: 'info',
                        kind: 'raw',
                        message: ' ┌┼───────────────────────────────────────────────────────────',
                    });
                    s.stage.messages.push({
                        level: 'info',
                        kind: 'raw',
                        message: `[✓] Integration files created for Agent Type: ${s.stage.agentType}`,
                    });
                    shared.stage.messages.push({
                        level: 'info',
                        kind: 'raw',
                        message: ' └┼───────────────────────────────────────────────────────────',
                    });
                    shared.stage.messages.push({
                        level: 'info',
                        source: 'agent-integrate-flow',
                        message: 'Agent integration done.',
                        suggestion: 'Highly recommended that the Prime User restarts the interface session for agent integration to take effect.',
                    });
                },
            }))
            .next(n('tbc-system:log-and-clear-messages'));
    }

    validateConfig(config: Config): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, ConfigSchema);
        return { valid: result.isValid, errors: result.errors || [] };
    }

    async run(shared: Shared): Promise<string | undefined> {
        shared.stage = shared.stage || {};
        shared.stage.verbose = shared.verbose || this.config?.verbose;
        shared.stage.rootDirectory = shared.rootDirectory || this.config?.rootDirectory;
        shared.stage.agentType = this.config?.agentType;
        return super.run(shared);
    }
}
