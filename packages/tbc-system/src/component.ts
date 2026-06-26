import { Payload } from '@hami-frameworx/runtime';
import { system } from '.';


export function bootstrap(): Payload {
  const kernel = new Payload();
  const c = system.components;
  kernel.addFlow(new c.message.flow({ id: 'system:flow:message', messageRootNodeId: 'system:node:message-root' }));
  kernel.addFlow(new c.console.flow({ id: 'system:flow:console', messageRootNodeId: 'system:node:message-root' }));
  kernel.addFlow(new c.mint.flow(new c.mint.providers.chrono(), [c.mint.intentKind], { id: 'system:flow:mint' }));
  kernel.addFlow(new c.generate.flow());
  return kernel;
}
