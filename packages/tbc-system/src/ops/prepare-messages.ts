import { HAMINode, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from '@hami-frameworx/core';

import { Shared } from '../types.js';

type Config = {
    verbose: boolean;
};

const ValidateNodeConfigSchema: ValidationSchema = {
    type: 'object',
    properties: {
        verbose: { type: 'boolean' },
    },
    required: ['verbose'],
};

export class PrepareMessagesNode extends HAMINode<Shared, Config> {
    kind(): string {
        return 'tbc-system:prepare-messages';
    }

    validateConfig(config: Config): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, ValidateNodeConfigSchema);
        return {
            valid: result.isValid,
            errors: result.errors || [],
        };
    }

    async post(shared: Shared, _input: void, output: void): Promise<string> {
        shared.stage.messages = shared.stage.messages || [];
        shared.stage.allMessages = shared.stage.allMessages || [];
        return 'default';
    }
}
