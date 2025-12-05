import { CorePlugin, HAMIRegistrationManager } from '@hami-frameworx/core';

export async function bootstrap(): Promise<{ registry: HAMIRegistrationManager }> {
    const registry = new HAMIRegistrationManager();
    await registry.registerPlugin(CorePlugin)
    return { registry };
}