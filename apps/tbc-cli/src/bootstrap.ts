import { CorePlugin, HAMIRegistrationManager } from '@hami-frameworx/core';
import { TBCRecordPlugin } from '@tbc-frameworx/tbc-record';
import { TBCRecordFSPlugin } from '@tbc-frameworx/tbc-record-fs';
import { TBCSystemPlugin } from '@tbc-frameworx/tbc-system';
import { TBCDexPlugin } from '@tbc-frameworx/tbc-dex';
import { TBCMintPlugin } from '@tbc-frameworx/tbc-mint';
import { TBCMintUuidPlugin } from '@tbc-frameworx/tbc-mint-uuid';
import { TBCMintTsidPlugin } from '@tbc-frameworx/tbc-mint-tsid';
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
    await registry.registerPlugin(TBCRecordPlugin);
    await registry.registerPlugin(TBCRecordFSPlugin);
    await registry.registerPlugin(TBCSystemPlugin);
    await registry.registerPlugin(TBCDexPlugin);
    await registry.registerPlugin(TBCMintPlugin);
    await registry.registerPlugin(TBCMintUuidPlugin);
    await registry.registerPlugin(TBCMintTsidPlugin);
    await registry.registerPlugin(TBCInterfacePlugin);
    await registry.registerPlugin(TBCMemoryPlugin);
    await registry.registerPlugin(TBCActivityPlugin);
    await registry.registerPlugin(TBCKilocodePlugin);
    await registry.registerPlugin(TBCGoosePlugin);
    await registry.registerPlugin(TBCGeminiPlugin);
    await registry.registerPlugin(TBCGitHubCopilotPlugin);
    return { registry };
}