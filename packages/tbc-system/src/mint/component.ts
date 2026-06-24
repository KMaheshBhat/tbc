import { GenericConstructor, Intent, Payload, PayloadAccessor, PayloadFlow } from "@hami-frameworx/core"

const mintFlowKind = 'tbc:flow:mint'
export const mintIntentKind = 'tbc:intent:mint'

export interface MintOptions extends Record<string, unknown> {
  type: string
  count?: number
  targetNodeId: string
  targetDataKey: string
  [key: string]: unknown
}

export interface MintIntent extends Intent {
  kind: typeof mintIntentKind
  options: MintOptions
}

export interface MintProvider {
  readonly kind: string
  mintIDs(intent: MintIntent, options?: Record<string, unknown>): Promise<string[]>
}

// TODO: KABOOM!?
export interface MintComponent {
  mintFlow(
    provider: MintProvider,
    targetIntents: string[],
    options: { id: string },
  ): PayloadFlow
}

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

// TODO: KABOOM!?
export function WithMintComponent<TBase extends GenericConstructor<Payload>>(
  Base: TBase
): TBase & GenericConstructor<MintComponent> {
  return class extends Base {
    private flowId: string | undefined
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(...args: any[]) {
      super(...args)
      this.flowId = undefined
    }

    public mintFlow(
      provider: MintProvider,
      targetIntents: string[],
      options: { id: string }
    ): PayloadFlow {
      return new MintFlow(provider, targetIntents, options)
    }
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
    this.kind = `${mintFlowKind}:${provider.kind}`
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
