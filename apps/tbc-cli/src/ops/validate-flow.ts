import assert from "assert";
import { existsSync } from "fs";
import { Node } from "pocketflow";

import { HAMIFlow, HAMINode, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from "@hami-frameworx/core";
import { join } from "path";

interface ValidateFlowConfig {
    verbose: boolean;
}

const ValidateFlowConfigSchema: ValidationSchema = {
    type: "object",
    properties: {
        verbose: { type: "boolean" },
    },
    required: ["verbose"],
};

export class ValidateFlow extends HAMIFlow<Record<string, any>, ValidateFlowConfig> {
    startNode: Node;
    config: ValidateFlowConfig;

    constructor(config: ValidateFlowConfig) {
        const startNode = new Node();
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return "tbc-cli:validate-flow";
    }

    async run(shared: Record<string, any>): Promise<string | undefined> {
        assert(shared.registry, 'registry is required');

        const validate = new ValidateNode({
            strategy: 'CWD',
            verbose: this.config.verbose,
        });
        const logMessages = shared['registry'].createNode('core:log-result', {
            resultKey: 'messages',
            format: 'table',
        });
        this.startNode
            .next(validate)
            .next(logMessages)
            ;

        return super.run(shared);
    }

    validateConfig(config: ValidateFlowConfig): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, ValidateFlowConfigSchema)
        return {
            valid: result.isValid,
            errors: result.errors || [],
        };
    }
}

type ValidateNodeConfig = {
    strategy?: string,
    verbose: boolean;
}

const ValidateNodeConfigSchema: ValidationSchema = {
    type: "object",
    properties: {
        strategy: {
            type: 'string',
            enum: ['CWD'],
        },
        verbose: {
            type: 'boolean',
        },
    },
    required: ['verbose'],
};

type ValidateNodeInput = {
    targetWorkingDirectory?: string,
    verbose: boolean;
};

type ValidateNodeOutput = {
    isValidTBCRoot: boolean;
    messages: string[];
};

type ValidateNodeSharedStorage = {
    strategy?: string,
    verbose: boolean;
    targetWorkingDirectory?: string,
    isValidTBCRoot?: boolean;
    messages?: string[];
}

class ValidateNode extends HAMINode<ValidateNodeSharedStorage, ValidateNodeConfig> {
    constructor(config?: ValidateNodeConfig, maxRetries?: number, wait?: number) {
        super(config, maxRetries, wait);
    }

    kind(): string {
        return "tbc-cli:validate";
    }

    validateConfig(config: ValidateNodeConfig): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, ValidateNodeConfigSchema)
        return {
            valid: result.isValid,
            errors: result.errors || [],
        };
    }

    async prep(
        shared: ValidateNodeSharedStorage,
    ): Promise<ValidateNodeInput> {
        let workingDir;
        let strategy = this.config?.strategy || shared.strategy;
        switch (strategy) {
            case 'CWD':
                workingDir = process.cwd();
                break;
            default:
                throw new Error(`Unsupported validation strategy: ${strategy}`);
        }
        assert(workingDir, 'could not resolve working directory');
        return {
            targetWorkingDirectory: workingDir,
            verbose: this.config?.verbose || shared.verbose,
        };
    }

    async exec(
        params: ValidateNodeInput,
    ): Promise<ValidateNodeOutput> {

        const workingDir = params.targetWorkingDirectory!;
        const verbose = params.verbose;

        const messages: string[] = []; // collect messages if needed
        let message;

        verbose && console.log(`Inspecting directory: ${workingDir}`);

        const tbcDir = join(workingDir, 'tbc');
        const tbcExists = existsSync(tbcDir);
        message = `tbc/ directory: ${tbcExists ? '✓ Found' : '✗ Missing'}`;
        messages.push(message);
        verbose && console.log(message);

        const vaultDir = join(workingDir, 'vault');
        const vaultExists = existsSync(vaultDir);
        message = `vault/ directory: ${vaultExists ? '✓ Found' : '✗ Missing'}`;
        messages.push(message);
        verbose && console.log(message);

        const dexDir = join(workingDir, 'dex');
        const dexExists = existsSync(dexDir);
        message = `dex/ directory: ${dexExists ? '✓ Found' : '○ Optional (will be created if missing)'}`;
        messages.push(message);
        verbose && console.log(message);

        const isValidTBCRoot = tbcExists && vaultExists;
        if (isValidTBCRoot) {
            message = '✅ This appears to be a valid TBC root directory.';
            messages.push(message);
            verbose && console.log(message);
        } else {
            message = '❌ This does not appear to be a valid TBC root directory.';
            messages.push(message);
            verbose && console.log(message);
        }

        verbose && console.log('For more information, see: https://github.com/KMaheshBhat/tbc');
        return {
            isValidTBCRoot,
            messages,
        };
    }

    async post(
        shared: ValidateNodeSharedStorage,
        _prepRes: ValidateNodeInput,
        execRes: ValidateNodeOutput,
    ): Promise<string | undefined> {
        shared.isValidTBCRoot = execRes.isValidTBCRoot;
        shared.messages = execRes.messages;
        return "default";
    }
}