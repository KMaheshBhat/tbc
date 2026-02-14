import assert from "assert";
import { Node } from "pocketflow";

import { HAMIFlow, HAMINode, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from "@hami-frameworx/core";

import { Shared } from "../types";

interface FlowConfig {
    verbose: boolean;
    rootDirectory?: string;
    agentType: string;
}

const FlowConfigSchema: ValidationSchema = {
    type: "object",
    properties: {
        verbose: { type: "boolean" },
        rootDirectory: { type: "string" },
        agentType: { type: "string" },
    },
    required: ['agentType'],
};

class AgentIntegrateFlowStartNode extends HAMINode<Shared, FlowConfig> {
    kind(): string {
        return "tbc-interface:agent-integrate-flow-start";
    }

    async post(shared: Shared): Promise<string> {
        shared.stage = shared.stage || {};
        shared.system = shared.system || {};
        shared.stage.verbose = shared.stage.verbose || this.config?.verbose;
        shared.stage.rootDirectory = shared.stage.rootDirectory || this.config?.rootDirectory;
        shared.stage.agentType = shared.stage.agentType || this.config?.agentType;
        const targetType = shared.stage.agentType || "generic";
        const protocol = AGENT_PROTOCOLS[targetType];
        assert(protocol, `Protocol Error: No registered protocol for record type [${targetType}]`);
        shared.stage.activeProtocol = protocol;
        shared.stage.rootCollection = '.';
        return "default";
    }
}

const AGENT_PROTOCOLS: Record<string, {
    assetProvider: string,
    synthesisProvider: string,
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
};

export class AgentIntegrateFlow extends HAMIFlow<Shared, FlowConfig> {
    startNode: Node;
    config: FlowConfig;

    constructor(config: FlowConfig) {
        const startNode = new AgentIntegrateFlowStartNode(config);
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return "tbc-interface:agent-integrate-flow";
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
                        message: `has no existing companion (not a valid TBC Root)`,
                        suggestion: 'Use "tbc sys init" instead.',
                    });
                }
            }))
            .next(n('tbc-system:log-and-clear-messages'));
        const branchToAbort = n('core:branch', { branch: (s: Shared) => s.stage.validationResult?.success ? 'default' : 'abort' });
        branchToAbort.on('abort', abortSequence);

        this.startNode
            .next(n('tbc-system:prepare-messages'))
            .next(n('tbc-system:resolve-root-directory'))
            .next(n('tbc-system:validate-flow', { verbose: this.config?.verbose }))
            .next(branchToAbort)
            .next(n('tbc-system:load-system-assets'))
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    s.stage.synthesizeRequests = [{
                        type: 'role-definition',
                        provider: 'tbc-system:synthesize-value',
                    }];
                }
            }))
            .next(n('tbc-synthesize:synthesize-value-flow', {
                requestsKey: 'synthesizeRequests',
                valueTargetKey: 'roleDefinition',
            }))
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    s.stage.records = undefined;
                }
            }))
            .next(n(AGENT_PROTOCOLS[shared.stage.agentType].assetProvider))
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    s.stage.synthesizeRequests = [{
                        type: s.stage.agentType,
                        provider: s.stage.activeProtocol.synthesisProvider,
                    }];
                }
            }))
            .next(n('tbc-synthesize:synthesize-record-flow', {
                requestsKey: 'synthesizeRequests'
            }))
            .next(n('tbc-write:write-records-flow', {
                verbose: this.config?.verbose,
                recordStorers: ['tbc-record-fs:store-records'],
                sourcePath: 'record.records',
                collection: 'rootCollection',
                syncIndex: false
            }))
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    shared.stage.messages.push({
                        level: 'raw',
                        message: ' ┌┼───────────────────────────────────────────────────────────',
                    });
                    s.stage.messages.push({
                        level: 'raw',
                        message: `[✓] Integration files created for Agent Type: ${s.stage.agentType}`,
                    });
                    shared.stage.messages.push({
                        level: 'raw',
                        message: ' └┼───────────────────────────────────────────────────────────',
                    });
                    shared.stage.messages.push({
                        level: 'info',
                        source: 'agent-integrate-flow',
                        message: `Agent integration done.`,
                        suggestion: `Highly recommended that the Prime User restarts the interface session for agent integration to take effect.`,
                    });
                }
            }))
            .next(n('tbc-system:log-and-clear-messages'))
            ;
    }

    validateConfig(config: FlowConfig): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, FlowConfigSchema);
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