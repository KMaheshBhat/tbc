import assert from "assert";
import { existsSync } from "fs";
import { Node } from "pocketflow";

import { HAMINode, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from "@hami-frameworx/core";
import { join } from "path";

import { TBCFSStorage } from "../types.js";

type ValidateNodeConfig = {
    verbose: boolean;
}

const ValidateNodeConfigSchema: ValidationSchema = {
    type: "object",
    properties: {
        verbose: {
            type: 'boolean',
        },
    },
    required: ['verbose'],
};

type ValidateNodeInput = {
    targetWorkingDirectory: string,
    verbose: boolean;
};

type ValidateNodeOutput = {
    isValidTBCRoot: boolean;
    isGitRepository: boolean;
    messages: string[];
};

export class ValidateNode extends HAMINode<TBCFSStorage, ValidateNodeConfig> {
    constructor(config?: ValidateNodeConfig, maxRetries?: number, wait?: number) {
        super(config, maxRetries, wait);
    }

    kind(): string {
        return "tbc-fs:validate";
    }

    validateConfig(config: ValidateNodeConfig): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, ValidateNodeConfigSchema)
        return {
            valid: result.isValid,
            errors: result.errors || [],
        };
    }

    async prep(
        shared: TBCFSStorage,
    ): Promise<ValidateNodeInput> {
        assert(shared.rootDirectory, 'rootDirectory is required');
        return {
            targetWorkingDirectory: shared.rootDirectory,
            verbose: this.config?.verbose || shared.opts?.verbose || false,
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
        message = `dex/ directory: ${dexExists ? 'Found (optional)' : 'Optional (will be created if missing)'}`;
        messages.push(message);
        verbose && console.log(message);

        const gitDir = join(workingDir, '.git');
        const gitExists = existsSync(gitDir);
        message = `.git/ directory: ${gitExists ? '✓ Found' : 'Not found'}`;
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
            isGitRepository: gitExists,
            messages,
        };
    }

    async post(
        shared: TBCFSStorage,
        _prepRes: ValidateNodeInput,
        execRes: ValidateNodeOutput,
    ): Promise<string | undefined> {
        shared.isValidTBCRoot = execRes.isValidTBCRoot;
        shared.isGitRepository = execRes.isGitRepository;
        shared.messages = execRes.messages;
        return "default";
    }
}