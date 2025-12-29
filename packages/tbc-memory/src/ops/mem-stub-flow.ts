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

    async run(shared: Record<string, any>): Promise<string | undefined> {
        assert(shared.registry, 'registry is required');
        const n = shared.registry.createNode.bind(shared.registry);

        // Set options in shared state
        shared.opts = { verbose: this.config.verbose, recordType: this.config.recordType };

        // Set count for UUID generation (need 1 UUID for 1 stub record)
        shared.count = 1;

        // Determine root directory
        const rootDir = shared.root || process.cwd();
        shared.rootDirectory = rootDir;

        // First fetch companion name from sys and mem
        shared.collection = 'sys';
        shared.IDs = ['companion.id'];

        // Wire the flow
        this.startNode
            .next(n('tbc-system:resolve'))
            .next(n('tbc-record-fs:fetch-records'))
            .next(n('tbc-memory:extract-companion-id'))
            .next(n('tbc-record-fs:fetch-records'))
            .next(n('tbc-memory:extract-companion-name'))
            .next(n('tbc-generator:uuid'))
            .next(n('tbc-memory:generate-stub-records'))
            .next(n('tbc-record-fs:store-records'))
            .next(n('core:log-result', {
                resultKey: 'createdRecordId',
                format: 'text' as const,
                prefix: 'Created stub record:',
                verbose: this.config.verbose
            }));

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