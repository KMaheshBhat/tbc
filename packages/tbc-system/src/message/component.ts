import { Intent, PayloadAccessor, PayloadFlow } from "@hami-frameworx/core";
import { createMessageNode, isMessageIntent, messageFlowKind, MessageIntent, messageIntentKind, messageNodeRootKind } from "./model";

export class MessageFlow implements PayloadFlow {
  public readonly id : string;
  public readonly kind = messageFlowKind;
  public readonly supportedIntents = [messageIntentKind]
  private rootNodeId: string;

  constructor(options: {
    id: string,
    messageRootNodeId: string,
  }) {
    this.id = options.id;
    this.rootNodeId = options.messageRootNodeId;
  }

  async execute(accessor: PayloadAccessor, intent: Intent): Promise<void> {
    const kind = this.kind;
    const flowId = this.id;
    const rootNodeId = this.rootNodeId;
    if (!isMessageIntent(intent)) {
      throw new Error(
        `${kind}:${flowId}: ${intent.kind} not supported - ${JSON.stringify(intent)}`
      );
    }
    const mIntent = intent as MessageIntent;
    if (mIntent.nodes.length === 0 && !mIntent.options?.targetNodeId) {
      throw new Error(
        `${kind}:${flowId}: Intent had no nodes OR targetNodeId: ${JSON.stringify(mIntent)}`
      );
    }
    if (!mIntent.options?.targetDataKey) {
      throw new Error(
        `${kind}:${flowId}: Intent had no targetDataKey: ${JSON.stringify(mIntent)}`
      );
    }
    const targetNodeId = mIntent.options.targetNodeId as string;
    const targetDataKey = mIntent.options.targetDataKey as string;
    const type = mIntent.options.type ?? 'structured';
    const severity = mIntent.options.severity ?? 'info';
    const title = mIntent.options.title;
    const subtitle = mIntent.options.subtitle;
    const nodes = mIntent.nodes ?? [];
    if (targetNodeId) {
      const targetNode = accessor.getNode(targetNodeId);
      if (!targetNode) {
        throw new Error(
          `${kind}:${flowId}: Target node not found: ${targetNodeId}`
        );
      }
      nodes.push(targetNode);
    }
    let root = accessor.getNode(rootNodeId);
    if (!root) {
      accessor.addNode({
        id: rootNodeId,
        kind: messageNodeRootKind,
        data: {},
        edges: [],
        meta: {},
      });
      root = accessor.getNode(rootNodeId);
      if (!root) {
        throw new Error(
          `${kind}:${flowId}: Failed to create root node: ${rootNodeId}`
        );
      }
    }
    if (title) {
      const messageNode = createMessageNode(type, severity, 'h1', title)
      accessor.addNode(messageNode);
      root.edges.push({ kind: 'child', toNodeId: messageNode.id, data: { 'group': mIntent.id } });
    }
    if (subtitle) {
      const messageNode = createMessageNode(type, severity, 'h2', subtitle)
      accessor.addNode(messageNode);
      root.edges.push({ kind: 'child', toNodeId: messageNode.id, data: { 'group': mIntent.id } });
    }
    nodes.forEach(node => {
      const rawContent = node.data[targetDataKey];
      const content : string[] = []
      if (Array.isArray(rawContent)) {
        content.push(...rawContent);
      } else if (typeof rawContent === 'string') {
        content.push(rawContent);
      }
      content.forEach(line => {
        const messageNode = createMessageNode(type, severity, 'p', line)
        accessor.addNode(messageNode);
        root.edges.push({ kind: 'child', toNodeId: messageNode.id, data: { 'group': mIntent.id } });
      });
    });
    accessor.updateNode(rootNodeId, root.data, root.meta, root.edges)
  }
}
