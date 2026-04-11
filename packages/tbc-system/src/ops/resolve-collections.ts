import { HAMINode } from '@hami-frameworx/core';
import { Shared } from '../types.js';

export class ResolveCollectionsNode extends HAMINode<Shared> {
    kind(): string {
        return 'tbc-system:resolve-collections';
    }

    async post(shared: Shared): Promise<string> {
        const proto = shared.system.protocol;
        if (proto) {
            shared.stage.sysCollection = proto.sys.collection;
            shared.stage.sysCoreCollection = `${proto.sys.collection}/core`;
            shared.stage.sysExtCollection = `${proto.sys.collection}/ext`;
            shared.stage.skillsCollection = proto.skills.collection;
            shared.stage.memCollection = proto.mem.collection;
            shared.stage.dexCollection = proto.dex.collection;
            shared.stage.actCollection = proto.act.collection;
        }
        return 'default';
    }
};
