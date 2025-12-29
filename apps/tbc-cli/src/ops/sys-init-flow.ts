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

        // Determine assets path (relative to CLI package)
        // Works in both development (source) and production (installed) environments
        const currentFile = fileURLToPath(import.meta.url);
        const currentDir = dirname(currentFile);
        let cliDir: string;

        // Check if we're running from an installed package (has node_modules in path)
        if (currentFile.includes('node_modules')) {
            // Production: from node_modules/.../dist/ops/ to package root
            cliDir = resolve(currentDir, '../..');
        } else {
            // Development: from apps/tbc-cli/dist/ops/ to cli root
            cliDir = resolve(currentDir, '../..');
        }

        shared.assetsPath = join(cliDir, 'assets');
        shared.count = 3; // For UUID generation

        const resultLog = new Node();

        // Wire the flow
        this.startNode
            .next(n('tbc-core:validate', {
                verbose: this.config.verbose,
            }))
            .next(n('tbc-generator:uuid'))
            .next(n('tbc-core:generate-init-records'))
            .next(n('tbc-core:init'))
            .next(n('tbc-record-fs:store-records'))
            .next(n('tbc-core:generate-init-ids'))
            .next(n('tbc-record-fs:store-records'))
            .next(n('tbc-core:copy-assets'))
            .next(n('tbc-core:generate-root', {
                companion: this.config.companion,
                prime: this.config.prime,
            }))
            .next(n('tbc-record-fs:store-records'))
            .next(n('tbc-core:validate', {
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