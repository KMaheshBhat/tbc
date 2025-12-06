import { CorePlugin, HAMIRegistrationManager } from '@hami-frameworx/core';
import { TBCFSPlugin } from '@tbc-frameworx/tbc-fs';

export async function bootstrap(): Promise<{ registry: HAMIRegistrationManager }> {
    const registry = new HAMIRegistrationManager();
    await registry.registerPlugin(CorePlugin);
    await registry.registerPlugin(TBCFSPlugin);
    return { registry };
}