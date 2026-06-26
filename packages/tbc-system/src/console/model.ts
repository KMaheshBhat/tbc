import { Intent } from "@hami-frameworx/core";

export const consoleFlowKind = 'tbc:flow:console'
export const consoleIntentKind = 'tbc:intent:console:flush';

export interface ConsoleOptions extends Record<string, unknown> {
  silent?: boolean
}

export interface ConsoleIntent extends Intent {
  options: ConsoleOptions
}

export function isConsoleIntent(intent: Intent): intent is ConsoleIntent {
  return intent.kind === consoleIntentKind
}

export function consoleIntent(
  options: ConsoleOptions,
): ConsoleIntent {
  return {
    id: `${crypto.randomUUID()}`,
    kind: consoleIntentKind,
    nodes: [],
    options,
  }
}
