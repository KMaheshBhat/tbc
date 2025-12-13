import assert from "assert";
import { Node } from "pocketflow";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { access } from "node:fs/promises";

import { HAMIFlow, HAMINodeConfigValidateResult, HAMIRegistrationManager, validateAgainstSchema, ValidationSchema } from "@hami-frameworx/core";

interface InitFlowConfig {
    root?: string;
    verbose: boolean;
    upgrade?: boolean;
    companion?: string;
    prime?: string;
}

const InitFlowConfigSchema: ValidationSchema = {
    type: "object",
    properties: {
        root: { type: "string" },
        verbose: { type: "boolean" },
        upgrade: { type: "boolean" },
        companion: { type: "string" },
        prime: { type: "string" },
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

        // Set companion and prime names in shared state
        if (this.config.companion) {
            shared.companion = this.config.companion;
        }
        if (this.config.prime) {
            shared.prime = this.config.prime;
        }

        // Set count for UUID generation if creating new companion
        if (this.config.companion && this.config.prime) {
            shared.count = 3;
        }

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
        shared.count = 3; // For UUID generation

        // Create nodes
        const validate = shared['registry'].createNode('tbc-core:validate', {
            verbose: this.config.verbose,
        });

        // Branching node to decide flow based on validation, upgrade flag, and companion/prime flags
        const branchNode = new Node();
        branchNode.post = async (shared: Record<string, any>) => {
            const isValidTBCRoot = shared.isValidTBCRoot;
            const upgrade = this.config.upgrade || false;
            const companion = this.config.companion;
            const prime = this.config.prime;

            if (companion && prime && !upgrade && !isValidTBCRoot) {
                return 'enhanced';
            } else if (isValidTBCRoot && upgrade) {
                // Check for required id files during upgrade
                const tbcDir = join(shared.rootDirectory, 'tbc');
                try {
                    await access(join(tbcDir, 'companion.id'));
                    await access(join(tbcDir, 'prime.id'));
                    return 'upgrade';
                } catch {
                    console.error('Error: companion.id and prime.id files are required for upgrade. Please ensure they exist in the tbc/ directory.');
                    process.exit(1);
                }
            } else if (isValidTBCRoot && !upgrade) {
                return 'abort';
            } else if (!companion && !prime && !upgrade) {
                return 'abort'; // Require either enhanced init or upgrade
            } else {
                return 'normal'; // Fallback, though should not reach here
            }
        };

        // New companion init flow nodes
        const generateUuids = shared['registry'].createNode('tbc-generator:uuid');
        const generateInitRecords = shared['registry'].createNode('tbc-core:generate-init-records');
        const storeVaultRecords = shared['registry'].createNode('tbc-record-fs:store-records');
        const writeIds = shared['registry'].createNode('tbc-core:write-ids');

        // Separate nodes for new companion flow to avoid conflicts
        const initNew = shared['registry'].createNode('tbc-core:init');
        const copyAssetsNew = shared['registry'].createNode('tbc-core:copy-assets');
        const generateRootNew = shared['registry'].createNode('tbc-core:generate-root', {
            companion: this.config.companion,
            prime: this.config.prime,
        });
        const storeRootRecord = shared['registry'].createNode('tbc-record-fs:store-records');
        const validateNew = shared['registry'].createNode('tbc-core:validate', {
            verbose: this.config.verbose,
        });

        // New companion flow continuation

        // Normal init flow nodes
        const init = shared['registry'].createNode('tbc-core:init');
        const copyAssets = shared['registry'].createNode('tbc-core:copy-assets');
        const generateRoot = shared['registry'].createNode('tbc-core:generate-root');
        const validateFinal = shared['registry'].createNode('tbc-core:validate', {
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
        const restoreRoot = shared['registry'].createNode('tbc-core:restore-root');

        // Separate nodes for upgrade flow to avoid conflicts
        const initUpgrade = shared['registry'].createNode('tbc-core:init');
        const copyAssetsUpgrade = shared['registry'].createNode('tbc-core:copy-assets');
        const generateRootUpgrade = shared['registry'].createNode('tbc-core:generate-root');
        const validateUpgrade = shared['registry'].createNode('tbc-core:validate', {
            verbose: this.config.verbose,
        });

        // Common logging nodes
        const finalizeAndLogNode = new Node();
        const logUuidResults = logTableNode(shared['registry'], 'generatedIds');
        const logGenerateInitRecordsResults = logTableNode(shared['registry'], 'generateInitRecordsResults');
        const logWriteIdsResults = logTableNode(shared['registry'], 'writeIdsResults');
        const logInitResults = logTableNode(shared['registry'], 'initResults');
        const logCopyAssetsResults = logTableNode(shared['registry'], 'copyAssetResults');
        const logGenerateRootResults = logTableNode(shared['registry'], 'generateRootResults');
        const logValidationResults = logTableNode(shared['registry'], 'messages');

        // Wire the flow
        this.startNode
            .next(validate)
            .next(branchNode);

        branchNode
            .on('enhanced', generateUuids)
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
            .next(restoreRoot)
            .next(generateRootUpgrade)
            .next(restoreExtensions)
            .next(validateUpgrade)
            .next(finalizeAndLogNode)

        generateUuids
            .next(generateInitRecords)
            .next(initNew)
            .next(storeVaultRecords)
            .next(writeIds)
            .next(copyAssetsNew)
            .next(generateRootNew)
            .next(storeRootRecord)
            .next(validateNew)
            .next(finalizeAndLogNode)

        // common logging sequence
        finalizeAndLogNode
            .next(logUuidResults)
            .next(logGenerateInitRecordsResults)
            .next(logWriteIdsResults)
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