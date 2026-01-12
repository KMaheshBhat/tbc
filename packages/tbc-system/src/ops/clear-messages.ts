import { HAMINode, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from "@hami-frameworx/core";

import { Shared, TBCMessage } from "../types.js";

type Config = {
    verbose: boolean;
}

const ValidateNodeConfigSchema: ValidationSchema = {
    type: "object",
    properties: {
        verbose: { type: 'boolean' },
    },
    required: ['verbose'],
};

export class ClearMessagesNode extends HAMINode<Shared, Config> {
    kind(): string {
        return "tbc-system:clear-messages";
    }

    validateConfig(config: Config): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, ValidateNodeConfigSchema)
        return {
            valid: result.isValid,
            errors: result.errors || [],
        };
    }

    async prep(shared: Shared): Promise<TBCMessage[]> {
        return shared.stage.messages || [];
    }

    async exec(messages: TBCMessage[]): Promise<TBCMessage[]> {
        return messages;
    }

    async post(shared: Shared, _input: void, messages: TBCMessage[]): Promise<string> {
        shared.stage.messages = [];
        shared.stage.allMessages = shared.stage.allMessages || [];
        shared.stage.allMessages.push(...messages);
        return "default";
    }
}