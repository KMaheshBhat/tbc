import { CorePlugin, HAMIRegistrationManager } from '@hami-frameworx/core';
import { TBCRecordFSPlugin } from '@tbc-frameworx/tbc-record-fs';
import { TBCCorePlugin } from '@tbc-frameworx/tbc-core';

export async function bootstrap(): Promise<{ registry: HAMIRegistrationManager }> {
    const registry = new HAMIRegistrationManager();
    await registry.registerPlugin(CorePlugin);
    await registry.registerPlugin(TBCRecordFSPlugin);
    await registry.registerPlugin(TBCCorePlugin);
    return { registry };
}