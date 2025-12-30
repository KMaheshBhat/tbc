import { HAMIFlow } from "@hami-frameworx/core";
import { Node } from "pocketflow";

interface RefreshSkillsFlowConfig {
    verbose: boolean;
}

export class RefreshSkillsFlow extends HAMIFlow<Record<string, any>, RefreshSkillsFlowConfig> {
    startNode: Node;
    config: RefreshSkillsFlowConfig;

    constructor(config: RefreshSkillsFlowConfig) {
        const startNode = new Node();
        super(startNode, config);
        this.startNode = startNode;
        this.config = config;
    }

    kind(): string {
        return "tbc-view:refresh-skills";
    }

    async run(shared: Record<string, any>): Promise<string | undefined> {
        const n = shared.registry.createNode.bind(shared.registry);

        // Set options in shared state
        shared.opts = { verbose: this.config.verbose };

        // Determine root directory
        const rootDir = shared.root || process.cwd();
        shared.rootDirectory = rootDir;

        // Wire the flow
        this.startNode
            .next(n('tbc-system:resolve'))
            .next(n('tbc-view:generate-dex-skills', { verbose: this.config.verbose }))
            .next(n('tbc-record-fs:store-records'))
            .next(n('core:log-result', { resultKey: 'storeResults', format: 'table'}))
            ;

        return super.run(shared);
    }
}