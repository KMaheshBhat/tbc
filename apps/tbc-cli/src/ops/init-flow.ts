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
        const n = shared.registry.createNode.bind(shared.registry);

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

        // Branching node to decide flow based on validation, upgrade flag, and companion/prime flags
        const branchNode = new Node();
        branchNode.post = async (shared: Record<string, any>) => {
            const isValidTBCRoot = shared.isValidTBCRoot;
            const upgrade = this.config.upgrade || false;
            const companion = this.config.companion;
            const prime = this.config.prime;

            if (companion && prime && !upgrade && !isValidTBCRoot) {
                return 'init';
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

        // Abort flow nodes
        const abortNode = new Node();
        abortNode.exec = async () => {
            console.error('TBC companion already exists at this location. Use --upgrade to upgrade existing companion.');
            process.exit(1);
        };

        const init = new Node();
        const upgrade = new Node();
        const resultLog = new Node();

        // Wire the flow
        this.startNode
            .next(n('tbc-core:validate', {
                verbose: this.config.verbose,
            }))
            .next(branchNode);

        branchNode
            .on('init', init)
            .on('upgrade', upgrade)
            .on('abort', abortNode);

        init
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
            .next(resultLog)

        upgrade
            .next(n('tbc-core:backup-tbc'))
            .next(n('tbc-core:init'))
            .next(n('tbc-core:copy-assets'))
            .next(n('tbc-core:restore-root'))
            .next(n('tbc-core:generate-root'))
            .next(n('tbc-core:restore-extensions'))
            .next(n('tbc-core:validate', {
                verbose: this.config.verbose,
            }))
            .next(resultLog)

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