import { createDataNode, Intent, PayloadAccessor, PayloadFlow } from "@hami-frameworx/core";
import { message } from "../message";
import { console } from "../console";
import { mint } from "../mint";

export const generateFlowKind = 'tbc:flow:generate';
export const generateIntentKind = 'tbc:intent:generate-id';

export interface GenerateOptions extends Record<string, unknown> {
  verbose?: boolean
  type: string
  count?: number
}

export interface GenerateIntent extends Intent {
  options: GenerateOptions
}

export function isGenerateIntent(intent: Intent): intent is GenerateIntent {
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
