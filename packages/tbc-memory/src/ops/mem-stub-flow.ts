import assert from "assert";
import { Node } from "pocketflow";

import { HAMIFlow, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from "@hami-frameworx/core";

interface MemStubFlowConfig {
    verbose: boolean;
    recordType: 'party' | 'goal' | 'log' | 'note' | 'structure';
}

const MemStubFlowConfigSchema: ValidationSchema = {
    type: "object",
    properties: {
        verbose: { type: "boolean" },
        recordType: { type: "string", enum: ["party", "goal", "log", "note", "structure"] },
    },
    required: ["verbose", "recordType"],
};

export class MemStubFlow extends HAMIFlow<Record<string, any>, MemStubFlowConfig> {
    startNode: Node;
    config: MemStubFlowConfig;

    constructor(config: MemStubFlowConfig) {
        const startNode = new Node();
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return "tbc-memory:mem-stub-flow";
    }

    async prep(shared: Record<string, any>): Promise<void> {
        assert(shared.registry, 'registry is required');
        const n = shared.registry.createNode.bind(shared.registry);
        this.startNode
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
            .next(n('tbc-generator:uuid'))
            .next(n('tbc-memory:generate-stub-records'))
            .next(n('core:assign', {
                'record.rootDirectory': 'rootDirectory',
                'record.collection': 'collection',
                'record.records': 'records',
            }))
            .next(n('tbc-record:store-records-flow', {
                recordProviders: ['tbc-record-fs:store-records'],
                verbose: this.config.verbose,
            }))
            .next(n('core:log-result', {
                resultKey: 'createdRecordId',
                format: 'text' as const,
                prefix: 'Created stub record:',
                verbose: this.config.verbose
            }));
    }

    async run(shared: Record<string, any>): Promise<string | undefined> {
        shared.opts = {
            verbose: this.config.verbose,
            recordType: this.config.recordType,
        };
        shared.count = 1; // Set count for UUID generation (need 1 UUID for 1 stub record)
        shared.collection = 'sys'; // First fetch companion name from sys and mem
        shared.IDs = ['companion.id'];
        return super.run(shared);
    }

    validateConfig(config: MemStubFlowConfig): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, MemStubFlowConfigSchema)
        return {
            valid: result.isValid,
            errors: result.errors || [],
        };
    }
}