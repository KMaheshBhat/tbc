import { Intent } from "@hami-frameworx/core";

export const kindConsoleFlow = 'tbc:flow:console'
export const kindConsoleIntent = 'tbc:intent:console:flush';

export interface ConsoleOptions extends Record<string, unknown> {
  silent?: boolean
}

export interface ConsoleIntent extends Intent {
  options: ConsoleOptions
}

export function isConsoleIntent(intent: Intent): intent is ConsoleIntent {
  return intent.kind === kindConsoleIntent
}

export function consoleIntent(
  options: ConsoleOptions,
): ConsoleIntent {
  return {
    id: `${crypto.randomUUID()}`,
    kind: kindConsoleIntent,
    nodes: [],
    options,
  }
}
