import assert from 'assert';

import {
    HAMINode,
    HAMINodeConfigValidateResult,
    validateAgainstSchema,
    ValidationSchema,
} from '@hami-frameworx/core';

import { Shared } from '../types.js';

type Config = {
    verbose: boolean;
};

const ConfigSchema: ValidationSchema = {
    type: 'object',
    properties: {
        verbose: { type: 'boolean' },
    },
    required: ['verbose'],
};

export class PrepareMessagesNodeNx extends HAMINode<Shared, Config> {
    config: Config;

    kind(): string {
        return 'tbc-system:prepare-messages:nx';
    }

    constructor(config: Config) {
        super(config);
        this.config = config;
    }

    validateConfig(config: Config): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, ConfigSchema);
        return {
            valid: result.isValid,
            errors: result.errors || [],
        };
    }

    async prep(_shared: Shared): Promise<void> {
        assert(this.config, `${this.kind()} must be configured.`);
    }

    async post(shared: Shared, _input: void, _output: void): Promise<string> {
        shared.stage.verbose = this.config?.verbose ?? shared.stage.verbose ?? false;
        shared.stage.messages = shared.stage.messages || [];
        shared.stage.allMessages = shared.stage.allMessages || [];
        return 'default';
    }
}
