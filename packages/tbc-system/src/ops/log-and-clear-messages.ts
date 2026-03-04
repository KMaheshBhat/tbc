import { HAMINode, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from '@hami-frameworx/core';

import { Shared, TBCMessage, TBC_LEVEL_ICON_MAP } from '../types.js';

function composeMessages(messages: TBCMessage[], verbose: boolean): string {
    const lines: string[] = [];
    messages.forEach(m => {
        lines.push(...composeMessage(m, verbose));
    });
    return lines.join('\n');
}

function composeMessage(m: TBCMessage, verbose: boolean): string[] {
    const lines: string[] = [];
    if (!verbose && m.level === 'debug') {
        return lines;
    }
    // Check for raw message: prefer 'kind' field
    if (m.kind === 'raw') {
        lines.push(m.message);
        return lines;
    }
    const icon = TBC_LEVEL_ICON_MAP[m.level];
    const connector = ('suggestion' in m && m.suggestion) ? '┬─' : '──';
    const level = m.level ?? 'info';
    lines.push(`[${icon}] ${connector} ${level.padEnd(5)} | ${m.source} | ${m.message}`);
    if ('suggestion' in m && m.suggestion) {
        lines.push(`    └─ Suggestion: ${m.suggestion}`);
    }
    return lines;
}


type Input = {
    messages: TBCMessage[],
    verbose: boolean,
};

export class LogAndClearMessagesNode extends HAMINode<Shared> {
    kind(): string {
        return 'tbc-system:log-and-clear-messages';
    }

    async prep(shared: Shared): Promise<Input> {
        return {
            messages: shared.stage.messages || [],
            verbose: shared.stage.verbose || false,
        };
    }

    async exec({messages, verbose}: Input): Promise<TBCMessage[]> {
        console.log(composeMessages(messages, verbose || false));
        return messages;
    }

    async post(shared: Shared, _input: void, messages: TBCMessage[]): Promise<string> {
        shared.stage.messages = [];
        shared.stage.allMessages = shared.stage.allMessages || [];
        shared.stage.allMessages.push(...messages);
        return 'default';
    }
}
