import { Intent } from "@hami-frameworx/core";

export const kindGenerateFlow = 'tbc:generate:flow';
export const kindGenerateIntent = 'tbc:generate:intent';

export interface GenerateOptions extends Record<string, unknown> {
  verbose?: boolean
  type: string
  count?: number
}

export interface GenerateIntent extends Intent {
  options: GenerateOptions
}

export function isGenerateIntent(intent: Intent): intent is GenerateIntent {
  return intent.kind === kindGenerateIntent
}

export function generateIntent(options: GenerateOptions): GenerateIntent {
  return {
    id: `${kindGenerateIntent}:${Date.now()}`,
    kind: kindGenerateIntent,
    nodes: [],
    options,
  }
}
