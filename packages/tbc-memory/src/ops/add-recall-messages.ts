import assert from 'node:assert';

import { HAMINode, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from '@hami-frameworx/core';

import { Shared } from '../types';

interface NodeConfig {
    title?: string;
    source?: string;
}

const NodeConfigSchema: ValidationSchema = {
    type: 'object',
    properties: {
        title: { type: 'string' },
        source: { type: 'string' },
    },
};

export class AddRecallMessagesNode extends HAMINode<Shared, NodeConfig> {
    kind(): string {
        return 'tbc-memory:add-recall-messages';
    }

    async post(shared: Shared): Promise<string> {
        const title = this.config?.title || 'Recalled Memories';
        const source = this.config?.source || 'recall-flow';
        const records = shared.view?.records || [];

        if (records.length === 0) {
            return 'default';
        }

        // Header
        shared.stage.messages.push(
            { level: 'info', kind: 'raw', message: '' },
            { level: 'info', kind: 'raw', message: `┌┤ ${title} ├────────────────────────────────────────` },
        );

        // Record Rows
        records.forEach(rec => {
            const typeLabel = (rec.type || 'memory').padEnd(10);
            const displayTitle = rec.title || rec.id;
            shared.stage.messages.push({
                level: 'info',
                kind: 'raw',
                message: `[✓] ${rec.id} : [${typeLabel}] ${displayTitle}`,
            });
        });

        // Footer
        shared.stage.messages.push(
            { level: 'info', kind: 'raw', message: '└───────────────────────────────────────────────────────────' },
        );

        return 'default';
    }

    validateConfig(config: NodeConfig): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, NodeConfigSchema);
        return { valid: result.isValid, errors: result.errors || [] };
    }
}
