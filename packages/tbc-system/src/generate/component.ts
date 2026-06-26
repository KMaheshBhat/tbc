import { createDataNode, Intent, PayloadAccessor, PayloadFlow } from "@hami-frameworx/core";
import { generateFlowKind, GenerateIntent, generateIntentKind, isGenerateIntent } from "./model";

import { system } from "../";

export class GenerateFlow implements PayloadFlow {
  public readonly id = crypto.randomUUID();
  public readonly kind = generateFlowKind;
  public readonly supportedIntents = [generateIntentKind]

  async execute(
    accessor: PayloadAccessor,
    intent: Intent,
  ): Promise<void> {
    if (!isGenerateIntent(intent)) {
      throw new Error(
        `${this.kind}:${this.id}: ${intent.kind} not supported - ${JSON.stringify(intent)}`
      );
    }
    const gIntent = intent as GenerateIntent;
    const targetNodeId = crypto.randomUUID();
    const targetDataKey = 'ids';
    accessor.addNode(
      createDataNode(targetNodeId)
        .build()
    );
    await accessor.runFlow(system.components.mint.intent({
      targetNodeId,
      targetDataKey,
      count: gIntent.options?.count ?? 1,
      type: gIntent.options?.type ?? '',
    }));
    await accessor.runFlow(system.components.message.intent([], {
      title: 'Minted IDs',
      subtitle: 'Batch',
      severity: 'info',
      targetNodeId,
      targetDataKey,
    }));
    await accessor.runFlow(system.components.message.intent([createDataNode(crypto.randomUUID()).withData({
      message: `[✓] Minted ${intent.options?.count} IDs`,
    }).build()], {
      type: 'raw',
      targetDataKey: 'message',
    }));
    await accessor.runFlow(system.components.console.intent({
      silent: false,
    }))
  }
}
