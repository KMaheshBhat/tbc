import assert from "assert";
import { HAMINode, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from '@hami-frameworx/core';
import { Shared } from "../types";

interface NodeConfig {
    title: string;
    target: 'companionRecord' | 'primeRecord';
}

const NodeConfigSchema: ValidationSchema = {
    type: "object",
    properties: {
        title: { type: "string" },
        target: { type: "string", enum: ['companionRecord', 'primeRecord'] },
    },
    required: ["title", "target"],
};

export class AddIdentityMessagesNode extends HAMINode<Shared, NodeConfig> {
    kind(): string {
        return "tbc-system:add-identity-messages";
    }

    async post(shared: Shared): Promise<string> {
        assert(this.config, 'AddIdentityMessageNode is not configured');
        const record = shared.system?.[this.config.target];

        if (!record) {
            shared.stage.messages.push({
                level: 'error',
                source: 'system-identity',
                message: `Identity data for [${this.config.target}] not found.`,
                suggestion: 'Ensure tbc-system:validate-flow has run successfully.'
            });
            return "default";
        }

        shared.stage.messages.push(
            { level: 'raw', message: `` },
            { level: 'raw', message: `┌┤ ${this.config.title} ├────────────────────────────────` },
            { level: 'raw', message: `[✓] ${record.id} : ${record.record_title || 'Unknown'}` },
            { level: 'raw', message: `└───────────────────────────────────────────────────────────` }
        );

        return "default";
    }

    validateConfig(config: NodeConfig): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, NodeConfigSchema);
        return { valid: result.isValid, errors: result.errors || [] };
    }
}