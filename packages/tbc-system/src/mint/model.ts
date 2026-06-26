import { Intent } from "@hami-frameworx/core";

export const mintFlowKindBase = 'tbc:flow:mint'
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
