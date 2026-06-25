import { Payload } from '@hami-frameworx/runtime';
import { console } from './console';
import { generate } from './generate';
import { message } from './message';
import { mint } from './mint';

export function bootstrap(): Payload {
  const kernel = new Payload();
  kernel.addFlow(new message.flow({ id: 'system:flow:message', messageRootNodeId: 'system:node:message-root' }));
  kernel.addFlow(new console.flow({ id: 'system:flow:console', messageRootNodeId: 'system:node:message-root' }));
  kernel.addFlow(new mint.flow(new mint.providers.chrono(), [mint.intentKind], { id: 'system:flow:mint' }));
  kernel.addFlow(new generate.flow());
  return kernel;
}
