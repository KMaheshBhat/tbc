import { HAMINode } from "@hami-frameworx/core";

import type { TBCViewStorage } from "../types.js";

type ReportGeneratorInput = {
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
    repairRecommendations: Array<{
        issue_type: string;
        severity: 'critical' | 'warning' | 'info';
        description: string;
        affected_records: number;
        recommended_action: string;
    }>;
};

type ReportGeneratorOutput = {
    integrityReport: {
        timestamp: string;
        summary: {
            total_records: number;
            healthy_records: number;
            health_percentage: number;
            critical_issues: number;
            warning_issues: number;
            info_issues: number;
        };
        issues: {
            zombie_links: number;
            orphan_records: number;
            schema_violations: number;
        };
        recommendations: Array<{
            issue_type: string;
            severity: 'critical' | 'warning' | 'info';
            description: string;
            affected_records: number;
            recommended_action: string;
        }>;
        details: {
            zombie_links: Array<{
                source_id: string;
                target_id: string;
                source_collection: string;
                source_type: string;
                edge_type: string;
            }>;
            orphan_records: Array<{
                id: string;
                collection: string;
                record_type: string;
                title?: string;
            }>;
            schema_violations: Array<{
                id: string;
                collection: string;
                record_type: string;
                violation_details?: string;
            }>;
        };
    };
};

export class ReportGeneratorNode extends HAMINode<TBCViewStorage> {
    constructor(maxRetries?: number, wait?: number) {
        super(maxRetries, wait);
    }

    kind(): string {
        return "tbc-view:report-generator";
    }

    async prep(shared: TBCViewStorage): Promise<ReportGeneratorInput> {
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
        if (!shared.repairRecommendations) {
            throw new Error("repairRecommendations is required in shared state");
        }
        return {
            healthSummary: shared.healthSummary,
            zombieLinks: shared.zombieLinks,
            orphanRecords: shared.orphanRecords,
            schemaViolations: shared.schemaViolations,
            repairRecommendations: shared.repairRecommendations,
        };
    }

    async exec(params: ReportGeneratorInput): Promise<ReportGeneratorOutput> {
        const criticalIssues = params.repairRecommendations.filter(r => r.severity === 'critical').length;
        const warningIssues = params.repairRecommendations.filter(r => r.severity === 'warning').length;
        const infoIssues = params.repairRecommendations.filter(r => r.severity === 'info').length;

        const integrityReport: ReportGeneratorOutput['integrityReport'] = {
            timestamp: new Date().toISOString(),
            summary: {
                total_records: params.healthSummary.total_records,
                healthy_records: params.healthSummary.healthy_records,
                health_percentage: params.healthSummary.health_percentage,
                critical_issues: criticalIssues,
                warning_issues: warningIssues,
                info_issues: infoIssues,
            },
            issues: {
                zombie_links: params.zombieLinks.length,
                orphan_records: params.orphanRecords.length,
                schema_violations: params.schemaViolations.length,
            },
            recommendations: params.repairRecommendations,
            details: {
                zombie_links: params.zombieLinks,
                orphan_records: params.orphanRecords,
                schema_violations: params.schemaViolations,
            },
        };

        return { integrityReport };
    }

    async post(shared: TBCViewStorage, _prepRes: ReportGeneratorInput, execRes: ReportGeneratorOutput): Promise<string | undefined> {
        shared.integrityReport = execRes.integrityReport;
        return "default";
    }
}