import assert from "assert";
import { Node } from "pocketflow";

import { HAMIFlow, HAMINode, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from "@hami-frameworx/core";
import { Shared } from "../types";
import { join } from "path";
import { existsSync } from "fs";

interface FlowConfig {
    verbose?: boolean;
    rootDirectory?: string;
    activityId?: string;
}

const FlowConfigSchema: ValidationSchema = {
    type: "object",
    properties: {
        verbose: { type: "boolean" },
        rootDirectory: { type: "string" },
        activityId: { type: "string" },
    },
};

class ActStartFlowStartNode extends HAMINode<Shared, FlowConfig> {
    kind(): string {
        return "tbc-activity:act-start-flow-start";
    }

    async post(shared: Shared): Promise<string> {
        shared.stage = shared.stage || {};
        shared.system = shared.system || {};
        shared.stage.verbose = shared.stage.verbose || this.config?.verbose;
        shared.stage.rootDirectory = shared.stage.rootDirectory || this.config?.rootDirectory;
        shared.stage.activityId = shared.stage.activityId || this.config?.activityId;
        return "default";
    }
}

export class ActStartFlow extends HAMIFlow<Record<string, any>, FlowConfig> {
    startNode: Node;
    config: FlowConfig;

    constructor(config: FlowConfig) {
        const startNode = new ActStartFlowStartNode(config);
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return "tbc-activity:act-start-flow";
    }

    async prep(shared: Record<string, any>): Promise<void> {
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
                        source: 'act-start-flow',
                        message: `has no existing companion (not a valid TBC Root)`,
                        suggestion: 'Use "tbc sys init" instead.',
                    });
                }
            }))
            .next(n('tbc-system:log-and-clear-messages'));

        const branchToAbort = n('core:branch', {
            branch: (s: Shared) => s.stage.validationResult?.success ? 'default' : 'abort',
        });
        branchToAbort.on('abort', abortSequence);

        const startMintActivityID = new Node();
        const startPrepareWorkspace = new Node();
        startMintActivityID
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    s.stage.messages.push({
                        level: 'info',
                        source: 'act-start-flow',
                        message: 'No activityID provided ...',
                    });
                    // We populate the key we promised to point to
                    s.stage.mintRequests = [{
                        type: 'tbc-mint:uuid-mint',
                        count: 1
                    }];
                }
            }))
            .next(n('tbc-mint:mint-ids-flow', {
                requestsKey: 'mintRequests',
            }))
            .next(n('tbc-system:add-minted-messages', {
                source: 'generate-uuids-flow',
                level: 'info',
            }))
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    const mintedId = s.stage.minted?.batch?.[0];
                    assert(mintedId, "Identity Minting failed: No ID found in stage.minted.batch.");
                    s.stage.activityId = mintedId;
                }
            }))
            .next(startPrepareWorkspace);

        const branchToMint = n('core:branch', {
            branch: (s: Shared) => s.stage.activityId ? 'default' : 'mintActivityID',
        });
        branchToMint.on('mintActivityID', startMintActivityID);

        const startReport = new Node();
        const branchToSkipSynthesis = n('core:branch', {
            branch: (s: Shared) => {
                const logPath = join(s.stage.activityPath, `${s.stage.activityId}.md`);
                return existsSync(logPath) ? 'exists' : 'default';
            }
        });
        branchToSkipSynthesis.on('exists', startReport);

        this.startNode
            .next(n('tbc-system:prepare-messages'))
            .next(n('tbc-system:resolve-root-directory'))
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    s.stage.messages.push({
                        level: 'info',
                        source: 'act-start-flow',
                        message: 'Checking first ...',
                    });
                }
            }))
            .next(n('tbc-system:log-and-clear-messages'))
            .next(n('tbc-system:validate-flow', {
                verbose: this.config?.verbose,
                rootDirectory: this.config?.rootDirectory
            }))
            .next(branchToAbort)
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    s.stage.messages.push({
                        level: 'info',
                        source: 'act-start-flow',
                        message: 'existing valid TBC root found, proceeding ...',
                    });
                }
            }))
            .next(n('tbc-system:log-and-clear-messages'))
            .next(branchToMint)
            .next(startPrepareWorkspace)
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    s.stage.messages.push({
                        level: 'info',
                        source: 'act-start-flow',
                        message: 'actual workspace preparation',
                    });
                }
            }))
            .next(n('tbc-activity:prepare-workspace'))
            .next(branchToSkipSynthesis)
            .next(n('tbc-system:load-system-assets'))
            .next(n('tbc-system:log-and-clear-messages'))
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    const activityId = s.stage.activityId;
                    const companionName = s.system.companionRecord?.record_title || 'companion';
                    const timestamp = new Date().toISOString();
                    s.stage.messages.push({
                        level: 'info',
                        source: 'act-start-flow',
                        message: `Synthesizing activity log ${activityId} with companion ${companionName}`,
                    });
                    // Setting up for tbc-synthesize:synthesize-record-flow
                    s.stage.synthesizeRequests = [{
                        type: 'log',
                        provider: 'tbc-system:synthesize-record',
                        meta: {
                            id: activityId,
                            title: `Activity Log ${timestamp}`,
                            content: `Activity session initialized. Replace this with actual activity details and logs as you work.`,
                            log_type: 'activity',
                        }
                    }];
                    s.stage.actCollection = `act/current/${activityId}`;
                }
            }))
            .next(n('tbc-synthesize:synthesize-record-flow', { requestsKey: 'synthesizeRequests' }))
            .next(n('tbc-write:write-records-flow', {
                verbose: this.config?.verbose,
                recordStorers: ['tbc-record-fs:store-records'],
                sourcePath: 'record.records',
                collection: 'actCollection',
                syncIndex: false
            }))
            .next(startReport)
            // --- FEEDBACK SECTION ---
            .next(n('core:mutate', {
                mutate: (s: Shared) => {
                    const activityId = s.stage.activityId;
                    
                    s.stage.messages.push({
                        level: 'raw',
                        message: ' ┌┼───────────────────────────────────────────────────────────',
                    });
                    s.stage.messages.push({
                        level: 'raw',
                        message: `[✓] Activity started: ${activityId}`,
                    });
                    s.stage.messages.push({
                        level: 'raw',
                        message: ' └┼───────────────────────────────────────────────────────────',
                    });
                    s.stage.messages.push({
                        level: 'info',
                        source: 'act-start-flow',
                        message: `Log: ${s.stage.actCollection}/${activityId}.md`,
                        suggestion: `This is your active workspace. Updates will be tracked here until the activity is closed.`,
                    });
                }
            }))
            .next(n('tbc-system:log-and-clear-messages'));
    }

    validateConfig(config: FlowConfig): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, FlowConfigSchema);
        return { valid: result.isValid, errors: result.errors || [] };
    }

    async run(shared: Record<string, any>): Promise<string | undefined> {
        shared.stage = shared.stage || {};
        shared.stage.verbose = shared.verbose || this.config?.verbose;
        shared.stage.rootDirectory = shared.rootDirectory || this.config?.rootDirectory;
        shared.stage.activityId = shared.activityId || this.config?.activityId;
        return super.run(shared);
    }
}