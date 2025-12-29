import { CorePlugin, HAMIRegistrationManager } from '@hami-frameworx/core';
import { TBCRecordFSPlugin } from '@tbc-frameworx/tbc-record-fs';
import { TBCSystemPlugin } from '@tbc-frameworx/tbc-system';
import { TBCViewPlugin } from '@tbc-frameworx/tbc-view';
import { TBCGeneratorPlugin } from '@tbc-frameworx/tbc-generator';
import { TBCInterfacePlugin } from '@tbc-frameworx/tbc-interface';
import { TBCKilocodePlugin } from '@tbc-frameworx/tbc-kilocode';
import { TBCGoosePlugin } from '@tbc-frameworx/tbc-goose';
import { TBCGitHubCopilotPlugin } from '@tbc-frameworx/tbc-github-copilot';

export async function bootstrap(): Promise<{ registry: HAMIRegistrationManager }> {
    const registry = new HAMIRegistrationManager();
    await registry.registerPlugin(CorePlugin);
    await registry.registerPlugin(TBCRecordFSPlugin);
    await registry.registerPlugin(TBCSystemPlugin);
    await registry.registerPlugin(TBCViewPlugin);
    await registry.registerPlugin(TBCGeneratorPlugin);
    await registry.registerPlugin(TBCInterfacePlugin);
    await registry.registerPlugin(TBCKilocodePlugin);
    await registry.registerPlugin(TBCGoosePlugin);
    await registry.registerPlugin(TBCGitHubCopilotPlugin);
    return { registry };
}