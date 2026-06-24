import { createDataNode, Intent, PayloadAccessor, PayloadFlow } from "@hami-frameworx/core";
import { message } from "../message";
import { console } from "../console";
import { mint } from "../mint";

const generateFlowKind = 'tbc:flow:generate';
const generateIntentKind = 'tbc:intent:generate-id';

export interface GenerateOptions extends Record<string, unknown> {
  verbose?: boolean
  type: string
  count?: number
}

export interface GenerateIntent extends Intent {
  options: GenerateOptions
}

function isGenerateIntent(intent: Intent): intent is GenerateIntent {
  return intent.kind === generateIntentKind
}

export function generateIntent(options: GenerateOptions): GenerateIntent {
  return {
    id: `${generateIntentKind}:${Date.now()}`,
    kind: generateIntentKind,
    nodes: [],
    options,
  }
}

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
    await accessor.runFlow(mint.intent({
      targetNodeId,
      targetDataKey,
      count: gIntent.options?.count ?? 1,
      type: gIntent.options?.type ?? '',
    }));
    await accessor.runFlow(message.intent([], {
      title: 'Minted IDs',
      subtitle: 'Batch',
      severity: 'info',
      targetNodeId,
      targetDataKey,
    }));
    await accessor.runFlow(message.intent([createDataNode(crypto.randomUUID()).withData({
      message: `[✓] Minted ${intent.options?.count} IDs`,
    }).build()], {
      type: 'raw',
      targetDataKey: 'message',
    }));
    await accessor.runFlow(console.intent({
      silent: false,
    }))
  }
}
