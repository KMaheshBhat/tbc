import assert from "assert";
import { Node } from "pocketflow";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { HAMIFlow, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from "@hami-frameworx/core";

interface InitFlowConfig {
    root?: string;
    verbose: boolean;
}

const InitFlowConfigSchema: ValidationSchema = {
    type: "object",
    properties: {
        root: { type: "string" },
        verbose: { type: "boolean" },
    },
    required: ["verbose"],
};

export class InitFlow extends HAMIFlow<Record<string, any>, InitFlowConfig> {
    startNode: Node;
    config: InitFlowConfig;

    constructor(config: InitFlowConfig) {
        const startNode = new Node();
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return "tbc-cli:init-flow";
    }

    async run(shared: Record<string, any>): Promise<string | undefined> {
        assert(shared.registry, 'registry is required');

        // Set options in shared state
        shared.opts = { verbose: this.config.verbose };

        // Determine root directory
        const rootDir = this.config.root || process.cwd();
        shared.rootDirectory = rootDir;

        // Determine assets path (relative to CLI package)
        // In built CLI, assets are in the same directory as the executable
        // In development, use relative path
        const currentFile = fileURLToPath(import.meta.url);
        const cliDir = join(currentFile, '../../'); // from dist/ops/init-flow.js to cli root
        shared.assetsPath = join(cliDir, 'assets');

        const init = shared['registry'].createNode('tbc-core:init');
        const copyAssets = shared['registry'].createNode('tbc-core:copy-assets');
        const generateRoot = shared['registry'].createNode('tbc-core:generate-root');
        const validate = shared['registry'].createNode('tbc-fs:validate', {
            verbose: this.config.verbose,
        });
        const logInitResults = shared['registry'].createNode('core:log-result', {
            resultKey: 'initResults',
            format: 'table',
        });
        const logCopyAssetsResults = shared['registry'].createNode('core:log-result', {
            resultKey: 'copyAssetResults',
            format: 'table',
        });
        const logGenerateRootResults = shared['registry'].createNode('core:log-result', {
            resultKey: 'generateRootResults',
            format: 'table',
        });
        const logValidationResults = shared['registry'].createNode('core:log-result', {
            resultKey: 'messages',
            format: 'table',
        });

        this.startNode
            .next(init)
            .next(copyAssets)
            .next(generateRoot)
            .next(validate)
            .next(logInitResults)
            .next(logCopyAssetsResults)
            .next(logGenerateRootResults)
            .next(logValidationResults)
            ;

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