import { CorePlugin, HAMIRegistrationManager } from '@hami-frameworx/core';
import { TBCRecordFSPlugin } from '@tbc-frameworx/tbc-record-fs';
import { TBCSystemPlugin } from '@tbc-frameworx/tbc-system';
import { TBCViewPlugin } from '@tbc-frameworx/tbc-view';
import { TBCGeneratorPlugin } from '@tbc-frameworx/tbc-generator';
import { TBCInterfacePlugin } from '@tbc-frameworx/tbc-interface';
import { TBCMemoryPlugin } from '@tbc-frameworx/tbc-memory';
import { TBCActivityPlugin } from '@tbc-frameworx/tbc-activity';
import { TBCKilocodePlugin } from '@tbc-frameworx/tbc-kilocode';
import { TBCGoosePlugin } from '@tbc-frameworx/tbc-goose';
import { TBCGeminiPlugin } from '@tbc-frameworx/tbc-gemini';
import { TBCGitHubCopilotPlugin } from '@tbc-frameworx/tbc-github-copilot';

export async function bootstrap(): Promise<{ registry: HAMIRegistrationManager }> {
    const registry = new HAMIRegistrationManager();
    await registry.registerPlugin(CorePlugin);
    await registry.registerPlugin(TBCRecordFSPlugin);
    await registry.registerPlugin(TBCSystemPlugin);
    await registry.registerPlugin(TBCViewPlugin);
    await registry.registerPlugin(TBCGeneratorPlugin);
    await registry.registerPlugin(TBCInterfacePlugin);
    await registry.registerPlugin(TBCMemoryPlugin);
    await registry.registerPlugin(TBCActivityPlugin);
    await registry.registerPlugin(TBCKilocodePlugin);
    await registry.registerPlugin(TBCGoosePlugin);
    await registry.registerPlugin(TBCGeminiPlugin);
    await registry.registerPlugin(TBCGitHubCopilotPlugin);
    return { registry };
}