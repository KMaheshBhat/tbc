import { HAMINode, HAMINodeConfigValidateResult, validateAgainstSchema, ValidationSchema } from "@hami-frameworx/core";
import { Shared } from "../types.js";

/**
 * TBC Sensory Interface
 */
export type TBCLevel = 'info' | 'warn' | 'error';

export const TBC_LEVEL_ICON_MAP = {
    info: 'i',
    warn: '!',
    error: '✗',
} as const;

export interface TBCMessage {
    level: TBCLevel;
    source: string;      // The node or specific check that generated this
    code: string;        // Machine-readable error code for logic branching
    message: string;     // Descriptive message for the LLM
    suggestion?: string; // Actionable hint for self-healing
}

export interface TBCValidationResult {
    success: boolean;
    timestamp: string;
    messages: TBCMessage[];
}

/**
 * Rules and Suggestions
 */
interface ValidationSuggestions {
    onMissing?: string;
    onRecordMissing?: string;
    onUnderpopulated?: string;
    onIntegrityFail?: string;
}

interface ValidationRule {
    min?: number;
    required?: string[];
    optional?: boolean;
    purpose?: string;
    suggestions?: ValidationSuggestions;
}

/**
 * ManifestValidator Implementation
 */
class ManifestValidator {
    private messages: TBCMessage[] = [];

    constructor(private manifest: Record<string, string[]>) { }

    private add(level: TBCLevel, code: string, source: string, message: string, suggestion?: string) {
        this.messages.push({ level, code, source, message, suggestion });
    }

    /**
     * Rules-based check with declarative suggestions.
     */
    check(path: string, rules: ValidationRule) {
        const data = this.manifest[path];
        const purpose = rules.purpose ? ` (Context: ${rules.purpose})` : "";
        const s = rules.suggestions || {};

        // 1. Check Section Existence
        if (!data) {
            if (!rules.optional) {
                this.add(
                    'error',
                    'COLLECTION_MISSING',
                    path,
                    `Mandatory collection [${path}] is missing.${purpose}`,
                    s.onMissing
                );
            }
            return this;
        }

        // 2. Check Required Records
        if (rules.required) {
            rules.required.forEach(file => {
                if (!data.includes(file)) {
                    this.add(
                        'error',
                        'RECORD_MISSING',
                        path,
                        `Essential record "${file}" is missing from [${path}].${purpose}`,
                        s.onRecordMissing
                    );
                } else {
                    this.add('info', 'RECORD_VERIFIED', path, `Verified presence of "${file}".`);
                }
            });
        }

        // 3. Check Population Count
        if (rules.min !== undefined && data.length < rules.min) {
            this.add(
                'warn',
                'UNDERPOPULATED',
                path,
                `Collection [${path}] has only ${data.length} records. Expected at least ${rules.min}.`,
                s.onUnderpopulated
            );
        }

        return this;
    }

    /**
     * Cross-section integrity check with custom suggestions.
     */
    crossReference(id: string, bucket: string, descriptor: string, suggestions?: ValidationSuggestions) {
        const exists = (this.manifest[bucket] || []).includes(id);
        const s = suggestions || {};

        if (exists) {
            this.add('info', 'INTEGRITY_OK', bucket, `Referenced ${descriptor} "${id}" exists.`);
        } else {
            this.add(
                'error',
                'INTEGRITY_FAIL',
                bucket,
                `The ${descriptor} ID "${id}" is referenced in the Root Record but is missing from [${bucket}].`,
                s.onIntegrityFail || "Integrity failure: referenced ID not found in target collection."
            );
        }
        return this;
    }

    finalize(): TBCValidationResult {
        return {
            success: !this.messages.some(m => m.level === 'error'),
            timestamp: new Date().toISOString(),
            messages: this.messages
        };
    }
}

/**
 * HAMI Node Implementation
 */
type Config = {
    verbose: boolean;
}

const ValidateNodeConfigSchema: ValidationSchema = {
    type: "object",
    properties: {
        verbose: { type: 'boolean' },
    },
    required: ['verbose'],
};

type NodeInput = {
    manifest: Record<string, string[]>;
    companionID: string;
    primeID: string;
    memoryMapID: string;
};

type NodeOutput = TBCValidationResult;

export class ValidateSystemNode extends HAMINode<Shared, Config> {
    kind(): string {
        return "tbc-system:validate-system";
    }

    validateConfig(config: Config): HAMINodeConfigValidateResult {
        const result = validateAgainstSchema(config, ValidateNodeConfigSchema)
        return {
            valid: result.isValid,
            errors: result.errors || [],
        };
    }

    async prep(shared: Shared): Promise<NodeInput> {
        return {
            manifest: shared.system.manifest,
            companionID: shared.system.companionID,
            primeID: shared.system.primeID,
            memoryMapID: shared.system.memoryMapID,
        };
    }

    async exec(input: NodeInput): Promise<NodeOutput> {
        const validator = new ManifestValidator(input.manifest);

        return validator
            .check('sys', {
                purpose: "The core anchor records for a Third Brain Companion System",
                min: 3,
                required: ['root.md', 'companion.id', 'prime.id'],
                suggestions: {
                    onMissing: "ACTION: Run 'tbc sys init'. REASON: System root is uninitialized.",
                    onRecordMissing: "ACTION: Verify vault integrity. REASON: A core identity record has been deleted."
                }
            })
            .check('skills', {
                purpose: "Agent capabilities and toolsets",
                min: 1,
                suggestions: {
                    onUnderpopulated: "ACTION: Sync skills from TBC Project assets. REASON: Local skill-guides are out of sync."
                }
            })
            .crossReference(input.companionID, 'mem', 'Companion Identity', {
                onIntegrityFail: "ACTION: Re-initialize Companion Record. REASON: The ID in companion.id does not exist in the /mem/ collection."
            })
            .crossReference(input.primeID, 'mem', 'Prime User Identity', {
                onIntegrityFail: "ACTION: Search Git for missing Prime User record. REASON: Critical identity record lost from /mem/."
            })
            .crossReference(input.memoryMapID, 'mem', 'Root Memory Map', {
                onIntegrityFail: "ACTION: Re-index Root Record memory_map. REASON: The root memory pointer is orphaned."
            })
            .finalize();
    }

    async post(shared: Shared, _input: NodeInput, output: NodeOutput): Promise<string | undefined> {
        shared.stage.validationResult = output;
        return "default";
    }
}