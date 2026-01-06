import { Node } from "pocketflow";
import { HAMIRegistrationManager } from "@hami-frameworx/core";

export const logTableNode = (registry: HAMIRegistrationManager, resultKey: string) => {
    return registry.createNode('core:log-result', {
        resultKey,
        format: 'table' as const,
    });
};