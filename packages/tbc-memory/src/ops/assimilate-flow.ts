import assert from 'node:assert';

import { Node } from 'pocketflow';
import { HAMIFlow, HAMINode, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from '@hami-frameworx/core';

import { Shared } from '../types';

interface Config {
    verbose?: boolean;
    rootDirectory?: string;
}

const ConfigSchema: ValidationSchema = {
    type: 'object',
    properties: {
        verbose: { type: 'boolean' },
        rootDirectory: { type: 'string' },
    },
};

class StartNode extends HAMINode<Shared, Config> {
    kind(): string {
        return 'tbc-memory:assimilate-flow-start';
    }

    async post(shared: Shared): Promise<string> {
        shared.stage = shared.stage || {};
        shared.system = shared.system || {};

        shared.stage.verbose = shared.stage.verbose || this.config?.verbose;
        shared.stage.rootDirectory = shared.stage.rootDirectory || this.config?.rootDirectory;

        return 'default';
    }
}

export class AssimilateFlow extends HAMIFlow<Shared, Config> {
    startNode: Node;

    constructor(config: Config) {
        const startNode = new StartNode(config);
        super(startNode, config);
        this.startNode = startNode;
    }

    kind(): string {
        return 'tbc-memory:assimilate-flow';
    }

    async prep(shared: Shared): Promise<void> {
        assert(shared.registry, 'registry is required');
        const n = shared.registry.createNode.bind(shared.registry);

        // --- ABORT SEQUENCE: System Guard ---
        const abortSequence = new Node();
        abortSequence
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    s.stage.messages.push({
                        level: 'error',
                        code: 'OVERWRITE-GUARD',
                        source: 'assimilate-flow',
                        message: 'has no existing companion (not a valid TBC Root)',
                        suggestion: 'Use "tbc sys init" instead.',
                    });
                },
            }))
            .next(n('tbc-system:log-and-clear-messages'));

        const branchToAbort = n('core:branch', {
            branch: (s: Shared) => s.stage.validationResult?.success ? 'default' : 'abort',
        });
        branchToAbort.on('abort', abortSequence);

        // --- MAIN ORCHESTRATION PIPELINE ---
        this.startNode
            .next(n('tbc-system:prepare-messages', {
                verbose: this.config?.verbose,
            }))
            .next(n('tbc-system:resolve-flow', {
                verbose: this.config?.verbose,
                rootDirectory: this.config?.rootDirectory,
                resolveRootDirectory: true,
                resolveProtocol: true,
                resolveCollections: true,
            }))
            .next(n('tbc-system:log-and-clear-messages'))
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    s.stage.messages.push({
                        level: 'info',
                        source: 'assimilate-flow',
                        message: 'Checking existing TBC root ...',
                    });
                },
            }))
            .next(n('tbc-system:log-and-clear-messages'))
            .next(n('tbc-system:validate-flow', {
                verbose: shared.stage.verbose,
                rootDirectory: shared.stage.rootDirectory,
            }))
            .next(branchToAbort)
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    s.stage.messages.push({
                        level: 'info',
                        source: 'assimilate-flow',
                        message: 'Starting assimilation ...',
                    });
                },
            }))
            .next(n('tbc-system:log-and-clear-messages'))

            // Step 1: Query all records from mem collection (reads from both FS and SQLite)
            .next(n('tbc-system:view-records-flow', {
                query: '',  // Empty query = list all
                deepQuery: true,
                protocolKey: 'mem',
                verbose: this.config?.verbose,
            }))

            // Step 2: Transform view.records to record.records for write
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    const records = s.view?.records || [];
                    // Transform flat view records to collection format expected by write-records-flow
                    const memCollection = s.system?.protocol?.mem?.collection || 'mem';
                    
                    s.record = s.record || {};
                    s.record.rootDirectory = s.system.rootDirectory;
                    s.record.collection = memCollection;
                    
                    // Build records in the format: { [collection]: { [id]: record } }
                    s.record.records = records.map((r: any) => ({
                        id: r.id,
                        record_type: r.type,
                        record_title: r.title,
                        content: r.content,
                        record_tags: r.tags || [],
                    }));
                    
                    s.stage.messages.push({
                        level: 'info',
                        source: 'assimilate-flow',
                        message: `Found ${records.length} record(s) to assimilate.`,
                    });
                },
            }))
            .next(n('tbc-system:log-and-clear-messages'))

            // Step 3: Write to all store providers (FS + SQLite)
            .next(n('tbc-system:write-records-flow', {
                verbose: this.config?.verbose,
                sourcePath: 'record.records',
                collection: 'memCollection',
                protocolKey: 'mem',
            }))

            // Step 4: Feedback
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    const count = s.record?.records?.length || 0;
                    const stores = s.system?.protocol?.mem?.on?.store?.map((p: any) => p.id).join(', ') || 'default';
                    s.stage.messages.push({
                        level: 'info',
                        source: 'assimilate-flow',
                        message: `Broadcast ${count} record(s) to ${stores}.`,
                    });
                },
            }))
            .next(n('tbc-system:log-and-clear-messages'));
    }

    validateConfig(config: Config): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, ConfigSchema);
        return { valid: result.isValid, errors: result.errors || [] };
    }

    async run(shared: Shared): Promise<string | undefined> {
        shared.stage = shared.stage || {};
        shared.stage.verbose = this.config?.verbose;
        shared.stage.rootDirectory = this.config?.rootDirectory;
        return super.run(shared);
    }
}