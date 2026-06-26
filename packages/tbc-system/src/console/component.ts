import { Intent, PayloadAccessor, PayloadFlow } from "@hami-frameworx/core";
import { MessageLevel, MessageNode } from "../message/model";
import { consoleFlowKind, ConsoleIntent, consoleIntentKind, isConsoleIntent } from "./model";

const SEVERITY_ICON_MAP = {
    debug: '»',
    info: 'i',
    warn: '!',
    error: '✗',
} as const;

export class ConsoleFlow implements PayloadFlow {
  public readonly id: string;
  public readonly kind = consoleFlowKind;
  public readonly supportedIntents = [consoleIntentKind]
  private messageRootNodeId: string;

  constructor(options: {
    id: string,
    messageRootNodeId: string,
  }) {
    this.id = options.id;
    this.messageRootNodeId = options.messageRootNodeId;
    if (!this.messageRootNodeId) {
      throw new Error(
        `${consoleFlowKind}:${this.id}: messageRootNodeId is required`
      );
    }
  }

  async execute(accessor: PayloadAccessor, intent: Intent): Promise<void> {
    const kind = this.kind;
    const flowId = this.id;
    const messageRootNodeId = this.messageRootNodeId;

    if (!isConsoleIntent(intent)) {
      throw new Error(
        `${kind}:${flowId}: ${intent.kind} not supported - ${JSON.stringify(intent)}`
      );
    }
    const cIntent = intent as ConsoleIntent;
    const silent = cIntent.options.silent ?? false;
    let root = accessor.getNode(messageRootNodeId as string);
    if (!root) {
      throw new Error(
        `${kind}:${flowId}: Node ${messageRootNodeId} not found`
      );
    }
    let mGroup: string | undefined = undefined;
    const edges = root.edges.filter(edge => edge.kind === 'child');
    let previousLevel: MessageLevel | undefined = undefined;
    for (const edge of edges) {
      const mNode = accessor.getNode(edge.toNodeId) as MessageNode;
      if (!mNode) continue; // TODO: on verbose option, log this as debug/warn
      if (mNode.data['consoleFlushed']) continue;
      if (mGroup !== undefined && mGroup !== edge.data.group) { // detect transition
        !silent && console.log(' └┼───'.padEnd(80, '─'));
      }
      if (mGroup !== edge.data.group) {
        mGroup = edge.data.group as string;
      }
      if (mNode.data.type === 'raw') {
        !silent && console.log(mNode.data.content);
      }
      if (mNode.data.type === 'structured') {
        const icon = SEVERITY_ICON_MAP[mNode.data.severity];
        let begin: string = `[${icon}]`;
        if (mNode.data.level === 'h1' || mNode.data.level === 'h2') {
          begin = (previousLevel === 'p' || previousLevel === undefined) ? ' ┌┤ ' : ' ├┤ ';
          !silent && console.log(`${begin}${mNode.data.content} ├`.padEnd(80, '─'));
        } else {
          !silent && console.log(`${begin} ── ${mNode.data.content}`)
        }
      }
      previousLevel = mNode.data.level;
      mNode.data['consoleFlushed'] = true;
      accessor.updateNode(mNode.id, mNode.data, mNode.meta, mNode.edges)
    }
  }
}
