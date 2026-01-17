import { HAMINode, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from "@hami-frameworx/core";

import { Shared, TBCLevel, TBCMessage } from "../types.js";
import assert from "assert";

type Config = {
    source: string;
    level: TBCLevel;
}

const ValidateNodeConfigSchema: ValidationSchema = {
    type: "object",
    properties: {
        level: { type: 'string', enum: ['debug', 'info', 'warn', 'error', 'raw'], default: 'info' },
        source: { type: 'string' },
    },
    required: ['source'],
};

export class AddManifestMessagesNode extends HAMINode<Shared, Config> {
    kind(): string {
        return "tbc-system:add-manifest-messages";
    }

    validateConfig(config: Config): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, ValidateNodeConfigSchema)
        return {
            valid: result.isValid,
            errors: result.errors || [],
        };
    }


    async prep(shared: Shared): Promise<Record<string, string[]>> {
        return shared.stage.manifest;
    }
    
async exec(manifest: Record<string, string[]>): Promise<TBCMessage[]> {
        assert(this.config, "the add-manifest-messages must be configured");
        const messages: TBCMessage[] = [];
        const sortedEntries = Object.entries(manifest)
            .filter(([_, records]) => records.length > 0)
            .sort(([a], [b]) => a.localeCompare(b));
        for (const [collection, records] of sortedEntries) {
            const count = records.length;
            const preview = records.slice(0, 3).join(', ') + (count > 3 ? '...' : '');
            messages.push({
                level: 'raw',
                message: ` │ [${collection.padEnd(12)}] | ${count} record(s) | ${preview}`,
                code: 'MANIFEST',
                source: this.config.source,
            });
        }
        return messages;
    }

    async post(shared: Shared, _input: any, messages: TBCMessage[]): Promise<string> {
        assert(this.config, "the add-manifest-messages must be configured");
        shared.stage.messages = shared.stage.messages || [];
        shared.stage.messages.push({
            level: 'raw',
            message: ' ┌┤ Staged Records Manifest ├──────────────────────────────────',
            source: this.config.source,
            code: 'MANIFEST',
        });
        shared.stage.messages.push(...messages);
        shared.stage.messages.push({
            level: 'raw',
            message: ' └┼───────────────────────────────────────────────────────────',
            source: this.config.source,
            code: 'MANIFEST',
        });
        return "default";
    }
}