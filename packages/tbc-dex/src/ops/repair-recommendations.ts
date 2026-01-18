import { HAMINode } from "@hami-frameworx/core";

import type { Shared } from "../types.js";

type RepairRecommendationsInput = {
    healthSummary: {
        total_records: number;
        healthy_records: number;
        health_percentage: number;
    };
    zombieLinks: Array<{
        source_id: string;
        target_id: string;
        source_collection: string;
        source_type: string;
        edge_type: string;
    }>;
    orphanRecords: Array<{
        id: string;
        collection: string;
        record_type: string;
        title?: string;
    }>;
    schemaViolations: Array<{
        id: string;
        collection: string;
        record_type: string;
        violation_details?: string;
    }>;
};

type RepairRecommendationsOutput = {
    repairRecommendations: Array<{
        issue_type: string;
        severity: 'critical' | 'warning' | 'info';
        description: string;
        affected_records: number;
        recommended_action: string;
    }>;
};

export class RepairRecommendationsNode extends HAMINode<Shared> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-dex:repair-recommendations";
    }

    async prep(shared: Shared): Promise<RepairRecommendationsInput> {
        if (!shared.healthSummary) {
            throw new Error("healthSummary is required in shared state");
        }
        if (!shared.zombieLinks) {
            throw new Error("zombieLinks is required in shared state");
        }
        if (!shared.orphanRecords) {
            throw new Error("orphanRecords is required in shared state");
        }
        if (!shared.schemaViolations) {
            throw new Error("schemaViolations is required in shared state");
        }
        return {
            healthSummary: shared.healthSummary,
            zombieLinks: shared.zombieLinks,
            orphanRecords: shared.orphanRecords,
            schemaViolations: shared.schemaViolations,
        };
    }

    async exec(params: RepairRecommendationsInput): Promise<RepairRecommendationsOutput> {
        const recommendations: RepairRecommendationsOutput['repairRecommendations'] = [];

        // Health percentage recommendations
        if (params.healthSummary.health_percentage < 80) {
            recommendations.push({
                issue_type: 'health_percentage',
                severity: params.healthSummary.health_percentage < 50 ? 'critical' : 'warning',
                description: `System health is ${params.healthSummary.health_percentage.toFixed(1)}% (${params.healthSummary.healthy_records}/${params.healthSummary.total_records} records healthy)`,
                affected_records: params.healthSummary.total_records - params.healthSummary.healthy_records,
                recommended_action: 'Run `tbc view index` to re-index records and check for watermark failures',
            });
        }

        // Zombie links recommendations
        if (params.zombieLinks.length > 0) {
            recommendations.push({
                issue_type: 'zombie_links',
                severity: params.zombieLinks.length > 10 ? 'critical' : 'warning',
                description: `${params.zombieLinks.length} broken links detected`,
                affected_records: params.zombieLinks.length,
                recommended_action: 'Review and update or remove records with broken links. Consider restoring from backups.',
            });
        }

        // Orphan records recommendations
        if (params.orphanRecords.length > 0) {
            recommendations.push({
                issue_type: 'orphan_records',
                severity: 'info',
                description: `${params.orphanRecords.length} records have no incoming links`,
                affected_records: params.orphanRecords.length,
                recommended_action: 'Review orphan records for archival or manual linking as appropriate',
            });
        }

        // Schema violations recommendations
        if (params.schemaViolations.length > 0) {
            recommendations.push({
                issue_type: 'schema_violations',
                severity: params.schemaViolations.length > 5 ? 'critical' : 'warning',
                description: `${params.schemaViolations.length} records have schema violations`,
                affected_records: params.schemaViolations.length,
                recommended_action: 'Fix YAML frontmatter to match TBC 0.4 specification requirements',
            });
        }

        return { repairRecommendations: recommendations };
    }

    async post(shared: Shared, _prepRes: RepairRecommendationsInput, execRes: RepairRecommendationsOutput): Promise<string | undefined> {
        shared.repairRecommendations = execRes.repairRecommendations;
        return "default";
    }
}