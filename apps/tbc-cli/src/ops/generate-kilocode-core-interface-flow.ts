import assert from "assert";
import { Node } from "pocketflow";
import { join } from "node:path";

import { HAMIFlow, HAMINodeConfigValidateResult, HAMIRegistrationManager, validateAgainstSchema, ValidationSchema } from "@hami-frameworx/core";

interface GenerateKilocodeCoreInterfaceFlowConfig {
    root?: string;
    verbose: boolean;
}

const GenerateKilocodeCoreInterfaceFlowConfigSchema: ValidationSchema = {
    type: "object",
    properties: {
        root: { type: "string" },
        verbose: { type: "boolean" },
    },
    required: ["verbose"],
};

export class GenerateKilocodeCoreInterfaceFlow extends HAMIFlow<Record<string, any>, GenerateKilocodeCoreInterfaceFlowConfig> {
    startNode: Node;
    config: GenerateKilocodeCoreInterfaceFlowConfig;

    constructor(config: GenerateKilocodeCoreInterfaceFlowConfig) {
        const startNode = new Node();
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return "tbc-cli:generate-kilocode-core-interface-flow";
    }

    async run(shared: Record<string, any>): Promise<string | undefined> {
        assert(shared.registry, 'registry is required');
        const n = shared.registry.createNode.bind(shared.registry);

        // Set options in shared state
        shared.opts = { verbose: this.config.verbose };

        // Determine root directory
        const rootDir = this.config.root || process.cwd();
        shared.rootDirectory = rootDir;

        shared.collection = 'tbc';
        shared.IDs = ['companion.id'];

        // Custom nodes
        const extractCompanionIdNode = new ExtractCompanionId();
        const extractCompanionNameNode = new Node();
        extractCompanionNameNode.post = async (shared: Record<string, any>, _prepRes: unknown, _execRes: unknown): Promise<string | undefined> => {
            const companionRecord = shared.fetchResults?.['vault']?.[shared.companionId];
            if (!companionRecord || (!companionRecord.name && !companionRecord.title)) {
                throw new Error('Companion record not found or missing name/title');
            }
            shared.companionName = companionRecord.name || companionRecord.title;
            return 'default';
        };

        const setStoreCollectionNode = new Node();
        setStoreCollectionNode.post = async (shared: Record<string, any>, _prepRes: unknown, _execRes: unknown): Promise<string | undefined> => {
            // Set for store-records
            shared.collection = '.';
            return 'default';
        };


        // Wire the flow
        this.startNode
            .next(n('tbc-core:validate', {
                verbose: this.config.verbose,
            }))
            .next(n('tbc-record-fs:fetch-records'))
            .next(extractCompanionIdNode)
            .next(n('tbc-record-fs:fetch-records'))
            .next(extractCompanionNameNode)
            .next(n('tbc-kilocode:generate-core'))
            .next(setStoreCollectionNode)
            .next(n('tbc-record-fs:store-records'))
            .next(logTableNode(shared['registry'], 'storeResults'));

        return super.run(shared);
    }

    validateConfig(config: GenerateKilocodeCoreInterfaceFlowConfig): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, GenerateKilocodeCoreInterfaceFlowConfigSchema)
        return {
            valid: result.isValid,
            errors: result.errors || [],
        };
    }
}

const logTableNode = (registry: HAMIRegistrationManager, resultKey: string) => {
    return registry.createNode('core:log-result', {
        resultKey,
        format: 'table' as const,
    });
};

class ExtractCompanionId extends Node {
    async post(shared: Record<string, any>, _prepRes: unknown, _execRes: unknown): Promise<string | undefined> {
            const companionIdFile = shared.fetchResults?.['tbc']?.['companion.id'];
            if (!companionIdFile || !companionIdFile.content) {
                throw new Error('companion.id file not found or empty');
            }
            const companionId = companionIdFile.content.trim();
            shared.companionId = companionId;
            // Set for next fetch
            shared.collection = 'vault';
            shared.IDs = [companionId];
       return 'default';
    }
}