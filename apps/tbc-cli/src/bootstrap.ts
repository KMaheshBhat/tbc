import { CorePlugin, HAMIRegistrationManager } from '@hami-frameworx/core';
import { TBCFSPlugin } from '@tbc-frameworx/tbc-fs';
import { TBCCorePlugin } from '@tbc-frameworx/tbc-core';

export async function bootstrap(): Promise<{ registry: HAMIRegistrationManager }> {
    const registry = new HAMIRegistrationManager();
    await registry.registerPlugin(CorePlugin);
    await registry.registerPlugin(TBCFSPlugin);
    await registry.registerPlugin(TBCCorePlugin);
    return { registry };
}