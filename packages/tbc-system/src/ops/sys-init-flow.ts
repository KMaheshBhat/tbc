import assert from "assert";
import { Node } from "pocketflow";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { access } from "node:fs/promises";

import { HAMIFlow, HAMINodeConfigValidateResult, HAMIRegistrationManager, validateAgainstSchema, ValidationSchema } from "@hami-frameworx/core";

interface InitFlowConfig {
    root?: string;
    verbose: boolean;
    companion: string;
    prime: string;
}

const InitFlowConfigSchema: ValidationSchema = {
    type: "object",
    properties: {
        root: { type: "string" },
        verbose: { type: "boolean" },
        companion: { type: "string" },
        prime: { type: "string" },
    },
    required: ["verbose", "companion", "prime"],
};

export class SysInitFlow extends HAMIFlow<Record<string, any>, InitFlowConfig> {
    startNode: Node;
    config: InitFlowConfig;

    constructor(config: InitFlowConfig) {
        const startNode = new Node();
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return "tbc-cli:sys-init-flow";
    }

    async run(shared: Record<string, any>): Promise<string | undefined> {
        assert(shared.registry, 'registry is required');
        const n = shared.registry.createNode.bind(shared.registry);

        // Set options in shared state
        shared.opts = { verbose: this.config.verbose };

        // Set companion and prime names in shared state
        shared.companion = this.config.companion;
        shared.prime = this.config.prime;

        // Set count for UUID generation
        shared.count = 3;

        // Determine root directory
        const rootDir = this.config.root || process.cwd();
        shared.rootDirectory = rootDir;

        // Determine assets path (relative to tbc-system package)
        // Works in both development (source) and production (installed) environments
        const currentFile = fileURLToPath(import.meta.url);
        const currentDir = dirname(currentFile);
        const packageDir = resolve(currentDir, '../..'); // Always package root

        shared.assetsPath = join(packageDir, 'assets');
        shared.count = 3; // For UUID generation

        const resultLog = new Node();

        // Wire the flow
        this.startNode
            .next(n('tbc-system:validate', {
                verbose: this.config.verbose,
            }))
            .next(n('tbc-generator:uuid'))
            .next(n('tbc-system:generate-init-records'))
            .next(n('tbc-system:init'))
            .next(n('tbc-record-fs:store-records'))
            .next(n('tbc-system:generate-init-ids'))
            .next(n('tbc-record-fs:store-records'))
            .next(n('tbc-system:copy-assets'))
            .next(n('tbc-system:generate-root', {
                companion: this.config.companion,
                prime: this.config.prime,
            }))
            .next(n('tbc-record-fs:store-records'))
            .next(n('tbc-system:validate', {
                verbose: this.config.verbose,
            }))
            .next(resultLog);

        resultLog
            .next(logTableNode(shared['registry'], 'generatedIds'))
            .next(logTableNode(shared['registry'], 'generateInitRecordsResults'))
            .next(logTableNode(shared['registry'], 'generateInitIdsResults'))
            .next(logTableNode(shared['registry'], 'initResults'))
            .next(logTableNode(shared['registry'], 'copyAssetResults'))
            .next(logTableNode(shared['registry'], 'generateRootResults'))
            .next(logTableNode(shared['registry'], 'messages'));

        return super.run(shared);
    }

    validateConfig(config: InitFlowConfig): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, InitFlowConfigSchema)
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
}