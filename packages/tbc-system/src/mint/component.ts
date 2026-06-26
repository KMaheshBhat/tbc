import { Intent, PayloadAccessor, PayloadFlow } from "@hami-frameworx/core";
import { mintFlowKindBase, MintIntent, mintIntentKind, MintOptions, MintProvider } from "./model";

export function mintIntent(
  options: MintOptions,
): MintIntent {
  return {
    id: `${crypto.randomUUID()}`,
    kind: mintIntentKind,
    nodes: [],
    options,
  }
}

export class MintFlow implements PayloadFlow {
  public readonly id: string;
  public readonly kind: string;
  public readonly supportedIntents: string[];
  private provider: MintProvider;

  constructor(
    provider: MintProvider,
    targetIntents: string[],
    options: { id: string }
  ) {
    this.id = options.id
    this.kind = `${mintFlowKindBase}:${provider.kind}`
    this.supportedIntents = targetIntents
    this.provider = provider
  }

  async execute(accessor: PayloadAccessor, intent: Intent): Promise<void> {
    const mintIntent = intent as MintIntent
    const { targetNodeId, targetDataKey, count = 1 } = mintIntent.options as MintOptions
    if (isNaN(count) || count < 1) {
      throw new Error('count must be a positive integer');
    }
    const ids = await this.provider.mintIDs(mintIntent, intent.options)
    accessor.updateNode(
      targetNodeId,
      { [targetDataKey]: ids.length === 1 ? ids : ids },
      {},
      [],
    )
  }
}
