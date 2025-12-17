import { CorePlugin, HAMIRegistrationManager } from '@hami-frameworx/core';
import { TBCRecordFSPlugin } from '@tbc-frameworx/tbc-record-fs';
import { TBCCorePlugin } from '@tbc-frameworx/tbc-core';
import { TBCGeneratorPlugin } from '@tbc-frameworx/tbc-generator';
import { TBCKilocodePlugin } from '@tbc-frameworx/tbc-kilocode';
import { TBCGoosePlugin } from '@tbc-frameworx/tbc-goose';

export async function bootstrap(): Promise<{ registry: HAMIRegistrationManager }> {
    const registry = new HAMIRegistrationManager();
    await registry.registerPlugin(CorePlugin);
    await registry.registerPlugin(TBCRecordFSPlugin);
    await registry.registerPlugin(TBCCorePlugin);
    await registry.registerPlugin(TBCGeneratorPlugin);
    await registry.registerPlugin(TBCKilocodePlugin);
    await registry.registerPlugin(TBCGoosePlugin);
    return { registry };
}