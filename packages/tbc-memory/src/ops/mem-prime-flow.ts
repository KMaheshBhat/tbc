import assert from "assert";
import { Node } from "pocketflow";

import { HAMIFlow, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from "@hami-frameworx/core";

interface MemPrimeFlowConfig {
    verbose: boolean;
    show: 'id' | 'name' | 'full';
}

const MemPrimeFlowConfigSchema: ValidationSchema = {
    type: "object",
    properties: {
        verbose: { type: "boolean" },
        show: { type: "string", enum: ["id", "name", "full"] },
    },
    required: ["verbose", "show"],
};

export class MemPrimeFlow extends HAMIFlow<Record<string, any>, MemPrimeFlowConfig> {
    startNode: Node;
    config: MemPrimeFlowConfig;

    constructor(config: MemPrimeFlowConfig) {
        const startNode = new Node();
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return "tbc-memory:mem-prime-flow";
    }

    async prep(shared: Record<string, any>): Promise<void> {
        assert(shared.registry, 'registry is required');
        const n = shared.registry.createNode.bind(shared.registry);
        let flow = this.startNode
            .next(n('tbc-system:resolve'))
            .next(n('core:assign', {
                'record.rootDirectory': 'rootDirectory',
                'record.collection': 'collection',
                'record.IDs': 'IDs',
            }))
            .next(n('tbc-record:fetch-records-flow', {
                recordProviders: ['tbc-record-fs:fetch-records'],
                verbose: this.config.verbose,
            }))
            .next(n('tbc-memory:extract-prime-id'));
        if (this.config.show === 'name' || this.config.show === 'full') {
            flow = flow
                .next(n('core:assign', {
                    'record.rootDirectory': 'rootDirectory',
                    'record.collection': 'collection',
                    'record.IDs': 'IDs',
                }))
                .next(n('tbc-record:fetch-records-flow', {
                    recordProviders: ['tbc-record-fs:fetch-records'],
                    verbose: this.config.verbose,
                }))
                .next(n('tbc-memory:extract-prime-name'));
        }
        if (this.config.show === 'full') {
            flow = flow
                .next(n('tbc-memory:extract-prime-record'));
        }
        const resultKey = this.config.show === 'id' ? 'primeId' :
            this.config.show === 'name' ? 'primeName' : 'primeRecord';
        const format = this.config.show === 'full' ? 'table' : 'text';
        const prefix = this.config.show === 'id' ? 'Prime ID:' :
            this.config.show === 'name' ? 'Prime Name:' : 'Prime Record:';
        flow.next(n('core:log-result', {
            resultKey,
            format,
            prefix,
            verbose: this.config.verbose
        }));

    }

    async run(shared: Record<string, any>): Promise<string | undefined> {
        shared.opts = {
            verbose: this.config.verbose,
            show: this.config.show,
        };
        shared.collection = 'sys';
        shared.IDs = ['prime.id'];
        return super.run(shared);
    }

    validateConfig(config: MemPrimeFlowConfig): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, MemPrimeFlowConfigSchema)
        return {
            valid: result.isValid,
            errors: result.errors || [],
        };
    }
}