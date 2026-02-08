import assert from "assert";
import { Node } from "pocketflow";

import { HAMIFlow, HAMINode, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from "@hami-frameworx/core";

import { Shared } from "../types";

interface FlowConfig {
    verbose: boolean;
    rootDirectory?: string;
}

const FlowConfigSchema: ValidationSchema = {
    type: "object",
    properties: {
        verbose: { type: "boolean" },
        rootDirectory: { type: "string" },
    },
};

class ActShowFlowStartNode extends HAMINode<Shared, FlowConfig> {
    kind(): string {
        return "tbc-activity:act-show-flow-start";
    }

    async post(shared: Shared): Promise<string> {
        shared.stage = shared.stage || {};
        shared.system = shared.system || {};
        shared.stage.verbose = shared.stage.verbose || this.config?.verbose;
        shared.stage.rootDirectory = shared.stage.rootDirectory || this.config?.rootDirectory;
        return "default";
    }
}


export class IntGenericFlow extends HAMIFlow<Shared, FlowConfig> {
    startNode: Node;
    config: FlowConfig;

    constructor(config: FlowConfig) {
        const startNode = new ActShowFlowStartNode(config);
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return "tbc-interface:int-generic-flow";
    }

    async prep(shared: Record<string, any>): Promise<void> {
        assert(shared.registry, 'registry is required');
        const n = shared.registry.createNode.bind(shared.registry);
        const abortSequence = new Node().next(n('core:mutate', { /* ... */ })).next(n('tbc-system:log-and-clear-messages'));
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
                    console.log('=== int-generic-flow === ');
                    console.log(s.stage.roleDefinition);
                    console.log('===');
                }
            }))
            // TODO stuff
            .next(n('tbc-system:log-and-clear-messages'))
            ;
        /*
        this.startNode
            .next(n('tbc-system:resolve'))
            .next(n('tbc-system:validate', {
                verbose: this.config.verbose,
            }))
            .next(n('core:assign', {
                'record.rootDirectory': 'rootDirectory',
                'record.collection': 'fetchCollection',
                'record.IDs': 'IDs',
            }))
            .next(n('tbc-record:fetch-records-flow', {
                recordProviders: ['tbc-record-fs:fetch-records'],
                verbose: this.config.verbose,
            }))
            .next(n('tbc-memory:extract-companion-id'))
            .next(n('core:assign', {
                'record.rootDirectory': 'rootDirectory',
                'record.collection': 'collection',
                'record.IDs': 'IDs',
            }))
            .next(n('tbc-record:fetch-records-flow', {
                recordProviders: ['tbc-record-fs:fetch-records'],
                verbose: this.config.verbose,
            }))
            .next(n('tbc-memory:extract-companion-name'))
            .next(n('tbc-system:generate-role-definition'))
            .next(n('tbc-interface:generate-generic-core'))
            .next(n('core:assign', {
                'record.rootDirectory': 'rootDirectory',
                'record.collection': 'storeCollection',
                'record.records': 'records',
            }))
            .next(n('tbc-record:store-records-flow', {
                recordProviders: ['tbc-record-fs:store-records'],
                verbose: this.config.verbose,
            }))
            ;
        */
    }

    validateConfig(config: FlowConfig): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, FlowConfigSchema);
        return { valid: result.isValid, errors: result.errors || [] };
    }

    async run(shared: Shared): Promise<string | undefined> {
        shared.stage = shared.stage || {};
        shared.stage.verbose = shared.verbose || this.config?.verbose;
        shared.stage.rootDirectory = shared.rootDirectory || this.config?.rootDirectory;
        return super.run(shared);
    }
}