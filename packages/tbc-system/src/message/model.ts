import { DataNode, Intent } from "@hami-frameworx/core";

export const messageFlowKind = 'tbc:flow:message'
export const messageIntentKind = 'tbc:intent:message:prepare';
export const messageNodeKindRoot = 'tbc:node:message:root'
export const messageNodeKindItem = 'tbc:node:message:item'

export type MessageType = 'structured' | 'raw';
export type MessageSeverity = 'debug' | 'info' | 'warn' | 'error';
export type MessageLevel = 'h1' | 'h2' | 'p'

interface MessageNodeData {
  type: MessageType
  level: MessageLevel
  severity: MessageSeverity
  content: string
  [key: string]: unknown
}

export interface MessageNode extends DataNode {
  kind: typeof messageNodeKindRoot | typeof messageNodeKindItem
  data: MessageNodeData
}

export function createMessageNode(
  type: MessageType,
  severity: MessageSeverity,
  level: MessageLevel,
  content: string): MessageNode {
  const data : MessageNodeData = {
    type,
    severity,
    level,
    content,
  }
  return {
    id: `${crypto.randomUUID()}`,
    kind: messageNodeKindItem,
    data,
    edges: [],
    meta: {},
  }
}

export interface MessageOptions extends Record<string, unknown> {
  targetNodeId?: string
  targetDataKey: string
  type?: MessageType
  severity?: MessageSeverity
  title?: string
  subtitle?: string
}

export interface MessageIntent extends Intent {
  kind: typeof messageIntentKind
  nodes: DataNode[]
  options: MessageOptions
}


export function isMessageIntent(intent: Intent): intent is MessageIntent {
  return intent.kind === messageIntentKind
}

export function messageIntent(nodes: DataNode[], options: MessageOptions): MessageIntent {
  return {
    id: `${crypto.randomUUID()}`,
    kind: messageIntentKind,
    nodes,
    options,
  }
}
