import assert from "assert";
import { existsSync } from "fs";

import { HAMINode, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from "@hami-frameworx/core";
import { join } from "path";

import { TBCCoreStorage } from "../types.js";

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

export class ValidateNode extends HAMINode<TBCCoreStorage, ValidateNodeConfig> {
    constructor(config?: ValidateNodeConfig, maxRetries?: number, wait?: number) {
        super(config, maxRetries, wait);
    }

    kind(): string {
        return "tbc-system:validate";
    }

    validateConfig(config: ValidateNodeConfig): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, ValidateNodeConfigSchema)
        return {
            valid: result.isValid,
            errors: result.errors || [],
        };
    }

    async prep(
        shared: TBCCoreStorage,
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

        const sysDir = join(workingDir, 'sys');
        const sysExists = existsSync(sysDir);
        message = `sys/ directory: ${sysExists ? '✓ Found' : '✗ Missing'}`;
        messages.push(message);
        verbose && console.log(message);

        const sysCoreDir = join(sysDir, 'core');
        const sysCoreExists = existsSync(sysCoreDir);
        message = `sys/core/ directory: ${sysCoreExists ? '✓ Found' : '✗ Missing'}`;
        messages.push(message);
        verbose && console.log(message);

        const sysExtDir = join(sysDir, 'ext');
        const sysExtExists = existsSync(sysExtDir);
        message = `sys/ext/ directory: ${sysExtExists ? 'Found (optional)' : 'Optional (will be created if missing)'}`;
        messages.push(message);
        verbose && console.log(message);

        const memDir = join(workingDir, 'mem');
        const memExists = existsSync(memDir);
        message = `mem/ directory: ${memExists ? '✓ Found' : '✗ Missing'}`;
        messages.push(message);
        verbose && console.log(message);

        const dexDir = join(workingDir, 'dex');
        const dexExists = existsSync(dexDir);
        message = `dex/ directory: ${dexExists ? 'Found (optional)' : 'Optional (will be created if missing)'}`;
        messages.push(message);
        verbose && console.log(message);

        // Check for root record
        const rootFile = join(sysDir, 'root.md');
        const rootExists = existsSync(rootFile);
        message = `sys/root.md: ${rootExists ? '✓ Found' : '✗ Missing'}`;
        messages.push(message);
        verbose && console.log(message);

        // Check for ID files (created during enhanced init)
        const companionIdFile = join(sysDir, 'companion.id');
        const companionIdExists = existsSync(companionIdFile);
        message = `sys/companion.id: ${companionIdExists ? '✓ Found' : 'Not found (basic init used)'}`;
        messages.push(message);
        verbose && console.log(message);

        const primeIdFile = join(sysDir, 'prime.id');
        const primeIdExists = existsSync(primeIdFile);
        message = `sys/prime.id: ${primeIdExists ? '✓ Found' : 'Not found (basic init used)'}`;
        messages.push(message);
        verbose && console.log(message);

        const gitDir = join(workingDir, '.git');
        const gitExists = existsSync(gitDir);
        message = `.git/ directory: ${gitExists ? '✓ Found' : 'Not found'}`;
        messages.push(message);
        verbose && console.log(message);

        const isValidTBCRoot = sysExists && sysCoreExists && memExists && rootExists;
        if (isValidTBCRoot) {
            message = '✓ This appears to be a valid TBC root directory.';
            messages.push(message);
            verbose && console.log(message);
        } else {
            message = '✕ This does not appear to be a valid TBC root directory.';
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
        shared: TBCCoreStorage,
        _prepRes: ValidateNodeInput,
        execRes: ValidateNodeOutput,
    ): Promise<string | undefined> {
        shared.isValidTBCRoot = execRes.isValidTBCRoot;
        shared.isGitRepository = execRes.isGitRepository;
        shared.messages = execRes.messages;
        return "default";
    }
}