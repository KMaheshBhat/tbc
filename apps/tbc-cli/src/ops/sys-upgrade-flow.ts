import assert from "assert";
import { Node } from "pocketflow";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { HAMIFlow, HAMINodeConfigValidateResult, HAMIRegistrationManager, validateAgainstSchema, ValidationSchema } from "@hami-frameworx/core";

interface UpgradeFlowConfig {
    root?: string;
    verbose: boolean;
}

const UpgradeFlowConfigSchema: ValidationSchema = {
    type: "object",
    properties: {
        root: { type: "string" },
        verbose: { type: "boolean" },
    },
    required: ["verbose"],
};

export class SysUpgradeFlow extends HAMIFlow<Record<string, any>, UpgradeFlowConfig> {
    startNode: Node;
    config: UpgradeFlowConfig;

    constructor(config: UpgradeFlowConfig) {
        const startNode = new Node();
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return "tbc-cli:sys-upgrade-flow";
    }

    async run(shared: Record<string, any>): Promise<string | undefined> {
        assert(shared.registry, 'registry is required');
        const n = shared.registry.createNode.bind(shared.registry);

        // Set options in shared state
        shared.opts = { verbose: this.config.verbose };

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

        const upgrade = new Node();
        const resultLog = new Node();

        // Wire the flow
        this.startNode
            .next(n('tbc-core:validate', {
                verbose: this.config.verbose,
            }))
            .next(upgrade);

        upgrade
            .next(n('tbc-core:backup-sys'))
            .next(n('tbc-core:init'))
            .next(n('tbc-core:copy-assets'))
            .next(n('tbc-core:restore-root'))
            .next(n('tbc-core:restore-extensions'))
            .next(n('tbc-core:validate', {
                verbose: this.config.verbose,
            }))
            .next(resultLog);

        resultLog
            .next(logTableNode(shared['registry'], 'backupSysResults'))
            .next(logTableNode(shared['registry'], 'initResults'))
            .next(logTableNode(shared['registry'], 'copyAssetResults'))
            .next(logTableNode(shared['registry'], 'restoreRootResults'))
            .next(logTableNode(shared['registry'], 'restoreExtensionsResults'))
            .next(logTableNode(shared['registry'], 'messages'));

        return super.run(shared);
    }

    validateConfig(config: UpgradeFlowConfig): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, UpgradeFlowConfigSchema)
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