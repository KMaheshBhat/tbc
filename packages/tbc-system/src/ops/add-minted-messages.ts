import assert from 'node:assert';

import { HAMINode, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from '@hami-frameworx/core';
import { Minted } from '@tbc-frameworx/tbc-mint';

import { Shared, TBCLevel, TBCMessage } from '../types.js';

type Config = {
    source: string;
    level: TBCLevel;
};

const ValidateNodeConfigSchema: ValidationSchema = {
    type: 'object',
    properties: {
        level: { type: 'string', enum: ['debug', 'info', 'warn', 'error'], default: 'info' },
        source: { type: 'string' },
    },
    required: ['source'],
};

export class AddMintedMessagesNode extends HAMINode<Shared, Config> {
    kind(): string {
        return 'tbc-system:add-minted-messages';
    }

    validateConfig(config: Config): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, ValidateNodeConfigSchema);
        return {
            valid: result.isValid,
            errors: result.errors || [],
        };
    }

    async prep(shared: Shared): Promise<Minted> {
        return shared.stage.minted || {};
    }

    async exec(minted: Minted): Promise<[TBCMessage[], TBCMessage[]]> {
        assert(this.config, 'the add-minted-messages must be configured');
        const kMessages: TBCMessage[] = [];
        const bMessages: TBCMessage[] = [];
        for (const [k, v] of Object.entries(minted.keys || {})) {
            kMessages.push({
                level: this.config.level,
                source: this.config.source,
                code: 'KEY-MINTED-IDS',
                message: `${k}: ${v}`,
            });
        }
        for (const id of minted.batch || []) {
            bMessages.push({
                level: this.config.level,
                source: this.config.source,
                code: 'MINTED-BATCH',
                message: `${id}`,
            });
        }
        return [kMessages, bMessages];
    }

    async post(
        shared: Shared,
        _input: void,
        [kMessages, bMessages]: [TBCMessage[], TBCMessage[]],
    ): Promise<string> {
        shared.stage.messages = shared.stage.messages || [];
        shared.stage.messages.push({
            level: 'info',
            kind: 'raw',
            message: ' ┌┤ Minted IDs ├──────────────────────────────────────────────',
        });
        kMessages.length > 0 && shared.stage.messages.push({
            level: 'info',
            kind: 'raw',
            message: ' ├┤ Keyed ├───────────────────────────────────────────────────',
        });
        shared.stage.messages.push(...kMessages);
        bMessages.length > 0 && shared.stage.messages.push({
            level: 'info',
            kind: 'raw',
            message: ' ├┤ Batch ├───────────────────────────────────────────────────',
        });
        shared.stage.messages.push(...bMessages);
        shared.stage.messages.push({
            level: 'info',
            kind: 'raw',
            message: ' └┼───────────────────────────────────────────────────────────',
        });
        return 'default';
    }
}
