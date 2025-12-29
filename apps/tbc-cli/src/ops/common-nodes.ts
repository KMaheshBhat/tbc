import { Node } from "pocketflow";
import { HAMIRegistrationManager } from "@hami-frameworx/core";

export class ExtractCompanionId extends Node {
    async post(shared: Record<string, any>, _prepRes: unknown, _execRes: unknown): Promise<string | undefined> {
        const companionIdFile = shared.fetchResults?.['sys']?.['companion.id'];
        if (!companionIdFile || !companionIdFile.content) {
            throw new Error('companion.id file not found or empty');
        }
        const companionId = companionIdFile.content.trim();
        shared.companionId = companionId;
        // Set for next fetch
        shared.collection = 'mem';
        shared.IDs = [companionId];
        return 'default';
    }
}

export const createExtractCompanionNameNode = () => {
    const node = new Node();
    node.post = async (shared: Record<string, any>, _prepRes: unknown, _execRes: unknown): Promise<string | undefined> => {
        const companionRecord = shared.fetchResults?.['mem']?.[shared.companionId];
        if (!companionRecord || (!companionRecord.name && !companionRecord.title)) {
            throw new Error('Companion record not found or missing name/title');
        }
        shared.companionName = companionRecord.name || companionRecord.title;
        return 'default';
    };
    return node;
};

export const createSetStoreCollectionNode = () => {
    const node = new Node();
    node.post = async (shared: Record<string, any>, _prepRes: unknown, _execRes: unknown): Promise<string | undefined> => {
        // Set for store-records
        shared.collection = '.';
        return 'default';
    };
    return node;
};

export const logTableNode = (registry: HAMIRegistrationManager, resultKey: string) => {
    return registry.createNode('core:log-result', {
        resultKey,
        format: 'table' as const,
    });
};