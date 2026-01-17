import assert from "assert";

import { Node } from "pocketflow";

import { HAMIFlow, HAMINode, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from '@hami-frameworx/core';

import { Shared } from "../types";
import packageJson from '../../package.json' with { type: 'json' };

interface FlowConfig {
    verbose?: boolean;
    rootDirectory?: string;
    companionName: string;
    primeName: string;
}

const FlowConfigSchema: ValidationSchema = {
    type: "object",
    properties: {
        verbose: { type: "boolean" },
        rootDirectory: { type: "string" },
        companionName: { type: "string" },
        primeName: { type: "string" },
    },
    required: ["companionName", "primeName"],
};

class InitFlowStartNode extends HAMINode<Shared, FlowConfig> {
    constructor(config?: FlowConfig, maxRetries?: number, wait?: number) {
        super(config, maxRetries, wait);
    }

    kind(): string {
        return "tbc-system:init-flow-start"
    }

    async post(shared: Record<string, any>, prepRes: unknown, execRes: unknown): Promise<string> {
        shared.stage = shared.stage || {};
        shared.stage.verbose = shared.verbose || this.config?.verbose;
        shared.stage.rootDirectory = shared.rootDirectory || this.config?.rootDirectory;
        shared.stage.companionName = shared.companionName || this.config?.companionName;
        shared.stage.primeName = shared.primeName || this.config?.primeName;
        shared.system = shared.system || {};
        shared.stage.sysCollection = 'sys';
        shared.stage.skillsCollection = 'skills';
        shared.stage.dexCollection = 'dex';
        shared.stage.memCollection = 'mem';
        shared.stage.actCollection = 'act';
        return "default";
    }
}

export class InitFlow extends HAMIFlow<Record<string, any>, FlowConfig> {
    startNode: Node;
    config: FlowConfig;

    constructor(config: FlowConfig) {
        const startNode = new InitFlowStartNode(config);
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return "tbc-system:init-flow";
    }

    validateConfig(config: FlowConfig): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, FlowConfigSchema)
        return {
            valid: result.isValid,
            errors: result.errors || [],
        };
    }

    async prep(shared: Shared): Promise<void> {
        assert(shared.registry, 'registry is required');
        const n = shared.registry.createNode.bind(shared.registry);
        const abortSequence = new Node();
        abortSequence
            .next(n('core:mutate', {
                mutate: (shared: Record<string, any>) => {
                    shared.stage.messages.push({
                        level: 'error',
                        code: 'OVERWRITE-GUARD',
                        source: 'init-flow',
                        message: `has existing companion ${shared.system.companionID}`,
                        suggestion: 'Use "tbc sys upgrade" instead.',
                    });
                }
            }))
            .next(n('tbc-system:log-and-clear-messages'))
        const branchToAbort = n('core:branch', {
            branch: (shared: Record<string, any>) => {
                if (shared.stage.validationResult.success) {
                    return 'abort';
                }
                return 'default';
            },
        });
        branchToAbort.on('abort', abortSequence)
        this.startNode
            .next(n('tbc-system:prepare-messages'))
            .next(n('tbc-system:resolve-root-directory'))
            .next(n('tbc-system:log-and-clear-messages'))
            .next(n('core:mutate', {
                mutate: (shared: Record<string, any>) => {
                    shared.stage.messages.push({
                        level: 'info',
                        source: 'init-flow',
                        message: 'Checking first ...',
                    });
                }
            }))
            .next(n('tbc-system:validate-flow', {
                verbose: shared.stage.verbose,
                rootDirectory: shared.stage.rootDirectory,
            }))
            .next(branchToAbort)
            .next(n('core:mutate', {
                mutate: (shared: Record<string, any>) => {
                    shared.stage.messages.push({
                        level: 'info',
                        source: 'init-flow',
                        message: 'no existing valid TBC root found, proceeding ...',
                    });
                }
            }))
            .next(n('tbc-mint:mint-ids-flow', {
                requests: [
                    { type: 'uuid', 'key': 'companionID' },
                    { type: 'uuid', 'key': 'primeID' },
                    { type: 'uuid', 'key': 'memoryMapID' },
                ],
            }))
            .next(n('tbc-system:add-minted-messages', {
                source: 'init-flow',
                level: 'info',
            }))
            .next(n('tbc-system:synthesize-mem-records'))
            .next(n('core:mutate', {
                mutate: (shared: Record<string, any>) => {
                    shared.stage.messages.push({
                        level: 'info',
                        source: 'init-flow',
                        message: 'Synthesized memory records.',
                    });
                }
            }))
            .next(n('tbc-system:load-system-assets'))
            .next(n('core:mutate', {
                mutate: (shared: Record<string, any>) => {
                    shared.stage.messages.push({
                        level: 'info',
                        source: 'init-flow',
                        message: `Loaded TBC ${packageJson.version} core assets (specs and skills).`,
                    });
                }
            }))
            .next(n('tbc-system:synthesize-sys-records'))
            .next(n('core:mutate', {
                mutate: (shared: Record<string, any>) => {
                    shared.stage.messages.push({
                        level: 'info',
                        source: 'init-flow',
                        message: 'Synthesized system records.',
                    });
                }
            }))
            .next(n('tbc-system:log-and-clear-messages'))
            .next(n('tbc-system:prepare-records-manifest'))
            .next(n('tbc-system:add-manifest-messages', {
                source: 'init-flow',
                level: 'info',
            }))
            .next(n('core:mutate', {
                mutate: (shared: Record<string, any>) => {
                    shared.record.rootDirectory = shared.system.rootDirectory;
                    shared.record.collection = shared.stage.sysCollection;
                    shared.record.records = [];
                    for (const [id, record] of Object.entries(shared.stage.records[shared.record.collection])) {
                        shared.record.records.push(record);
                    }
                }
            }))
            .next(n('tbc-record:store-records-flow', {
                verbose: shared.stage.verbose,
                recordProviders: ['fs'],
            }))
            .next(n('core:mutate', {
                mutate: (shared: Record<string, any>) => {
                    shared.stage.messages.push({
                        level: 'info',
                        source: 'init-flow',
                        message: `Stored ${shared.record.records.length} ${shared.record.collection} record(s).`,
                    });
                }
            }))
            .next(n('core:mutate', {
                mutate: (shared: Record<string, any>) => {
                    shared.record.rootDirectory = shared.system.rootDirectory;
                    shared.record.collection = `${shared.stage.sysCollection}/core`;
                    shared.record.records = [];
                    for (const [id, content] of Object.entries(shared.stage.records[shared.record.collection])) {
                        shared.record.records.push({
                            id: id,
                            content: content,
                        });
                    }
                }
            }))
            .next(n('tbc-record:store-records-flow', {
                verbose: shared.stage.verbose,
                recordProviders: ['fs'],
            }))
            .next(n('core:mutate', {
                mutate: (shared: Record<string, any>) => {
                    shared.stage.messages.push({
                        level: 'info',
                        source: 'init-flow',
                        message: `Stored ${shared.record.records.length} ${shared.record.collection} record(s).`,
                    });
                }
            }))
            .next(n('core:mutate', {
                mutate: (shared: Record<string, any>) => {
                    shared.record.rootDirectory = shared.system.rootDirectory;
                    shared.record.collection = `${shared.stage.sysCollection}/ext`;
                    shared.record.records = [];
                    for (const [id, content] of Object.entries(shared.stage.records[shared.record.collection])) {
                        shared.record.records.push({
                            id: id,
                            content: content,
                        });
                    }
                }
            }))
            .next(n('tbc-record:store-records-flow', {
                verbose: shared.stage.verbose,
                recordProviders: ['fs'],
            }))
            .next(n('core:mutate', {
                mutate: (shared: Record<string, any>) => {
                    shared.stage.messages.push({
                        level: 'info',
                        source: 'init-flow',
                        message: `Stored ${shared.record.records.length} ${shared.record.collection} record(s).`,
                    });
                }
            }))
            .next(n('core:mutate', {
                mutate: (shared: Record<string, any>) => {
                    shared.record.rootDirectory = shared.system.rootDirectory;
                    shared.record.collection = `${shared.stage.skillsCollection}/core`;
                    shared.record.records = [];
                    for (const [id, content] of Object.entries(shared.stage.records[shared.record.collection])) {
                        shared.record.records.push({
                            id: id,
                            content: content,
                        });
                    }
                }
            }))
            .next(n('tbc-record:store-records-flow', {
                verbose: shared.stage.verbose,
                recordProviders: ['fs'],
            }))
            .next(n('core:mutate', {
                mutate: (shared: Record<string, any>) => {
                    shared.stage.messages.push({
                        level: 'info',
                        source: 'init-flow',
                        message: `Stored ${shared.record.records.length} ${shared.record.collection} record(s).`,
                    });
                }
            }))
            .next(n('core:mutate', {
                mutate: (shared: Record<string, any>) => {
                    shared.record.rootDirectory = shared.system.rootDirectory;
                    shared.record.collection = `${shared.stage.skillsCollection}/ext`;
                    shared.record.records = [];
                    for (const [id, content] of Object.entries(shared.stage.records[shared.record.collection])) {
                        shared.record.records.push({
                            id: id,
                            content: content,
                        });
                    }
                }
            }))
            .next(n('tbc-record:store-records-flow', {
                verbose: shared.stage.verbose,
                recordProviders: ['fs'],
            }))
            .next(n('core:mutate', {
                mutate: (shared: Record<string, any>) => {
                    shared.stage.messages.push({
                        level: 'info',
                        source: 'init-flow',
                        message: `Stored ${shared.record.records.length} ${shared.record.collection} record(s).`,
                    });
                }
            }))
            .next(n('core:mutate', {
                mutate: (shared: Record<string, any>) => {
                    shared.record.rootDirectory = shared.system.rootDirectory;
                    shared.record.collection = shared.stage.memCollection;
                    shared.record.records = [];
                    for (const [id, record] of Object.entries(shared.stage.records[shared.record.collection])) {
                        shared.record.records.push(record);
                    }
                }
            }))
            .next(n('tbc-record:store-records-flow', {
                verbose: shared.stage.verbose,
                recordProviders: ['fs'],
            }))
            .next(n('core:mutate', {
                mutate: (shared: Record<string, any>) => {
                    shared.stage.messages.push({
                        level: 'info',
                        source: 'init-flow',
                        message: `Stored ${shared.record.records.length} ${shared.record.collection} record(s).`,
                    });
                }
            }))
            .next(n('core:mutate', {
                mutate: (shared: Record<string, any>) => {
                    shared.stage.messages.push({
                        level: 'info',
                        source: 'init-flow',
                        message: 'Validating again ...',
                    });
                }
            }))
            .next(n('tbc-system:validate-flow', {
                verbose: shared.stage.verbose,
                rootDirectory: shared.stage.rootDirectory,
            }))
            .next(n('core:mutate', {
                mutate: (shared: Shared) => {
                    shared.stage.messages.push({
                        level: 'info',
                        source: 'init-flow',
                        message: `Companion: ${shared.system.companionRecord.record_title} [${shared.system.companionID}]`,
                    });
                    shared.stage.messages.push({
                        level: 'info',
                        source: 'init-flow',
                        message: `Prime: ${shared.system.primeRecord.record_title} [${shared.system.primeID}]`,
                    });
                    shared.stage.messages.push({
                        level: 'info',
                        source: 'init-flow',
                        message: `Map of Memories [${shared.system.memoryMapID}] initialized.`,
                    });
                    shared.stage.messages.push({
                        level: 'raw',
                        message: ' ┌┼───────────────────────────────────────────────────────────',
                    });
                    shared.stage.messages.push({
                        level: 'raw',
                        message: `[✓] Third Brain Companion ${packageJson.version} initialized.`,
                    });
                    shared.stage.messages.push({
                        level: 'raw',
                        message: ' └┼───────────────────────────────────────────────────────────',
                    });
                    shared.stage.messages.push({
                        level: 'info',
                        source: 'init-flow',
                        message: `Next Steps`,
                        suggestion: 'Refresh indexes (tbc dex) and prepare interface hooks (tbc int)',
                    });

                }
            }))
            .next(n('tbc-system:log-and-clear-messages'))
            ;
    }

    async run(shared: Record<string, any>): Promise<string | undefined> {
        shared.stage = shared.stage || {};
        shared.stage.verbose = shared.verbose || this.config?.verbose;
        shared.stage.rootDirectory = shared.rootDirectory || this.config?.rootDirectory;
        shared.stage.companionName = shared.companionName || this.config?.companionName;
        shared.stage.primeName = shared.primeName || this.config?.primeName;
        return super.run(shared);
    }

}
