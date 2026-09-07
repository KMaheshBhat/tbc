import { CorePlugin, HAMIRegistrationManager } from '@hami-frameworx/core';
import { TBCRecordPlugin } from '@tbc-frameworx/tbc-record';
import { TBCRecordFSPlugin } from '@tbc-frameworx/tbc-record-fs';
import { TBCRecordSQLitePlugin } from '@tbc-frameworx/tbc-record-sqlite';
import { TBCMintPlugin } from '@tbc-frameworx/tbc-mint';
import { TBCSynthesizePlugin } from '@tbc-frameworx/tbc-synthesize';
import { TBCSystemPlugin } from '@tbc-frameworx/tbc-system';
import { TBCInterfacePlugin } from '@tbc-frameworx/tbc-interface';
import { TBCMemoryPlugin } from '@tbc-frameworx/tbc-memory';
import { TBCActivityPlugin } from '@tbc-frameworx/tbc-activity';
import { TBCKilocodePlugin } from '@tbc-frameworx/tbc-kilocode';
import { TBCGoosePlugin } from '@tbc-frameworx/tbc-goose';
import { TBCGeminiPlugin } from '@tbc-frameworx/tbc-gemini';
import { TBCGitHubCopilotPlugin } from '@tbc-frameworx/tbc-github-copilot';
import { TBCPiPlugin } from '@tbc-frameworx/tbc-pi';

export async function bootstrap(): Promise<{ registry: HAMIRegistrationManager }> {
    const registry = new HAMIRegistrationManager();
    const register = registry.registerPlugin.bind(registry) as (plugin: any) => Promise<void>;
    await register(CorePlugin);
    await register(TBCRecordPlugin);
    await register(TBCRecordFSPlugin);
    await register(TBCRecordSQLitePlugin);
    await register(TBCMintPlugin);
    await register(TBCSynthesizePlugin);
    await register(TBCSystemPlugin);
    await register(TBCInterfacePlugin);
    await register(TBCMemoryPlugin);
    await register(TBCActivityPlugin);
    await register(TBCKilocodePlugin);
    await register(TBCGoosePlugin);
    await register(TBCGeminiPlugin);
    await register(TBCGitHubCopilotPlugin);
    await register(TBCPiPlugin);
    return { registry };
}