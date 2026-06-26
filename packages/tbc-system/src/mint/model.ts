import { Intent } from "@hami-frameworx/core";

export const kindMintFlowBase = 'tbc:mint:flow'
export const kindMintIntent = 'tbc:mint:intent'

export interface MintOptions extends Record<string, unknown> {
  type: string
  count?: number
  targetNodeId: string
  targetDataKey: string
  [key: string]: unknown
}

export interface MintIntent extends Intent {
  kind: typeof kindMintIntent
  options: MintOptions
}

export interface MintProvider {
  readonly kind: string
  mintIDs(intent: MintIntent, options?: Record<string, unknown>): Promise<string[]>
}
