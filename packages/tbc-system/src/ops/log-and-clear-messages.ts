import { HAMINode, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from '@hami-frameworx/core';

import { Shared, TBCMessage, TBC_LEVEL_ICON_MAP } from '../types.js';

export function composeMessages(messages: TBCMessage[], verbose: boolean): string {
    const lines: string[] = [];
    messages.forEach(m => {
        lines.push(...composeMessage(m, verbose));
    });
    return lines.join('\n');
}

export function composeMessage(m: TBCMessage, verbose: boolean): string[] {
    const lines: string[] = [];
    if (!verbose && m.level === 'debug') {
        return lines;
    }
    if (m.level === 'raw') {
        lines.push(m.message);
        return lines;
    }
    const icon = TBC_LEVEL_ICON_MAP[m.level];
    const connector = ('suggestion' in m && m.suggestion) ? '┬─' : '──';
    lines.push(`[${icon}] ${connector} ${m.level.padEnd(5)} | ${m.source} | ${m.message}`);
    if ('suggestion' in m && m.suggestion) {
        lines.push(`    └─ Suggestion: ${m.suggestion}`);
    }
    return lines;
}


type Config = {
    verbose: boolean;
};

const ValidateNodeConfigSchema: ValidationSchema = {
    type: 'object',
    properties: {
        verbose: {
            type: 'boolean',
            default: false,
        },
    },
    required: ['verbose'],
};

export class LogAndClearMessagesNode extends HAMINode<Shared, Config> {
    kind(): string {
        return 'tbc-system:log-and-clear-messages';
    }

    validateConfig(config: Config): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, ValidateNodeConfigSchema);
        return {
            valid: result.isValid,
            errors: result.errors || [],
        };
    }

    async prep(shared: Shared): Promise<TBCMessage[]> {
        this.config = this.config || { verbose: false };
        this.config.verbose = shared.stage.verbose || false;
        return shared.stage.messages || [];
    }

    async exec(messages: TBCMessage[]): Promise<TBCMessage[]> {
        console.log(composeMessages(messages, this.config?.verbose || false));
        return messages;
    }

    async post(shared: Shared, _input: void, messages: TBCMessage[]): Promise<string> {
        shared.stage.messages = [];
        shared.stage.allMessages = shared.stage.allMessages || [];
        shared.stage.allMessages.push(...messages);
        return 'default';
    }
}
