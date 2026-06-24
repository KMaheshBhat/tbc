import { MessageFlow, messageIntent, WithMessageComponent } from './component';

export const message = {
  flow: MessageFlow,
  mixin: WithMessageComponent,
  intent: messageIntent,
}
