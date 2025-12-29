import { Node } from "pocketflow";
import { HAMIRegistrationManager } from "@hami-frameworx/core";

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