import assert from "assert";
import { Node } from "pocketflow";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { HAMIFlow, HAMINodeConfigValidateResult, HAMIRegistrationManager, validateAgainstSchema, ValidationSchema } from "@hami-frameworx/core";

interface InitFlowConfig {
    root?: string;
    verbose: boolean;
    upgrade?: boolean;
}

const InitFlowConfigSchema: ValidationSchema = {
    type: "object",
    properties: {
        root: { type: "string" },
        verbose: { type: "boolean" },
        upgrade: { type: "boolean" },
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
        // Works in both development (source) and production (installed) environments
        const currentFile = fileURLToPath(import.meta.url);
        let cliDir: string;

        // Check if we're running from an installed package (has node_modules in path)
        if (currentFile.includes('node_modules')) {
            // Production: from lib/node_modules/.../dist/ops/init-flow.js to package root
            cliDir = join(currentFile, '../../');
        } else {
            // Development: from apps/tbc-cli/dist/ops/init-flow.js to cli root
            cliDir = join(currentFile, '../../../');
        }

        shared.assetsPath = join(cliDir, 'assets');

        // Create nodes
        const validate = shared['registry'].createNode('tbc-fs:validate', {
            verbose: this.config.verbose,
        });

        // Branching node to decide flow based on validation and upgrade flag
        const branchNode = new Node();
        branchNode.post = async (shared: Record<string, any>) => {
            const isValidTBCRoot = shared.isValidTBCRoot;
            const upgrade = this.config.upgrade || false;

            if (isValidTBCRoot && !upgrade) {
                return 'abort';
            } else if (isValidTBCRoot && upgrade) {
                return 'upgrade';
            } else {
                return 'normal';
            }
        };

        // Normal init flow nodes
        const init = shared['registry'].createNode('tbc-core:init');
        const copyAssets = shared['registry'].createNode('tbc-core:copy-assets');
        const generateRoot = shared['registry'].createNode('tbc-core:generate-root');
        const validateFinal = shared['registry'].createNode('tbc-fs:validate', {
            verbose: this.config.verbose,
        });


        // Abort flow nodes
        const abortNode = new Node();
        abortNode.exec = async () => {
            console.error('TBC companion already exists at this location. Use --upgrade to upgrade existing companion.');
            process.exit(1);
        };

        // Upgrade flow nodes
        const backupTbc = shared['registry'].createNode('tbc-core:backup-tbc');
        const restoreExtensions = shared['registry'].createNode('tbc-core:restore-extensions');

        // Separate nodes for upgrade flow to avoid conflicts
        const initUpgrade = shared['registry'].createNode('tbc-core:init');
        const copyAssetsUpgrade = shared['registry'].createNode('tbc-core:copy-assets');
        const generateRootUpgrade = shared['registry'].createNode('tbc-core:generate-root');
        const validateUpgrade = shared['registry'].createNode('tbc-fs:validate', {
            verbose: this.config.verbose,
        });

        // Common logging nodes
        const finalizeAndLogNode = new Node();
        const logInitResults = logTableNode(shared['registry'], 'initResults');
        const logCopyAssetsResults = logTableNode(shared['registry'], 'copyAssetResults');
        const logGenerateRootResults = logTableNode(shared['registry'], 'generateRootResults');
        const logValidationResults = logTableNode(shared['registry'], 'messages');

        // Wire the flow
        this.startNode
            .next(validate)
            .next(branchNode);

        branchNode
            .on('normal', init)
            .on('upgrade', backupTbc)
            .on('abort', abortNode);

        // Normal flow continuation
        init
            .next(copyAssets)
            .next(generateRoot)
            .next(validateFinal)
            .next(finalizeAndLogNode);

        // Upgrade flow continuation
        backupTbc
            .next(initUpgrade)
            .next(copyAssetsUpgrade)
            .next(generateRootUpgrade)
            .next(restoreExtensions)
            .next(validateUpgrade)
            .next(finalizeAndLogNode)

        // common logging sequence
        finalizeAndLogNode
            .next(logInitResults)
            .next(logCopyAssetsResults)
            .next(logGenerateRootResults)
            .next(logValidationResults);

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